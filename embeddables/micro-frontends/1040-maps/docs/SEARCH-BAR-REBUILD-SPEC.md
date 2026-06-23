# Research-Map Search Bar — Rebuild/Simplify Spec

> Card c0d579364c75234b · Project doxa-maps · Driver feedback 2026-06-22
> Base dir: `embeddables/micro-frontends/1040-maps`
> All paths below are relative to that base dir unless absolute.
> Produced by bt-doxa-maps via code investigation (Workflow wf_5bb5cb40-bab). The
> 5 QA questions are PRE-ANSWERED from code evidence; genuine product decisions
> are isolated in §4 for the coordinator's Driver QA pass.

## 1. Context & current behavior

The research-map "search" is a **single Mapbox geocoder pill** that secretly searches **10 DOXA entity categories** (people groups, affinity blocs, clusters, PGs, countries, regions, language families, languages, dialects, religions) **plus Mapbox's remote places** — all in one box. One keystroke can return up to ~20 rows spanning ~11 differently-tagged kinds, each firing a different side-effect cascade (popup vs flyTo vs fitBounds vs legend-tab swap vs pin-dim vs country-outline).

- `useDoxaSearch.searchGrouped` builds 10 category buckets (`src/composables/useDoxaSearch.js:481-541`); `search()` flattens them in an order that **reorders by active tab** (`ORDER_BY_CONTEXT`, `useDoxaSearch.js:37-50`, applied `563-564`). Same query → different list per tab.
- When a legend filter is active the list **silently splits** into "Within [selection]" vs "All DOXA Data" sections with injected non-clickable header rows (`useDoxaSearch.js:566-604`). The list changes shape mid-session.
- Each picked row branches in `GeocoderComponent`'s result handler (`src/components/map-controls/GeocoderComponent.vue:300-381`): people-group → popup+dim; everything else → `aggregate-result`. The handler also eagerly **nulls legend filters on every pick** (`GeocoderComponent.vue:314-333`) to dodge the filter∩result=0-pins blank-map bug.
- `onGeocoderAggregateResult` (`research-map.vue:1526-1710`) runs nine kind-specific paths: family/language/dialect → legend-tab swap + clear input; bloc/cluster/pg → **force-switch to People Groups tab** (`research-map.vue:1677-1682`); country → geoBoundaries outline + fitBounds, deliberately stays on tab (post-d7e741b); religion → leaves query text in the box as the only filter indicator.
- **Nothing persists to the URL.** A pick writes only `mapStore`/`uiStore`; reload or the ShareButton link (static `origin + /research/doxa-research-map.html`, `ShareButton.vue:388-395`) drops all search/selection/zoom.
- **Dead state:** `mapStore.searchQuery` (`mapStore.js:117`) and `uiStore.searchMode` (`uiStore.js:95-98`) are written, read by nothing.
- **Parity break:** the my-upg-100-list clone never passes `:active-context` (`research-map-clone.vue:1959-1970`) and its placeholder computed omits regions/religion (`research-map-clone.vue:404-412`), so its dropdown ordering and placeholders diverge from the live map. The two profiles are ~80% duplicates and have drifted.

This overloading + zero persistence + clone-out-of-parity is what the Driver reports as "confusing/complex."

## 2. The three bugs — root cause + fix direction

### Bug 1 — X (clear) button only partially resets state

**Root cause.** The geocoder X emits but resets nothing: `GeocoderComponent.vue:382` — `geocoder.value.on('clear', () => emit('clear'))`. The parent `onGeocoderClear` is the real reset path, and the two profiles' clear handlers have drifted out of parity.

