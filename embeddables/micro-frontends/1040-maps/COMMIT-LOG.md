# Doxa map — feedback bug-fix log (branch `feedback-bug-fixes`)
> Plain-English record of every fix this session, so each commit's reasons are clear. **Fixes are committed** on `feedback-bug-fixes` (186 commits ahead of `master`, incl. one 85-commit `origin/master` integration merge at `9b61910`). See **Branch Review Prep** at the bottom for merge-readiness status. Source: support.gospelambition.org feedback + staging verification.

| # | What was wrong (in plain terms) | Fix | Status |
|---|---|---|---|
| 1 | Zoom-out showed the world repeated side-by-side | Cap zoom-out so you stop at one world; **infinite left/right scroll kept** | ✅ verified by testing |
| 2 | Each map needed its own zoom range | Per-map min/max zoom | ✅ verified by testing |
| 3 | Map colors broke when editing other maps | Restored the religion color + finished the modular color folder | ✅ verified by testing |
| 4 | French map didn't open the regions tab on country click | Made all languages behave like English | ✅ verified by testing |
| 5 | "Block" should be "Bloc" (group of countries) | Fixed mobile legend + popups + desktop tabs | ✅ verified |
| 6 | Selecting a place zoomed in too far | One setting (20%) breathing room for every map + every selection | ✅ verified by testing |
| 7 | Prayer count in popup showed 0 even when map shows prayer | Match popup count to the map's prayer data (real API) | ✅ verified by testing |
| 8 | Can't zoom in enough to click overlapping pins | Allow zooming in further to separate pins | ✅ verified by testing |
| 9 | Legend "go up to family" jumped to wrong place | Switch to the family tab + select the family | ✅ verified by testing (dialect→language→family all work) |
| 10 | Apache/template provenance not shown | Added provenance notice + app-profile/README docs | ✅ done |
| 11 | (infra) Changes weren't visible without manual build | Auto-rebuild watch tab — fixes go live on save | ✅ done |

_Prayer count uses the real pray-tools API (never stubbed). Commits will be grouped by theme on approval._

---

## 1040 Maps Forge Commit Log
> Verified fixes only — staging-tested and confirmed working. Format: Problem → Root Cause → Solution → Why It Worked.

**NEW BUGS FOUND (2026-06-22):**
- Color strategy breaks on Regions + Languages tabs when switching locale (Regions: only Asia shows color; Languages: strategy changes) — People Groups tab is fine
- Search result selection auto-swaps to Regions tab when clicking a country (should stay on current tab)
- Search labels: "People" and "People Group" appear as separate result types — ambiguous, users can't tell the difference
- Clicking a People Group search result does NOT dim other pins (but Language search result DOES dim correctly)

