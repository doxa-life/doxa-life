# BRANCH-CHANGELOG — `feedback-bug-fixes` → `master`

> Pre-merge review aid for the senior developer. The branch bundles **7 logical work streams**
> ("inbound branches") plus an origin/master integration. Start with the INBOUND BRANCHES table,
> then the per-area commit clusters, then the open DISCUSSION POINTS. Newest commits first.

**193 non-merge commits** (+5 merges incl. the origin/master integration) · diff vs master: 111 files changed, 18200 insertions(+), 1134 deletions(-) · branch tip `587e7d8`

## INBOUND BRANCHES (what's merging in)

| # | Work stream | Problem | Solution | Commits |
|---|-------------|---------|----------|--------:|
| 1 | **server/ipv4 + data API** | Map data (countries, prayer stats) is fetched server-side from the prayer API (pray.doxa.life). On a dev box with a dead IPv6 route, every $fetch ETIMEDOUTs and 500s /countries and /pray; a build-time prerender of country routes also fails. | Force IPv4 for server-side fetches via a DEV-ONLY Nitro plugin (undici Agent connect.family=4) — a no-op in Bun production. Reverted countries.ts to the original $fetch (the interim node:https rewrite added prod risks). Pointed the map-data endpoint at the local server. | 5 |
| 2 | **search + country highlight** | The geocoder search is overloaded and inconsistent: people-group search didn't dim other pins, country picks auto-swapped tabs, the country highlight used a slow/separate outline system, and WAGF blocks were unsearchable. | Reuse the Regions polygon highlight for country search (retire the bolted-on outline), keep search on the current tab, parameterize results per tab, add wagfBlock to regions search, and fix dimming. (Residual slug-display + underscore bugs documented in Discussion Points.) | 64 |
| 3 | **legend + tabs** | Legend navigation was broken: 'go up to family/language' jumped to the wrong tab, the selected row didn't scroll into view, and tab/row state desynced from the map. | Fix the stair-step go-up navigation (dialect→language→family, region→bloc) with atomic tab+selection changes; scroll the selected legend row to the panel center via scrollTop; sync legend state with the active tab. | 18 |
| 4 | **map behavior (zoom / mobile / clustering)** | Map UX bugs across devices: the world tiled side-by-side at full zoom-out, overlapping pins couldn't be separated, the map rotated/north-drifted on touch, mobile pinch/scroll gating was wrong, and selections over-zoomed. | Aspect-ratio world-minzoom floor (desktop), declustering before a raised zoom-in cap (street level 18), disabled rotation, cooperative-gestures gated on (pointer: coarse), and map-fly fit-zoom probing to prevent mobile snap. | 8 |
| 5 | **localization / i18n** | Multi-locale gaps: country-click didn't open the regions tab in French, missing/!stale translations, a new tab-label namespace was needed across 8 locales, and the language dropdown misbehaved. | Make all locales behave like English on country-click, add the tabs.json i18n namespace (ar/de/en/es/fr/pt/ru), load Latin fonts only for Latin languages, and fix the language selector dropdown. | 9 |
| 6 | **architecture / build / merge** | Pre-merge hygiene: profiles needed flattening out of profiles/, builder scratch and internal design docs were tracked, and 103 commits from origin/master had to be integrated. | Flatten app-profiles (remove stale profiles/ duplicates), integrate origin/master, untrack C3MOS scratch + move internal design docs (AUDIT/COMMIT-LOG/WIKI) into gitignored _qa-cycle, and add this BRANCH-CHANGELOG for review. | 10 |
| 7 | **CMS / site (general)** | General site + CMS work that rode in with the origin/master integration: video embeds, nested page categories, admin/profile, prayer/adopt pages, and homepage stats. | Vimeo (incl. unlisted) + YouTube embeds in the CMS editor, nested child categories, CMS page titles/translation, admin profile move, adoption-form prayer signup, and homepage unengaged-count stats. | 79 |