- **LIVE** (`research-map.vue:1712-1740`): already calls `countryOutline.clearCountry()`, nulls `selectedRegion`/`selectedResource`, and calls the canonical `clearAllHighlights(m)` (pin filter+opacity, region polygons, flat-tab filters, clustering, family/language/dialect, `pplrInstance.selection`). **But it never calls `uiStore.selectPeopleGroup(null)`.** A people-group search pick applies state via `onGeocoderPeopleGroupResult` → `uiStore.selectPeopleGroup({...})` (`research-map.vue:1501`), which sets `selectedPeopleGroup`, flips legend to `'detail'` and `legendMode`, and paints the orange selection-pin (uiStore action `uiStore.js:537-550`). After a PG pick → X: the detail panel (gated on `uiStore.selectedPeopleGroup`, template `research-map.vue:2042`), the `'detail'` legend mode, and the orange pin **all persist**. This is the LIVE bug.
- **CLONE** (`research-map-clone.vue:1572-1583`): a much weaker reset — only `setFilter(layer,null)`, `clustering.setSelectionFilter(null)`, and `selectFamily/selectLanguage/selectDialect(null)`. It **never** calls `clearAllHighlights`, `countryOutline.clearCountry()`, nulls `selectedRegion`/`selectedResource`, resets pin-opacity case-expressions, or nulls uiStore prayer/engagement/adoption/religion filters. So country outline, pin dim/opacity, region polygons, and those legend filters are all orphaned.
- **CLONE PG state is phantom.** The clone's PG handler calls `mapStore.selectFeature(feature)` (`research-map-clone.vue:1424`) — **an action that does not exist on the shared `mapStore`**. Its detail panel is gated on `mapStore.selectedFeature` (template `research-map-clone.vue:2050`), which is therefore never set and never clearable.

**Fix direction.** (a) LIVE: add `uiStore.selectPeopleGroup(null)` to `onGeocoderClear`. (b) CLONE: bring `onGeocoderClear` to full parity with LIVE. (c) CLONE: switch the PG handler off the non-existent `mapStore.selectFeature` onto the same `uiStore.selectPeopleGroup` path LIVE uses. (d) Structural: extract result-apply and clear-reset into one shared helper so the two profiles cannot drift again — the drift IS the bug.

### Bug 2 — Legend selection + search conflict (map goes blank)

**Root cause.** A legend filter intersected with a search-result filter can yield zero matching pins → blank map. The current mitigation is to **eagerly null legend filters on every pick** (`GeocoderComponent.vue:314-333`) plus the "Within selection / All DOXA Data" split that restructures the result list when a filter is active (`useDoxaSearch.js:566-604`). Both are band-aids over an interaction model where two filter sources fight for the same pin layer.

**Fix direction.** Make the relationship explicit and one-directional. A search pick replaces the active map filter and shows one dismissable "active filter" chip; clearing the chip (or X) restores the prior legend filter via the single canonical clear path. Stop silently restructuring the list based on hidden legend state (section 5).

### Bug 3 — General UX complexity

**Root cause.** One input overloaded with ~11 result kinds and ~5 distinct outcome behaviors; the dropdown reorders per tab and changes shape when a filter is active; identical-looking rows do different things; the input sometimes clears, sometimes persists; tons of guard machinery (`_geoBeingCleared` loop-guard `research-map.vue:65-83`, clear-on-tab-switch `1122-1132`, clearAllHighlights-on-X `1712-1740`) exists purely to keep the multi-path system from deadlocking.

**Fix direction.** Narrow the interaction model (section 5): a small fixed set of labeled, stable-order groups; one consistent post-pick contract (camera move + single filter chip + never auto-swap the tab); kill the list-reshaping; add URL persistence; delete dead state.

## 3. Pre-answers to the 5 QA questions (code-evidenced)

**Q1 — What specific actions cause confusion?**
Code-definitive: (a) Same query returns a different ordered list per active tab — `ORDER_BY_CONTEXT` reorder (`useDoxaSearch.js:37-50`, `563-564`). (b) The result list silently splits into "Within selection"/"All DOXA Data" when a legend filter is active (`useDoxaSearch.js:566-604`). (c) Identical-looking rows trigger different behaviors — popup+dim for people-group vs `aggregate-result` for nine other kinds (`GeocoderComponent.vue:300-381`), then nine kind-specific paths in `onGeocoderAggregateResult` (`research-map.vue:1526-1710`). (d) Picking bloc/cluster/pg force-switches the legend tab out from under the user (`research-map.vue:1677-1682`). (e) Whether the input clears or persists depends on the kind (family/language/dialect clear via `_clearGeocoderProgrammatic`; country/region/religion persist as the indicator, `research-map.vue` ~`1568-1570`). All five are concrete confusion sources the code produces.

**Q2 — What should the ideal search flow feel like?**
Partly code-constrained: the data already groups into a handful of conceptual buckets (`searchGrouped` 10 categories, `useDoxaSearch.js:481-541`) that collapse cleanly into Places / People Groups / Languages / Religions. The code tells us the target is achievable; the exact feel ("type → stable labeled groups → pick → camera moves + one chip + URL updates") is a **product decision** (section 4).

