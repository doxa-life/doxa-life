# 1040-maps staging — findings + auto-detecting page

Card 4de98dc4 · bt-c3mos · 2026-06-23 overnight · experimental (no build/push/deploy)

> **RESOLVED 2026-06-23 (card bt-1040m):** the promotion recommended at the bottom of this
> doc is **done**. `staging.html` was consolidated **into `index.html`** (the auto-detecting
> page + the old index's Apache provenance block, both merged), and the standalone
> `staging.html` was deleted. There is now exactly **one** auto-detecting staging page:
> `index.html`, served at `/` by `pnpm run dev`, loading `src/staging.js`. The notes below
> are kept as the original findings/audit trail.

## What I found

- **The root `index.html` was the stale, confusing part.** It hardcoded a list of **3**
  bundles (`doxa-simple-map`, `doxa-research-map`, `my-upg-100-list`) — but there are **4**
  app-profiles on disk: it was **missing `doxa-countries-map`**, and didn't reflect that
  `my-upg-100-list` has two `.vue` profiles. Hand-maintained → drifts.
- **`vite.config.js` already auto-detects bundles** server-side via `discoverBundles()`
  (scans `app-profiles/*/` for `index.html` + `index.js`). Dev mode serves every bundle at
  its own `app-profiles/<name>/index.html`. So the build/dev plumbing is already
  auto-detecting — only the human-facing landing page wasn't.
- **The `.vue` profiles are already auto-discovered** inside each bundle "via
  import.meta.glob" (per the vite.config header comment).
- **A more sophisticated staging page exists** at
  `FARFAST10-nameless-exploits/Map-Framework/1040-maps/index.html` (30 KB) — a client-side
  showcase that literally says "auto-detecting bundles…" with live script-tag tabs. It's
  the richer ancestor of what this card asks for; the page here is a lean equivalent.

### App-profiles on disk (the source of truth)
```
app-profiles/
  doxa-countries-map/   index.js  index.html  profiles/countries-map.vue
  doxa-research-map/    index.js  index.html  profiles/research-map.vue
  doxa-simple-map/      index.js  index.html  profiles/doxa-simple-map.vue
  my-upg-100-list/      index.js  index.html  profiles/research-map-clone.vue
                                              profiles/upg-100-list.vue
```

## What I built

To avoid clobbering `index.html` (another builder edited it at 00:13 the same night), the
auto-detecting page ships as **new files** for review, not an in-place overwrite:

- **`staging.html`** — the new landing page (root). Loads Mapbox peer + `src/staging.js`.
- **`src/staging.js`** — discovers everything at dev time with Vite globs:
  - `import.meta.glob('/app-profiles/*/index.js')`        → bundles
  - `import.meta.glob('/app-profiles/*/profiles/*.vue')`  → profiles per bundle
  Renders one card per bundle, each profile expandable to (a) an auto-named script-tag
  snippet and (b) a lazy `<iframe>` of that bundle's own live dev page.

### How it meets the card's 5 requirements
1. **Auto-detect all app-profile folders** — `import.meta.glob('/app-profiles/*/index.js')`.
2. **Auto-detect each `.vue`** — `import.meta.glob('/app-profiles/*/profiles/*.vue')`.
3. **All profiles in one page, no build** — Vite dev serves it; cards render from the globs;
   maps mount lazily in iframes (so all four don't boot Mapbox simultaneously).
4. **HMR, no rebuild** — glob keys are real Vite module ids; `import.meta.hot.accept()`
   re-renders when a `.vue`/folder is added or changed.
5. **Script tags auto-named from folder + vue filename** — `embedSnippet()` derives
   `<script src="…/public/js/<folder>.js">` + `<<folder> profile-config="<vue-file>">`.

## How to run / validate (Driver or CT — not run overnight)
```bash
cd embeddables/micro-frontends/1040-maps
pnpm run dev          # vite dev server (no build needed)
# open http://localhost:<port>/staging.html
```
Expect: 4 bundle cards incl. `doxa-countries-map`; `my-upg-100-list` shows 2 profiles;
editing any `app-profiles/*/profiles/*.vue` hot-updates without a rebuild.

> Not runtime-tested by the builder (overnight: no dev server started — it would contend
> with the live doxa dev server / other builders). Structurally validated against the
> existing vite.config and folder layout; the globs are dev-only and standard Vite.

## Recommendation
Once verified, **promote `staging.html` → `index.html`** (replacing the hardcoded one) and
delete any other stale `index.html` copies, so there is exactly ONE auto-detecting staging
page. Kept separate tonight to avoid a destructive overwrite during the autonomous run.