---

## Commits by area (newest → oldest)

### server/ipv4 + data API  (5)

| SHA | Date | Summary |
|-----|------|---------|
| `b114c2a` | 2026-06-23 | fix(server): revert countries.ts to $fetch; confine IPv4 workaround to dev-only plugin |
| `d2ae07a` | 2026-06-23 | fix: add Nitro startup plugin to force IPv4-first DNS for all routes |
| `44fcded` | 2026-06-23 | fix: use node:https family:4 instead of $fetch for prayer API call |
| `afd44f6` | 2026-06-23 | fix: force IPv4 for Nitro server-side prayer API fetch |
| `b8faaca` | 2026-05-21 | Use local server for map data endpoint. |

### search + country highlight  (64)

| SHA | Date | Summary |
|-----|------|---------|
| `e247b83` | 2026-06-23 | fix: parameterize search results per tab + add wagfBlock to regions search |
| `56978ef` | 2026-06-23 | docs(1040-maps): add country-search dimming diagnosis + startup perf analysis |
| `f3807b5` | 2026-06-22 | fix(1040-maps): country outline — instant vector tiles; mobile gesture fix; zoom + clustering |
| `2c22d9d` | 2026-06-22 | fix(research-map): lift zoom-in cap to street level (18) |
| `136db07` | 2026-06-22 | fix(research-map): country search result no longer auto-swaps to Regions tab |
| `ee6a667` | 2026-06-22 | fix(1040-maps): decluster research pins before zoom cap (COMMIT-LOG #8) |
| `898f1e3` | 2026-05-23 | build(map-fly): rebuild simple-map + research-map bundles for legend-row camera |
| `ae1a0a7` | 2026-05-21 | Set up  home, prayer, adopt and research maps |
| `80a2df5` | 2026-05-19 | feat(research): two-panel dark-theme share-multiplier SVG |
| `8099a41` | 2026-05-19 | feat(research): replace share-multiplier SVG with two-panel light-mode design |
| `78453af` | 2026-05-19 | feat(research): add share-multiplier animated SVG for partner communication |
| `293cf72` | 2026-05-19 | feat(research-map): add Share button with iframe embed snippet for partners |
| `13ac3a5` | 2026-05-19 | fix(research-map): add missing dataSource and instanceId to embed profile-config |
| `685e142` | 2026-05-19 | feat(research-map): add standalone embed page for partner websites |
| `d35bab4` | 2026-05-18 | feat(legend): collapsed pill parity, pin dimming, tab scrollbar fix, legend state preservation |
| `fe4237d` | 2026-05-18 | feat(research-map): add mobile edge scroll padding instead of cooperativeGestures |
| `b08a708` | 2026-05-08 | Replace doxa-{simple,research}-mfe with unified 1040-maps forge |
| `29206bd` | 2026-05-08 | Maps round 7: rephrase + enlarge 'Explore our research maps' link |
| `c52d886` | 2026-05-08 | Maps round 6: angled brush-style pin + 'advanced research map' link on simple-map pages |
| `16a9af4` | 2026-05-06 | Maps round 4: research caret pattern on simple-map mobile + slight padding trim |
| `996d4d0` | 2026-05-06 | Maps round 3: unify greens to #22c55e, simple black pin on research, legend reflow when geocoder hidden |
| `5b631f9` | 2026-05-05 | Maps round 2: prayer green unify, geocoder flag, black pin, default tab |
| `46208c6` | 2026-05-05 | Ship PPLR data maps page at /research/pplr-data-maps |
| `e37e3c4` | 2026-05-03 | Research map iter-21: bump desktop tab-bar left padding to clear rounded corner |
| `cc9fe84` | 2026-05-03 | Research map iter-20: isolate .rm-root stacking so internal z-index doesn't leak |
| `6012029` | 2026-05-03 | Research map iter-19: swap Adoption before Engagement in tab order |
| `147c4c3` | 2026-05-03 | Research map iter-18: wire mobile SemanticTreeLegend @select to onSemanticTreeSelect |
| `eaf04b9` | 2026-05-03 | Research map iter-17: fix duplicate label in collapsed-detail footer |
| `8d93442` | 2026-05-03 | Research map iter-16: collapsed-detail footer for PeopleGroupDetail mode |
| `6b22cb8` | 2026-05-03 | Research map iter-15: snap legend to default 30% on pin select / detail close |
| `2d34e3d` | 2026-05-03 | Research map iter-14: fix legendMode check (was 'data', should be !== 'detail') |
| `d1c2dfa` | 2026-05-03 | Research map iter-13: slim mobile rows + free-drag legend pull-tab |
| `3eedc74` | 2026-05-03 | Research map iter-12: clicking empty map clears stuck row-dim filter |
| `fc76212` | 2026-05-02 | Research map iter-11: add min-height:0 to .stl-rows so SemanticTreeLegend scrolls |
| `0b87099` | 2026-05-02 | Research map iter-10: fix tier-3 fullyOpen white-space-at-bottom on mobile |
| `398e57a` | 2026-05-02 | Research map iter-9: slotted mobile caret + symmetric padding cleanup |
| `fe3bdca` | 2026-05-02 | Research map iter-8: bump --lrg-caret-col on mobile so caret stops overlapping title |
| `d501d09` | 2026-05-02 | Research map iter-7: per-tab legend tier memory + bright-row badge contrast |
| `2a3bbbe` | 2026-05-02 | Research map iter-6: fix CSS specificity collision + descender clip |
| `154846a` | 2026-05-02 | Research map iter-5: mobile caret z-index, padding, title alignment, mixed-case |
| `e679831` | 2026-05-02 | Research map iter-4: collapsed footer layout, search ranking, geocoder hard-clear |
| `62216cb` | 2026-05-02 | Research map mobile iter-3: tab-change reset + stronger caret styling |
| `ba16f2b` | 2026-05-02 | Research map mobile iter-2 + UPGs/Pop center-align (4 items) |
| `55ed724` | 2026-05-02 | Research map mobile iter-1: SemanticTreeLegend embedded-in-sheet overrides |
| `2210707` | 2026-05-02 | Research map: ROOT-CAUSE fix — useMapData.deriveLanguageFamily now does comma-inversion |
| `8e41d22` | 2026-05-02 | Research map: 3 bugs from desktop QA — pin-color, family-filter coverage, detail-card width |
| `c97bb26` | 2026-05-02 | Research map iter-2: align geocoder pill geometry + focus ring to PPLR |
| `7d17cba` | 2026-05-02 | Research map: restore pin-click → people-group detail on language-family tab + align geocoder column |
| `36660ff` | 2026-05-01 | Research map: stop auto-switching tabs on legend row click |
| `c94ed59` | 2026-05-01 | Research map: SemanticTreeLegend now an EXACT clone of PPLR's; mounted standalone |
| `313a77a` | 2026-05-01 | Research map iter-2: PPLR port runtime fixes (4 items) |
| `a3435fb` | 2026-05-01 | Research map: replace LegendFamilyTree with ported PPLR SemanticTreeLegend |
| `3ca1510` | 2026-05-01 | Research map: QA building-round-1 R3 fixes (5 items, cherry-picked from PPLR SemanticTreeLegend) |
| `af20455` | 2026-05-01 | Research map: QA building-round-1 R2 fixes (5 items) |
| `f343586` | 2026-05-01 | Research map: 3 bug fixes from screenshot QA |
| `592d466` | 2026-05-01 | Research map: revert iter-3 tab info popovers |
| `de19094` | 2026-05-01 | Research map iter-3: tab info popovers (ⓘ buttons with definitions) |
| `02a1ce0` | 2026-05-01 | Research map iter-2: search → tab navigation for language-family + dialect kinds |
| `e633b5f` | 2026-05-01 | Research map iter-1: Dialects/Varieties tab, parent-display title, per-map geocoder placeholder |
| `199e126` | 2026-05-01 | Research map: parse dialects from language field; add dialect tab + selection |
| `c6fa6bb` | 2026-04-27 | Add Go Pin Indicator 2 Research Map 2 Make Disciples - fix map slots |
| `7832495` | 2026-04-27 | Add Go Pin Indicator 2 Research Map 2 Make Disciples |
| `4103268` | 2026-04-27 | Launch v1 Doxa Research Maps |
| `bec56dc` | 2026-04-24 | implement /research/search/[term] |

### legend + tabs  (18)

| SHA | Date | Summary |
|-----|------|---------|
| `67e1f56` | 2026-06-23 | fix: scroll selected legend row to center of panel (not top) |
| `554bf10` | 2026-06-23 | fix: use scrollTop not scrollIntoView for legend scroll-to-selected |
| `decc43e` | 2026-05-25 | fix(maps): mobile bug wave — viewport, fullscreen, legend, filter, animation |
| `622403d` | 2026-05-23 | fix(map-fly): evaluate legend filter against source data, not viewport |
| `94b1133` | 2026-05-23 | feat(map-fly): wire legend rows → camera in both map app-profiles |
| `45b5de2` | 2026-05-23 | feat(map-fly): add uniform zoomToLegendRow camera meta-solution |
| `35a522e` | 2026-05-23 | fix(legend): rebuild doxa-simple-map bundle to ship collapsed-caret fix |
| `594df0c` | 2026-05-20 | fix(share+legend): mobile share popover positioning and collapsed legend caret |
| `1bf4df2` | 2026-05-19 | fix(legend): constrain desktop panel height to map container, not viewport |
| `6a39fdf` | 2026-05-19 | fix(legend): hide SemanticTreeLegend when people-group detail opens |
| `dffa1ae` | 2026-05-19 | fix(legend): cap panel height to viewport instead of stretching to bottom on tablet |
| `e9d8fd7` | 2026-05-18 | feat(1040-maps): prayer ripple animation, unified legend labels, mobile legend parity |
| `367554d` | 2026-05-18 | feat(legend): match flat legend carets + collapsed pill to SemanticTreeLegend |
| `24c03cd` | 2026-05-18 | fix(legend-mobile): add doxa-regions (WAGF Regions) to mobile SemanticTreeLegend |
| `967de06` | 2026-05-09 | feat: rename legend title from Affinity Blocks to People Groups |
| `cfaf7db` | 2026-05-08 | Maps round 5: unify needs-red, rename Languages tab, dynamic selection-pin color |
| `bd03c92` | 2026-04-24 | CMS: Ability to set if links open in new tab. |
| `839c637` | 2026-04-23 | "Fixed more info button url mapping, fixed legend gets translated fields from api using language code from parent site passed as prop,  fixed legend numbers for engagement mapped to propper field" |

### map behavior (zoom / mobile / clustering)  (8)

| SHA | Date | Summary |
|-----|------|---------|
| `6ab0da8` | 2026-06-22 | fix(maps/mobile): gate cooperativeGestures on (pointer: coarse), not innerWidth>=1024 |
| `f4747bb` | 2026-06-22 | harden(1040-maps): align dead CLUSTERING_ZOOM config with live decluster policy (COMMIT-LOG #8) |
| `a143ebc` | 2026-06-22 | fix(1040-maps): disable map rotation (north-drift) on all Doxa maps |
| `34285c9` | 2026-05-23 | fix(map-fly): probe fit zoom vs minZoom to prevent mobile snap on wide scopes |
| `50b94b3` | 2026-05-19 | fix(pins): increase touch target to 44px+ on tablet zoom levels 4-8 |
| `160e7f5` | 2026-05-08 | Maps round 8: untilt selected pin + theme-aware thin Joshua-Project-style data-pin outline |
| `4acaebe` | 2026-05-03 | DoxaMapSlot: add contain:paint for reliable canvas clipping |
| `ba9d149` | 2026-05-03 | Simple-map iter-3: flat top edges on collapsed mobile footer |

### localization / i18n  (9)

| SHA | Date | Summary |
|-----|------|---------|
| `992b4bb` | 2026-05-21 | add missing string translation. |
| `547c77b` | 2026-05-21 | Only load Latin font for Latin languages |
| `241ccfa` | 2026-04-27 | CMS page translation |
| `e4e869d` | 2026-04-27 | Click Language Selecture to keep it open |
| `5146e8d` | 2026-04-24 | Fix languages dropdown and implement group resources page |
| `20ab948` | 2026-04-23 | CMS disbale translation button |
| `d90044f` | 2026-04-23 | Shared enabled languages |
| `e40e0d2` | 2026-04-22 | update translations |
| `fe33584` | 2026-04-22 | translation of titles |

### architecture / build / merge  (10)

| SHA | Date | Summary |
|-----|------|---------|
| `587e7d8` | 2026-06-23 | chore: move internal design docs to gitignored _qa-cycle folder |
| `42fb1b2` | 2026-06-23 | docs: add BRANCH-CHANGELOG.md for senior-dev pre-merge review |
| `ee6d00d` | 2026-06-23 | chore(1040-maps): remove stale pre-rename profiles/ duplicates |
| `f7718aa` | 2026-06-23 | chore(pre-merge): stage 1040-maps builder work + move COMMIT-LOG |
| `c2de712` | 2026-06-22 | chore: untrack C3MOS builder scratch files + gitignore them |
| `6868f1c` | 2026-06-22 | docs(1040-maps): explain build-not-dev workflow for embedding in a parent Nuxt host |
| `f9699d9` | 2026-04-30 | move profile page to /admin/profile and link in admin sidebar |
| `197b9df` | 2026-04-30 | oauth profile connected apps and admin magage page. |
| `a668e1f` | 2026-04-27 | switch feedback widget to remote bundle, hide by default |
| `cf4ea19` | 2026-04-23 | MERGE MAP REPOS AS PUBLIC PLUGINS |

### CMS / site (general)  (79)

| SHA | Date | Summary |
|-----|------|---------|
| `8936312` | 2026-05-22 | stats use total_unengaged for homepage count, keep total on pray/adopt |
| `18e1a21` | 2026-05-22 | support unlisted vimeo and fix video display. |
| `238e177` | 2026-05-21 | support vimeo video embeds alongside youtube in cms editor |
| `cc6adfe` | 2026-05-21 | Add title field to new CMS page modal with slug auto-fill |
| `81a1ca2` | 2026-05-21 | Category reorder. |
| `32d1df9` | 2026-05-21 | Menu: Adoption Resources -> Resources |
| `89b02d0` | 2026-05-21 | Let categories have child categories for nested pages. (#6) |
| `903b839` | 2026-05-21 | Handle dynamic people groups number (#4) |
| `f703f23` | 2026-05-21 | new CMS pages append to the bottom of their category |
| `9efd73d` | 2026-05-21 | Make CMS rows clickable |
| `5d6a53a` | 2026-05-21 | fix feedback widget display |
| `63942c3` | 2026-05-20 | Cloudflare edge caches each marketing page for 24 h |
| `ae4dbfe` | 2026-05-20 | Purge Cloudflare cache on deploy |
| `3e94191` | 2026-05-20 | optimize caching |
| `2a08f02` | 2026-05-20 | WOFF2 conversion |
| `13c28d7` | 2026-05-20 | Optimize images and defer feedback widget |
| `466d75d` | 2026-05-20 | switch to bun run |
| `f1c683f` | 2026-05-20 | update bun lock |
| `117110a` | 2026-05-20 | add start script |
| `3176d0f` | 2026-05-20 | build tweaks. |
| `12ea82f` | 2026-05-20 | feat(share): portal z-index fix, touch targets, and topojson deps |
| `4408b19` | 2026-05-19 | feat(share): redesign ShareButton for non-technical users |
| `61cf0e1` | 2026-05-19 | fix(region-popup): wire WAGF Region, WAGF Block, and UUPG count into country-click detail |
| `cd48c1a` | 2026-05-18 | fix(DoxaMapSlot): only render top scroll pad for simple maps |
| `2be3ece` | 2026-05-18 | feat(1040-maps): modern map styling — Apple Maps / Felt quality polish |
| `cd45481` | 2026-05-08 | Maps round 10: feature-flag the active-overlay emphasis off on simple-map |
| `f415199` | 2026-05-08 | Maps round 9: Joshua-Project outline now also flows through ACTIVE_LAYER overlay |
| `b986399` | 2026-05-07 | CMS: Put Documents component in a tiptap node |
| `e2ebca5` | 2026-05-07 | Show the feedback widget if the user is logged in. |
| `562bfb8` | 2026-05-07 | Don't throw errors when saving CMS pages. |
| `7e5c739` | 2026-05-06 | Implement CMS version history. |
| `f098b76` | 2026-05-06 | Add page title to CMS pages and update CMS heading styles |
| `d37c3d6` | 2026-05-05 | Add /api/maps/token endpoint, swap PPLR page back to static HTML |
| `4754c7c` | 2026-05-05 | Catch prayer map errors. |
| `adadf6f` | 2026-05-04 | Fix Oauth redirect when not logged in |
| `79e286f` | 2026-05-04 | Change cookie same site method to allow oauth |
| `adc0a66` | 2026-05-04 | Remove old string |
| `04ad4c9` | 2026-05-04 | Add invitation to sign up to pray on the adoption form. |
| `65a7e92` | 2026-05-04 | Better error messages when updating the CMS |
| `d332a7a` | 2026-05-04 | Don't log every 404 error. |
| `490c5b1` | 2026-05-03 | DoxaMapSlot: inherit border-radius onto the custom element host |
| `84d74a0` | 2026-05-03 | Simple-map iter-2: slim rows + darken badge bg for neon green readability |
| `3919455` | 2026-05-03 | Simple-map iter-1: unify engagement+adoption green to neon, move prayer-page map |
| `8d74269` | 2026-05-01 | Implement content editor role and fix role names |
| `bd2b746` | 2026-04-30 | fix build |
| `1b2f491` | 2026-04-30 | fix build |
| `feeb987` | 2026-04-30 | Setup Analytics |
| `f0d7158` | 2026-04-29 | layers in .layers |
| `082f3d2` | 2026-04-29 | mcp security |
| `f95f8fa` | 2026-04-29 |  Hide: WARN  Duplicated imports "useAppConfig", |
| `9b521b8` | 2026-04-29 | Implement CMS MCP |
| `0ebe124` | 2026-04-28 | Add settings table and setting to disable registration |
| `3de5c40` | 2026-04-28 | add mcp layer to extend |
| `d38b2c4` | 2026-04-28 | User invitation (#3) |
| `6035251` | 2026-04-27 | On documents page don't make menu header clickable. |
| `e0003fc` | 2026-04-27 | And missing people groups field. |
| `eefa6d6` | 2026-04-27 | Make CMS pages permissions more granular. |
| `43c4631` | 2026-04-27 | Upgrade migration system to support layers |
| `2fef05a` | 2026-04-26 | Doxa-life is now a monorepo -> embeddables built inline -> Doxa-life /public/js serves as static CDN for serving map widgets to partner DOXA sites. UNLOCKS people of the day widget. |
| `2533859` | 2026-04-24 | fix ts issues |
| `02d00bf` | 2026-04-24 | Change phone input to npm |
| `298e61a` | 2026-04-23 | Better CMS page transition |
| `5a43875` | 2026-04-23 | change caching from fs to memory. |
| `f62a346` | 2026-04-23 | Cache fixes |
| `22c2a7c` | 2026-04-23 | fix uupg list |
| `780e85b` | 2026-04-23 | Implement page categories |
| `ce8888b` | 2026-04-23 | refactor resources page |
| `ed64d19` | 2026-04-23 | Better CMS page routing and Caching. |
| `281e0de` | 2026-04-23 | Add verse node. |
| `792eed4` | 2026-04-23 | CMS page layout and saving changes |
| `5b82409` | 2026-04-23 | add theme and custom css to CMS metadata |
| `fb4a812` | 2026-04-23 | Ability to align CMS images |
| `2cc4d20` | 2026-04-23 | Ability to add the UUPG list tip tap component. |
| `a2ed71e` | 2026-04-23 | Central tiptap block definitions |
| `329d87a` | 2026-04-23 | switch to public s3 for images in CMS |
| `ee8637e` | 2026-04-22 | fix SSR admin pages. |
| `eaabc30` | 2026-04-22 | remove missing file. |
| `b5bdb5a` | 2026-04-22 | Add global feedback-widget bubble to parent site (#1) |
| `7456102` | 2026-04-22 | maps on pray adopt and home pages |

---

## DISCUSSION POINTS — known API/data bugs (documented, not fixed)

Display/data-shape issues in the WAGF block/region map-search path — decide before or shortly after merge.

## Known issue — WAGF block search ("block K")
WAGF *blocks* (the block tier, e.g. "South Asia") were unsearchable from the Regions tab. There is
no value literally named `K` — "block K" is shorthand for the WAGF **block** key/tier not working.

Root cause: blocks were folded into the `regions` aggregate via a `||` chain —
`norm(doxaRegion) || norm(wagfRegion) || norm(wagfBlock)` (`src/composables/useDoxaSearch.js`, HEAD
`regions` aggregate). Because every block pin also carries a `doxaRegion` (a `south_asia` block pin
has `doxaRegion: 'asia'`), the `||` short-circuits to the region and the block value is never
reached → blocks never appeared in search.

Partial fix in flight: a dedicated `wagfBlocks` aggregate was split out (`useDoxaSearch.js:337-344`).
**Residual (NOT fixed this pass):** the `wagfBlocks`/`regions` aggregates still key AND label on the
raw underscore slug (`label: e.feature.wagfBlock`), never reading the available
`wagfBlockLabel`/`wagfRegionLabel` (`DataSourceManager.js:338-350`) — so result rows display
`south_asia` instead of "South Asia". The downstream select still works only because
`research-map.vue:1775-1785` `_rnorm()` strips both spaces and underscores.

## Known issue — underscore API fields
1. **Display:** underscore slug *values* (`{value:'south_asia', label:'South Asia'}`) leak to the UI
   wherever the value is rendered instead of the `*Label` (`DataSourceManager.js:338-350`,
   `useDoxaSearch.js:332-344`). Token matching is substring-tolerant (`matchAgg`,
   `useDoxaSearch.js:564-566`), so "south asia" still matches — this is a **display** bug, not a
   no-match bug.
2. **Latent / higher-risk:** the tolerant substring fallback in `getFieldValue`
   (`DataSourceManager.js:373-376`, `key.includes(trimmed) || trimmed.includes(key)`) can
   non-deterministically bind a mapping like `wagf_block` to a sibling column
   (`wagf_block_value` / `wagf_block_label`) depending on key iteration order. The CSV source is more
   exposed (`WAGF BLOCK` / `Affbloc` / `ROP1` collisions, `sources.json:66,153-155`).
3. **Composite-key join** uses `'_'` as the separator (`DataSourceManager.js:299-301`) — latent (no
   array mappings today), but underscore-fragile.

Items (1)–(3) are **documented, not fixed** in this branch.