**Q3 — Should search clear legend automatically or prompt?**
Code-definitive: today it **auto-clears legend filters on every pick** (`GeocoderComponent.vue:314-333`) specifically to avoid the filter∩result=0-pins blank map (Bug 2). So the current answer is "auto-clear, silently." Whether the *desired* behavior is silent auto-clear, an explicit chip the user dismisses, or a prompt is a **genuine product decision** (section 4).

**Q4 — What happens to the URL/state when search is used?**
Code-definitive: **nothing.** Neither profile reads or writes URLSearchParams/history/router for search state (confirmed across both `onGeocoderClear`/result handlers). A pick mutates only `mapStore`/`uiStore`; reload drops everything; ShareButton emits a static URL (`ShareButton.vue:388-395`). `mapStore.searchQuery` (`mapStore.js:117`) and `uiStore.searchMode` (`uiStore.js:95-98`) are written but read by nothing. Adding URL round-tripping is new work, not a behavior change to preserve.

**Q5 — What do users try to do that fails?**
Code-definitive failures: (a) Clear a people-group search via X — LIVE leaves the detail panel + orange pin + `'detail'` legend mode stranded (no `uiStore.selectPeopleGroup(null)` in `onGeocoderClear`, `research-map.vue:1712-1740`). (b) On the clone, **open a people-group detail at all** — `mapStore.selectFeature` doesn't exist (`research-map-clone.vue:1424`), so the handler throws/no-ops and the panel never opens. (c) On the clone, clear a country/region/religion search — orphans the country outline, region polygons, pin dim, and legend filters (`research-map-clone.vue:1572-1583`). (d) Share or reload a found view — all state is lost (Q4). What "users *try* to do" at the product level (e.g., compare two PGs, save a search) is a **product decision**.

## 4. DRIVER DECISIONS STILL NEEDED

Only true judgment calls remain — these are the items the coordinator's Driver QA pass must resolve before this becomes a buildable card:

