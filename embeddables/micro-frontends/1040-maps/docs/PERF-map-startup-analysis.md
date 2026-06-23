# PERF: map startup 5+ seconds — profile + proposed fixes

> **Card:** `5db23e4f`. Driver noted the map takes 5+ s to appear. Goal: profile
> (static analysis — build can't run headlessly, COMMIT-LOG §1) and propose 1–2
> targeted fixes. **No core-architecture changes** — these are deferrable wins.
> This is an ANALYSIS/PROPOSAL deliverable; implementation is a separate card.

## Where the 5 s goes (evidence)

| Phase | ~cost | Evidence |
|---|---|---|
| **API fetch (pins)** | **2–4 s** | `research-map.vue:1976` kicks `mapData.loadData()`; the pins wait on it inside `style.load` (`:1982–1983` `await dataPromise` → `onMapReady`). The fetch (`DataSourceManager.js:264`) uses **`cache:'no-store'`** + a **`_=${Date.now()}` cache-buster** (`:260`) → a **fresh full refetch of ~2k people groups every single load**, defeating HTTP/CDN/SW caching. |
| Mapbox GL load (basemap) | 0.5–1 s | `app-profiles/doxa-research-map/index.html:11` loads `mapbox-gl.js` via a **plain sync `<script src>`** (no `async`/`defer`, **no `preconnect`/`dns-prefetch`** to `api.mapbox.com`). |
| Bundle parse | 0.3–0.6 s | `public/js/doxa-research-map.js` = **1.33 MB** (vs simple-map 0.44 MB). IIFE + `inlineDynamicImports` = one monolithic chunk; many components imported eagerly at the top of `research-map.vue`. |
| Data normalization | 0.3–0.5 s | `useMapData.js` derives `languageFamily` per row over ~2k rows synchronously before pins render. |
| style.load (tiles) | 0.5–1 s | Mapbox `style.load` event (basemap tiles + vector tileset). |

**Already optimized (don't touch):** `LegendMobile`, `PeopleGroupDetail`, `PosterDialog`,
`useMapClustering`, `useMapPoster` are already lazy (`defineAsyncComponent` / dynamic
`import()`); the data fetch already runs in parallel with `initializeMap()`.

## Recommended fixes — the 2 highest-value, lowest-risk

### Fix A — stop refetching uncached every load *(biggest win: −1 to −3 s on repeat loads)*
`DataSourceManager.js:260,264` forces `cache:'no-store'` + `_=${Date.now()}` on the
people-groups fetch. That guarantees a cold network fetch of the full dataset on **every**
map boot (and every tab/bundle that mounts a map). Proposal:
- Drop the per-request `_=${Date.now()}` cache-buster and switch `fetch(url, {cache:'no-store'})`
  → `{cache:'default'}`, and have the API send a short `Cache-Control: max-age` (e.g. 5 min).
- Keep an explicit "refresh" path (URL param / user action) that re-adds the buster when
  truly-fresh prayer data is required.
- **Trade-off to weigh (Driver call):** the `no-store` is intentional (comment at `:241–242`
  "busts intermediate caches") to keep prayer counts live. A 5-min TTL is the usual balance;
  confirm acceptable staleness before changing.

### Fix B — `preconnect` to the Mapbox CDN *(free, −0.1 to −0.2 s, zero risk)*
Add to the `<head>` of each bundle's staging `index.html` **and** (more importantly) document
that the **host page** should include it, since that's where production loads the script:
```html
<link rel="preconnect" href="https://api.mapbox.com" crossorigin>
<link rel="dns-prefetch" href="https://api.mapbox.com">
```
Establishes TCP+TLS to `api.mapbox.com` before the `mapbox-gl.js` `<script>` fires.

### Honorable mentions (defer — smaller wins, slightly more risk)
- **Render basemap before pins:** the basemap already paints at `style.load`; if the *perceived*
  5 s is pins (not basemap), Fix A is the lever. If it's the basemap itself, it's Mapbox load
  (Fix B + host-side script placement).
- **De-dupe `langFamilyByLanguage.json`** (imported in both `useMapData.js` and `useMapLayers.js`)
  via a shared `src/data/index.js` re-export → ~18–21 KB off the bundle.
- **Defer per-row normalization** to a microtask after first pin paint (`useMapData.js`).

## Recommendation
Land **Fix A** (cache policy — pending Driver's staleness call) + **Fix B** (preconnect) first:
together they target the dominant 2–4 s fetch + the Mapbox connect latency with minimal change
and no architecture impact. Everything else is incremental. Implementation should happen in a
build-capable env so `npm run dev`/`build` can confirm the before/after timing.