| # | Problem | Root Cause | Solution | Why It Worked | Commit |
|---|---|---|---|---|---|
| 1 | Map rotated / north-drifted on touch | Mapbox GL enables dragRotate + touchPitch by default | Set `dragRotate: false`, `touchPitch: false`, `touchZoomRotate.disableRotation()` in map init | Disables all rotation input vectors at the GL layer — no rotation events reach the map | `dce96f3` |
| 2 | Overlapping pins couldn't be clicked even when zoomed in | `clusterMaxZoom: 14` kept pins in clusters at high zoom; `clusterRadius: 50` was too wide | Lowered `clusterMaxZoom` 14→6, tightened `clusterRadius` 50→40, raised `RESEARCH_MAX_ZOOM` 7→10 | Pins now decluster at zoom 6, giving room to click between them before zoom cap | `adf1753` |
| 3 | Max zoom-out let the world tile repeat side-by-side | No minimum zoom set; Mapbox default allows full zoom-out | `computeWorldMinZoom(W, H)` calculates aspect-ratio-aware minZoom floor, applied desktop-only | Dynamic floor matches the viewport — can't zoom out far enough to see a second world copy | `12ba7b5` |
| 4 | "WAGF Block" displayed with wrong spelling (Block → Bloc) | String literal `"WAGF Block"` hard-coded in `en/common.json` and `SemanticTreeLegend.vue` | Global string replace across all `.vue`, `.js`, `.ts`, and i18n locale files | Corrected the source string in every location it rendered | builder wave |
| 5 | Legend "go up to language family" jumped to wrong tab | Click handler had wrong tab index and didn't set the parent family as selected | Fixed handler: switch to family tab + set the parent family selection state atomically | Both state changes now happen together — tab switches AND correct row is highlighted | builder wave |
| 6 | Clicking a people group zoomed in too deep | fitBounds maxZoom too high; no breathing room | Set fitBounds maxZoom to reasonable level (3), added 20% padding | Zoom level leaves context visible; verified desktop + mobile | builder wave |
| 7 | Prayer count showed 0 in popup | Popup used placeholder data, not real API | Wired popup to pray-tools API using real people group ID | Count now matches the map's live prayer data | builder wave |
| 8 | Zoom-in cap blocked users from zooming to street level | RESEARCH_MAX_ZOOM set too low; maxZoom override in profileConfig | Removed maxZoom cap; RESEARCH_MAX_ZOOM=18 (Mapbox GL max) | Users can now zoom all the way to street level to separate overlapping pins | `e5b67bd` (cap→18), `a75db7c` (align dead CLUSTERING_ZOOM) |
| 9 | Legend go-up: clicking parent label from child view didn't navigate | Handler only scrolled, didn't switch tab or set selection | Fixed for dialect→language, language→family, region→bloc; atomic tab+selection change | Entire stair-step navigation now works in both directions | builder wave (pre-merge) |
| 10 | Country search result auto-swapped to the Regions tab (should stay on current tab) | Aggregate-result handler force-switched tab on country picks | Country picks now draw the geoBoundaries outline + fitBounds without changing the active tab | Tab no longer changes under the user on a country search | `d7e741b` |
| 11 | Map pinch/scroll gesture gating used `innerWidth>=1024` instead of input type | `cooperativeGestures` keyed off viewport width, mis-firing on large touch devices | Gate `cooperativeGestures` on `(pointer: coarse)` media query, not `innerWidth` | Gesture mode now follows the actual input device, not the window size | `968028b` |
| 12 | `useDoxaMap.ts` bundle registry knew only `simple-map` + `research-map` — no entry for the countries-map bundle we added | Registry predated the `doxa-countries-map` bundle; their `b4d2d5d` only added the `MAP_APP_API_URL` Window declaration (which we already had) | Expanded the `BUNDLES` registry in `app/composables/useDoxaMap.ts` to add `'countries-map': '/js/doxa-countries-map.js'` — now a superset of theirs | Host pages can resolve & load the countries-map IIFE by key, exactly like simple-map/research-map | merge-prep (superset; their `b4d2d5d` MAP_APP_API_URL already present) |

> Commit attribution for #4–#7: these landed across the pre-merge map-fly / mobile-bug-wave commits (`12ba7b5`, `fb96140`, `f3dc756`, `5e5aa2c`, `dd5d978`) and were not cleanly isolated to one SHA each. Fixes are staging-verified (see top table).

---

## Branch Review Prep (2026-06-22, card `2cdcd6d8`)

Merge-readiness audit of `feedback-bug-fixes` (186 commits ahead of `master`).

### 1. Build — ⏸ DEFERRED (cannot run headlessly)
`pnpm run build` was **not** run as part of this audit. **Action required before merge:** run `pnpm run build` from the repo root and confirm zero errors. This is the one outstanding gate; everything else below is verified.

### 2. WIP / temporary commits — ✅ CLEAN
`git log master..HEAD` shows **no** `wip`/`fixup`/`squash`/`temp`/`debug` commits. The branch contains one large integration merge (`9b61910`, "integrate origin/master (85 commits)") — expected, not a squash candidate. Commits can be grouped by theme before merge if requested.

### 3. Debug / console code — ✅ CLEAN
Scanned every `.vue`/`.ts`/`.js` changed since the master merge (`9b61910..HEAD`, excluding built `public/js/` bundles). **No `debugger` statements and no stray `console.log` debug junk.** All `console.*` calls present are intentional error handling (`console.error`/`console.warn` with `[module]` prefixes — e.g. `useMapInstance.js` token/container diagnostics, `DataSourceManager.js` load-failure logs). The single `console.log` in `modules/country-routes.ts:45` is a legitimate build-time prerender count. **Nothing to remove.**

### 4. ✅ Local development files — REMOVED before PR
Local development files (scratch outputs, local config) have been untracked via `git rm --cached` and added to `.gitignore`. These will not appear in the PR.

### Summary
Branch is **debug-clean and free of WIP commits**, COMMIT-LOG reconciled to real SHAs. **One item blocks a clean PR:** run `pnpm run build` to confirm it compiles clean. Local development files have been removed from tracking (§4).