1. **Q3 — Auto-clear vs. chip vs. prompt.** When a search pick conflicts with an active legend filter, should we silently auto-clear the legend (today's behavior), show a dismissable "active filter" chip the user removes, or prompt before clearing? Spec recommends the **chip** (no modal, reversible), but this is the Driver's call.
2. **Bucket count & labels (Q2).** Confirm collapsing the 10 micro-kinds into **4 labeled groups: Places · People Groups · Languages · Religions**. Is that the right grouping, or should affinity bloc/cluster/PG stay visible as their own group?
3. **Input-persists-vs-clears policy.** Should the input box always clear after a pick (and the chip becomes the sole indicator), or always retain the query text? Spec recommends **always clear + chip**.
4. **Share/reload scope (Q4).** What must a shared link reproduce — tab + selection only, or also zoom/center? Spec recommends **tab + selection + camera**.
5. **Whether to fully extract the geocoder wiring into a shared composable now** (larger refactor, kills drift permanently) vs. patch both files in parallel this round. Spec recommends extract, but it is a scope/time call.

## 5. Proposed simplified search design (target flow)

**One box, predictable outcome.**

1. **Stable grouping.** Dropdown shows at most 4 labeled, fixed-order groups — **Places · People Groups · Languages · Religions** — that do **not** reorder per active tab. Drop `ORDER_BY_CONTEXT` (`useDoxaSearch.js:37-50`) or make ordering visible and constant. Collapse bloc/cluster/PG/PGIC/family/language/dialect micro-tiers into those four buckets.
2. **No silent reshaping.** Remove the "Within selection / All DOXA Data" split toggle (`useDoxaSearch.js:566-604`) — either always show one flat grouped list or always show the same structure. Never toggle on hidden legend state.
3. **One post-pick contract** for *every* kind:
   - (a) camera flies/fits to the result,
   - (b) a single dismissable **active-filter chip** appears (picked label + X),
   - (c) the legend tab **never** auto-swaps — extend the country "stay on tab" rule (post-d7e741b) to bloc/cluster/pg, removing the force-switch at `research-map.vue:1677-1682`,
   - (d) the input box clears; the chip is the sole indicator (replaces the split-brain "sometimes query text, sometimes legend row").
4. **One canonical clear.** Chip-X and geocoder-X both route to a single `clearSearchSelection()` that mirrors everything any result handler set — including `uiStore.selectPeopleGroup(null)`, `countryOutline.clearCountry()`, `selectedRegion`/`selectedResource` null, and `clearAllHighlights(m)` — and then restores the prior legend filter (resolves Bug 2 cleanly).
5. **URL persistence.** On pick, write `?tab=<id>&sel=<kind>:<value>&z=<zoom>&c=<lng,lat>`; read it on mount to reproduce the view; have ShareButton (`ShareButton.vue:388-395`) include it.
6. **Delete dead state:** `mapStore.searchQuery` (`mapStore.js:117`), `uiStore.searchMode` (`uiStore.js:95-98`).

Ideal flow: *type → see ≤4 labeled groups in a stable order → pick → camera moves + one filter chip appears + URL updates → click chip-X to clear everything → tab never changes under you.*

## 6. Implementation plan (ordered, naming files)

> RULE: **every research-map change lands in BOTH** `app-profiles/doxa-research-map/profiles/research-map.vue` AND `app-profiles/my-upg-100-list/profiles/research-map-clone.vue` (they are ~80% duplicates). Where a shared composable can absorb the logic, prefer that to halt future drift.

**Phase 0 — Stop the bleeding (bug fixes, smallest diff).**
1. **LIVE** `research-map.vue` `onGeocoderClear` (1712-1740): add `uiStore.selectPeopleGroup?.(null)` (verify it resets `legendMode` out of `'detail'`).
2. **CLONE** `research-map-clone.vue` PG handler `onGeocoderPeopleGroupResult` (1420-1425): replace `mapStore.selectFeature(feature)` with the LIVE `uiStore.selectPeopleGroup({...})` path (resolve `uid` the same way, `research-map.vue:1492-1504`), and apply the same pin-dim case-expression block (`research-map.vue:1511-1523`). Re-gate the detail-panel template (`research-map-clone.vue:2050`) from `mapStore.selectedFeature` to `uiStore.selectedPeopleGroup` to match LIVE (`research-map.vue:2042`).
3. **CLONE** `research-map-clone.vue` `onGeocoderClear` (1572-1583): bring to full parity with LIVE — `countryOutline.clearCountry()`, null `selectedRegion`/`selectedResource`, `clearAllHighlights(m)` (guarded on `getLayer('language-family-pins')`), `uiStore.selectPeopleGroup(null)`, keep the `_geoBeingCleared` guard.
4. Verify `useCountryOutline.clearCountry` (`src/composables/useCountryOutline.js:93`) and `clearAllHighlights` exist/are imported in the clone; import if missing.

**Phase 1 — Extract the shared clear (kill drift on the bug path).**
5. Add `clearSearchSelection(ctx)` to a shared composable (e.g. `src/composables/useGeocoderWiring.js`, new) that performs the full canonical reset. Have BOTH profiles' `onGeocoderClear` call it. This makes Phase 0's parity permanent.

**Phase 2 — Predictable outcome (Bug 2 + Bug 3 core).**
6. In `onGeocoderAggregateResult` (`research-map.vue:1526-1710` + clone `1427+`): remove the bloc/cluster/pg force-switch (`1677-1682`) so no pick swaps the tab. Apply identically to clone.
7. Introduce the **active-filter chip** component (`src/components/map-controls/SearchFilterChip.vue`, new). Both profiles render it; its X calls `clearSearchSelection`. Replace the "leave query text in the box" indicators (country/region/religion) with the chip; clear the input on every pick.
8. Replace the eager per-pick legend null-out (`GeocoderComponent.vue:314-333`) with: pick replaces map filter + shows chip; clear restores prior legend filter inside `clearSearchSelection`.

**Phase 3 — Stable, simpler list.**
9. In `useDoxaSearch.js`: remove/neutralize `ORDER_BY_CONTEXT` reorder (37-50, 563-564); collapse 10 buckets into 4 labeled groups (481-541); remove the "Within selection / All DOXA Data" split (566-604). Single composable — affects both profiles automatically.
10. Bring clone geocoder props to parity: pass `:active-context` (`research-map-clone.vue:1959-1970`) and complete `geocoderPlaceholder` cases for regions/religion (`research-map-clone.vue:404-412`).

**Phase 4 — Persistence.**
11. Add URL round-tripping (read on mount, write on pick/clear) in the shared composable; both profiles consume it.
12. Update `ShareButton.vue` (388-395) to append `?tab&sel&z&c`.

**Phase 5 — Cleanup.**
13. Delete dead `mapStore.searchQuery` (`mapStore.js:117`, writes at ~503/511) and `uiStore.searchMode` (`uiStore.js:95-98`, 565-576, 921-931).

## 7. Acceptance criteria (CT-verifiable)

- **AC1 (LIVE PG clear):** Search a people group → pick → click geocoder X. Detail panel closes, orange selection-pin disappears, legend leaves `'detail'` mode, all other pins return to full opacity. (`uiStore.selectedPeopleGroup === null`.)
- **AC2 (CLONE PG open):** On my-upg-100-list, search a people group → pick → detail panel opens (no console error about `mapStore.selectFeature`).
- **AC3 (CLONE PG clear):** Same flow + X → full reset identical to AC1.
- **AC4 (CLONE country/region/religion clear):** Pick a country (or region/religion) on the clone → X. Country outline removed, region polygons restored to default opacity/color, pin dim cleared, prayer/engagement/adoption/religion filters reset — matching LIVE behavior.
- **AC5 (no tab swap):** Picking a bloc, cluster, or PG result does NOT change the active legend tab (LIVE and clone).
- **AC6 (one chip):** Every successful pick (any kind) shows exactly one active-filter chip with the picked label; the input box is empty afterward.
- **AC7 (chip-X == geocoder-X):** Clicking the chip X produces the same full reset as the geocoder X.
- **AC8 (no blank map):** Picking a result while a legend filter is active never produces a zero-pin blank map; clearing restores the prior legend filter.
- **AC9 (stable list):** The same query produces the same ordered, labeled group list regardless of active tab; the list does not insert/remove "Within selection / All DOXA Data" headers based on legend state.
- **AC10 (URL round-trip):** After a pick, the URL contains `tab`/`sel`/`z`/`c`; reloading reproduces the tab, selection, and camera; the ShareButton link reproduces the same view.
- **AC11 (parity):** Clone passes `:active-context` and has complete placeholders; LIVE and clone produce identical dropdown ordering and placeholder text for the same query.
- **AC12 (dead code gone):** `mapStore.searchQuery` and `uiStore.searchMode` no longer exist; grep returns no references.
- **AC13 (both files):** Every behavioral change above is present in both `research-map.vue` and `research-map-clone.vue` (or in a shared composable both import).

## 7b. Driver requirement (2026-06-22) — country search must REUSE the Regions-tab country display

**Driver, direct:** *"when I search for a country, reuse the way Regions shows countries."*

Today there are **two independent country-display systems**:

| | Regions-tab country select | Country **search** result (current) |
|---|---|---|
| Visual | filled polygon highlight | thin line outline only (no fill) |
| Layers | `regions-fill` + `regions-border` | a separate ADM0 line layer |
| Source | the regions polygon source (prop `iso_3166_1_alpha_3`) | `COUNTRY_BOUNDARIES_URL` geoBoundaries vector (`useCountryOutline`) |
| Pin scope | `setFilter('language-family-pins', ['==',['get','countryIso'], iso3])` | fitBounds to aggregate bbox |
| Code | `research-map.vue:934-951` | `useCountryOutline.showCountry()` (`useCountryOutline.js:109-147`) |

**Requirement:** a country search pick must render **identically to selecting that country in the Regions tab** — i.e. drive the same `regions-fill`/`regions-border` highlight (fill-opacity 0.30 on the match, 0.02 elsewhere; `#111827` border at width 2.5) and the same `countryIso` pin filter — instead of the bespoke `useCountryOutline` outline. One way to show a country.

**⚡ This is also the fix for the ~5s country-search lag (Driver report 2026-06-22).** Both systems load the *exact same* Mapbox tileset — `mapbox://mapbox.country-boundaries-v1`, source-layer `country_boundaries`:
- Regions map adds it as source **`regions`** at map init (`useMapLayers.addRegionsLayer`, called from `research-map.vue:1095-1097`) — so it is **already warm** on every tab (the `regions-fill`/`regions-border` layers are merely hidden off-tab, `1099-1101`).
- Country search adds it **a second time** as a *separate* source **`doxa-country-outline`** (`useCountryOutline.js:127`). Mapbox GL does **not** dedupe sources by URL, so this second source **cold-loads its own tiles on the first country search** → the ~5 second stall. (The composable's header comment claims the highlight would be "INSTANT" by sharing the CDN, but a separate source defeats that.)

**So:** the polygon data itself is fine — it's Mapbox's standard country tileset the regions map already uses without lag. The 5s is *duplicate cold loading*. Reusing the already-warm `regions` source for country search makes the highlight **instant** and **removes** a redundant source rather than adding one. Background-preloading is not even needed — it's already loaded at init.

**Implementation notes (factor into §6 Phase 2):**
1. Extract the Regions-tab country-highlight block (`research-map.vue:934-951`) into a shared helper, e.g. `highlightCountryByIso(m, iso3 /* alpha-3 */, isoCodes)`, callable from both the Regions node-select path and the country-search aggregate handler.
2. In `onGeocoderAggregateResult`'s `case 'country'` (`research-map.vue:1686-1691`): replace the `countryOutline.showCountry()` call with `highlightCountryByIso(...)` + keep `fitBounds`. Resolve alpha-3 via the existing `resolveCountryIso(evt, pgs)` (`useCountryOutline.js:54`).
3. **Cross-tab visibility wrinkle:** `regions-fill`/`regions-border` are toggled visible only on the `doxa-regions` tab (`research-map.vue:1099-1101`, `1154-1156`). Because country search now stays on the current tab (`d7e741b`), the highlight helper must force these two layers `visibility:'visible'` for the duration of a country search selection, and the canonical `clearSearchSelection()` (§5.4) must restore the tab-driven visibility on clear.
4. Once both country paths share the helper, **`useCountryOutline` + the `COUNTRY_BOUNDARIES_URL` source/layer become dead and should be deleted** (removes a whole second polygon system + a network source).
5. **Parity:** apply the same extraction + swap in `research-map-clone.vue` (its Regions handler + country aggregate case), or land the helper in a shared composable both import.

**New acceptance criteria:**
- **AC14 (country search == regions display):** Searching a country and picking it produces the *same* visual highlight as selecting that country in the Regions tab (filled polygon at 0.30, dark border) — not a thin line-only outline — on both LIVE and clone.
- **AC15 (cross-tab highlight):** A country search pick shows the polygon highlight even when the active tab is People Groups / Languages / Religions (not just doxa-regions); clearing restores the normal per-tab layer visibility.
- **AC16 (old system removed):** `useCountryOutline` and the `COUNTRY_BOUNDARIES_URL` source are gone; grep returns no references.

## 8. Risks & out-of-scope

**Risks.**
- **Parity drift is the root pathogen.** Patching two ~80% duplicate files in parallel risks re-introducing exactly the divergence that caused Bug 1. Mitigate by doing Phase 1 (shared `clearSearchSelection`) early; ideally extract the whole geocoder wiring (Driver decision #5).
- **`clearAllHighlights` reach.** It also nulls family/language/dialect and `pplrInstance.selection`; confirm chip-driven clears don't wipe a legend selection the user wants kept (Bug 2 design point — restore prior legend filter, don't drop it).
- **Removing `ORDER_BY_CONTEXT` and the result split** changes the dropdown for all users of `useDoxaSearch`; verify no other caller depends on the per-tab ordering or the split sections before deleting.
- **The guard machinery** (`_geoBeingCleared`, clear-on-tab-switch, `_clearGeocoderProgrammatic`) exists to prevent loop-deadlocks; simplifying handlers can re-open those loops. Keep the guards until the simplified flow is proven, then prune.
- **URL persistence** introduces mount-time state hydration that can race the map-load; gate hydration on map `load`/layer-ready (same guard pattern already used at `research-map.vue:1731`).
- Mapbox Geocoder has **no public placeholder updater** (`GeocoderComponent.vue:388-394` patches the DOM input directly) and clears its own input on X natively — the chip/clear logic must not fight that native behavior.

**Out of scope.**
- Mapbox remote-places search behavior itself (only its placement in the grouped list changes).
- Replacing the Mapbox geocoder widget with a custom input.
- Backend/data changes to `searchGrouped` category sourcing (we regroup the existing buckets, not re-query).
- Any profile other than `doxa-research-map` and `my-upg-100-list` (e.g. countries-map, simple-map) — the geocoder there is separate scope.

---

### Provenance note

The `bugLegend` finder agent's structured output failed validation (5 retries); the
synthesis agent independently investigated and confirmed the Bug 2 (legend∩search)
mechanism, so §2/Bug 2 is covered. All other claims were verified against source by
the synthesis agent (e.g. `mapStore.selectFeature` confirmed absent from the shared
`mapStore`).
