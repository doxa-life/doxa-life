# feedback-bug-fixes branch — 196 commits addressing real user feedback

_Pre-merge review for the senior developer. 194 non-merge commits (+5 merges incl. the origin/master integration). The branch turns real user-reported map feedback into fixes; what couldn't be fixed in the frontend is held or routed onward._

## 1. Original feedback — the WHY

Real user reports that drove this branch:

| Problem reported | Status |
|------------------|--------|
| Legend doesn't reflect search selection _(2026-05-25)_ | FIXED ✅ |
| French map behaves differently from English _(2026-06-08)_ | FIXED ✅ |
| Search should clear legend selection _(2026-04-27)_ | HELD — can't reproduce |
| Max zoom-out — world repeats on edges _(2026-05-21)_ | FUTURE BRANCH |
| Scroll hijack — map zooms instead of page scroll _(2026-05-27)_ | FUTURE BRANCH |
| Mobile scroll capture _(2026-04-27)_ | FUTURE BRANCH |
| "Block" → "Bloc" spelling _(2026-05-22)_ | API team request — can't fix in frontend |

> **FIXED** = shipped in this branch · **HELD** = could not reproduce · **FUTURE BRANCH** = real but scoped to a later branch · **API team request** = needs a data/API change, not a frontend fix.

## 2. Commits by area — the HOW

Grouped & ordered **foundational → minimal** (not the raw commit list). Counts from `git log doxa-life/master..HEAD --no-merges`.

| Problem area | Solution | Commits |
|--------------|----------|--------:|
| **Server stability — IPv4 fix (countries page 500)** | Map data (countries + prayer stats) is fetched server-side from the prayer API; a dead-IPv6 dev/build box made every fetch ETIMEDOUT → /countries & /pray returned 500. Fixed by forcing IPv4 via a **dev-only** Nitro plugin (undici family:4, no-op in Bun prod) and keeping countries.ts on the original $fetch (the interim node:https rewrite shipped prod risks, reverted). | 5 |
| **Search ↔ legend ↔ map — the 3-way connection (all 7 tabs)** | The core defect cluster: search, the legend, and the map weren't kept in sync. People-group search didn't dim other pins; the legend didn't reflect the search selection; country picks yanked the active tab; 'go up to family/language' jumped to the wrong place; the selected legend row didn't scroll into view; country highlight used a slow separate outline. Fixed search→legend→map sync across all 7 tabs: reuse the Regions polygon highlight for country search, parameterize results per tab, atomic go-up tab+selection, scroll-selected-row-to-center, and consistent dimming. | 87 |
| **Localization — 6 languages (EN, ES, FR, PT, AR, RU)** | Multi-locale gaps: the French (and other non-English) map didn't open the regions tab on country-click; missing/stale strings; a new per-tab label namespace was needed across locales; Latin-only font loading and the language dropdown needed fixing. Fixed so all locales behave like English, added the tabs.json i18n namespace, and corrected font + dropdown behavior. | 9 |
| **Map behavior — zoom, mobile gestures, clustering** | Cross-device map UX: world tiled at full zoom-out, overlapping pins couldn't be separated, the map rotated on touch, mobile gesture gating was wrong, selections over-zoomed. Fixed with an aspect-ratio world-minzoom floor, declustering before a raised street-level zoom cap, disabled rotation, (pointer:coarse) cooperative gestures, and map-fly fit-zoom probing. | 7 |
| **Architecture, build & merge prep** | Pre-merge hygiene: flattened app-profiles (removed stale profiles/ duplicates), integrated 103 commits from origin/master, untracked builder scratch, moved internal design docs into gitignored _qa-cycle, and added this changelog. | 10 |
| **CMS & general site (rode in with origin/master)** | General site/CMS work integrated from origin/master: Vimeo + YouTube embeds in the CMS editor, nested page categories, CMS page titles/translation, admin profile, adoption-form prayer signup, and homepage stats. | 76 |
| | **Total** | **194** |

## 3. Discussion points — known API/data bugs (for the API team)

Documented, **not fixed** in this branch (the "Block→Bloc" item above is part of this). Display/data-shape issues in the WAGF block/region search path:

- **WAGF block search ("block K"):** WAGF *blocks* (e.g. "South Asia") were short-circuited out of the `regions` search aggregate by a `doxaRegion || wagfRegion || wagfBlock` `||` chain (every block pin also has a `doxaRegion`). The in-flight `wagfBlocks` split surfaces them, but result rows still display the raw underscore slug (`south_asia`) instead of the available `wagfBlockLabel` ("South Asia") — `useDoxaSearch.js` + `DataSourceManager.js:338-350`.
- **Underscore API fields:** slug *values* (`south_asia`) leak to the UI instead of the label; the tolerant substring fallback in `getFieldValue` (`DataSourceManager.js:373-376`) can non-deterministically bind `wagf_block` to a sibling column; composite-key joins use `'_'` (`DataSourceManager.js:299-301`). These need an API/data-shape decision (ties to the "Block→Bloc" request).

