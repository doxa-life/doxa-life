# BRANCH-CHANGELOG — `feedback-bug-fixes` → `master`

> Pre-merge review aid for the senior developer. Lists every commit this branch adds on top
> of `master`, newest first, plus open discussion points. Generated from
> `git log doxa-life/master..HEAD --no-merges`.

## Summary

- **191 non-merge commits** ahead of `master` (+ 5 merge commits — incl. the origin/master integration merge).
- Merge-base: `64b8d31c1` · master tip: `64b8d31` · branch tip: `ee6d00d`
- Diff vs master: 113 files changed, 18601 insertions(+), 1134 deletions(-)
- Commit types: **other** 143, **fix** 26, **feat** 15, **chore** 3, **docs** 2, **harden** 1, **build** 1

---

## INCOMING — commits entering `master` (newest → oldest)

| # | SHA | Date | Type | Summary |
|---|-----|------|------|---------|
| 1 | `ee6d00d` | 2026-06-23 21:19 | chore | chore(1040-maps): remove stale pre-rename profiles/ duplicates |
| 2 | `b114c2a` | 2026-06-23 19:52 | fix | fix(server): revert countries.ts to $fetch; confine IPv4 workaround to dev-only plugin |
| 3 | `67e1f56` | 2026-06-23 18:52 | fix | fix: scroll selected legend row to center of panel (not top) |
| 4 | `e247b83` | 2026-06-23 18:52 | fix | fix: parameterize search results per tab + add wagfBlock to regions search |
| 5 | `554bf10` | 2026-06-23 18:41 | fix | fix: use scrollTop not scrollIntoView for legend scroll-to-selected |
| 6 | `56978ef` | 2026-06-23 17:56 | docs | docs(1040-maps): add country-search dimming diagnosis + startup perf analysis |
| 7 | `d2ae07a` | 2026-06-23 17:56 | fix | fix: add Nitro startup plugin to force IPv4-first DNS for all routes |
| 8 | `44fcded` | 2026-06-23 17:54 | fix | fix: use node:https family:4 instead of $fetch for prayer API call |
| 9 | `afd44f6` | 2026-06-23 17:39 | fix | fix: force IPv4 for Nitro server-side prayer API fetch |
| 10 | `f7718aa` | 2026-06-23 16:47 | chore | chore(pre-merge): stage 1040-maps builder work + move COMMIT-LOG |
| 11 | `f3807b5` | 2026-06-22 23:56 | fix | fix(1040-maps): country outline — instant vector tiles; mobile gesture fix; zoom + clustering |
| 12 | `c2de712` | 2026-06-22 23:55 | chore | chore: untrack C3MOS builder scratch files + gitignore them |
| 13 | `2c22d9d` | 2026-06-22 20:39 | fix | fix(research-map): lift zoom-in cap to street level (18) |
| 14 | `136db07` | 2026-06-22 20:38 | fix | fix(research-map): country search result no longer auto-swaps to Regions tab |
| 15 | `6ab0da8` | 2026-06-22 17:03 | fix | fix(maps/mobile): gate cooperativeGestures on (pointer: coarse), not innerWidth>=1024 |
| 16 | `f4747bb` | 2026-06-22 15:40 | harden | harden(1040-maps): align dead CLUSTERING_ZOOM config with live decluster policy (COMMIT-LOG #8) |
| 17 | `6868f1c` | 2026-06-22 15:34 | docs | docs(1040-maps): explain build-not-dev workflow for embedding in a parent Nuxt host |
| 18 | `ee6a667` | 2026-06-22 13:09 | fix | fix(1040-maps): decluster research pins before zoom cap (COMMIT-LOG #8) |
| 19 | `a143ebc` | 2026-06-22 13:03 | fix | fix(1040-maps): disable map rotation (north-drift) on all Doxa maps |
| 20 | `decc43e` | 2026-05-25 18:05 | fix | fix(maps): mobile bug wave — viewport, fullscreen, legend, filter, animation |
| 21 | `34285c9` | 2026-05-23 16:49 | fix | fix(map-fly): probe fit zoom vs minZoom to prevent mobile snap on wide scopes |
| 22 | `622403d` | 2026-05-23 16:33 | fix | fix(map-fly): evaluate legend filter against source data, not viewport |
| 23 | `898f1e3` | 2026-05-23 16:22 | build | build(map-fly): rebuild simple-map + research-map bundles for legend-row camera |
| 24 | `94b1133` | 2026-05-23 16:22 | feat | feat(map-fly): wire legend rows → camera in both map app-profiles |
| 25 | `45b5de2` | 2026-05-23 16:19 | feat | feat(map-fly): add uniform zoomToLegendRow camera meta-solution |
| 26 | `35a522e` | 2026-05-23 13:42 | fix | fix(legend): rebuild doxa-simple-map bundle to ship collapsed-caret fix |
| 27 | `8936312` | 2026-05-22 16:20 | other | stats use total_unengaged for homepage count, keep total on pray/adopt |
| 28 | `18e1a21` | 2026-05-22 10:15 | other | support unlisted vimeo and fix video display. |
| 29 | `238e177` | 2026-05-21 14:31 | other | support vimeo video embeds alongside youtube in cms editor |
| 30 | `cc6adfe` | 2026-05-21 14:17 | other | Add title field to new CMS page modal with slug auto-fill |
| 31 | `81a1ca2` | 2026-05-21 13:28 | other | Category reorder. |
| 32 | `32d1df9` | 2026-05-21 12:59 | other | Menu: Adoption Resources -> Resources |
| 33 | `b8faaca` | 2026-05-21 12:49 | other | Use local server for map data endpoint. |
| 34 | `89b02d0` | 2026-05-21 06:00 | other | Let categories have child categories for nested pages. (#6) |
| 35 | `903b839` | 2026-05-21 05:11 | other | Handle dynamic people groups number (#4) |
| 36 | `f703f23` | 2026-05-21 10:55 | other | new CMS pages append to the bottom of their category |
| 37 | `9efd73d` | 2026-05-21 10:51 | other | Make CMS rows clickable |
| 38 | `5d6a53a` | 2026-05-21 10:49 | other | fix feedback widget display |
| 39 | `992b4bb` | 2026-05-21 10:08 | other | add missing string translation. |
| 40 | `547c77b` | 2026-05-21 10:08 | other | Only load Latin font for Latin languages |
| 41 | `ae1a0a7` | 2026-05-21 03:45 | other | Set up  home, prayer, adopt and research maps |
| 42 | `63942c3` | 2026-05-20 17:19 | other | Cloudflare edge caches each marketing page for 24 h |
| 43 | `ae4dbfe` | 2026-05-20 17:14 | other | Purge Cloudflare cache on deploy |
| 44 | `3e94191` | 2026-05-20 16:39 | other | optimize caching |
| 45 | `2a08f02` | 2026-05-20 16:34 | other | WOFF2 conversion |
| 46 | `13c28d7` | 2026-05-20 16:19 | other | Optimize images and defer feedback widget |
| 47 | `466d75d` | 2026-05-20 14:09 | other | switch to bun run |
| 48 | `f1c683f` | 2026-05-20 13:53 | other | update bun lock |
| 49 | `117110a` | 2026-05-20 13:13 | other | add start script |
| 50 | `3176d0f` | 2026-05-20 13:06 | other | build tweaks. |
| 51 | `594df0c` | 2026-05-20 01:55 | fix | fix(share+legend): mobile share popover positioning and collapsed legend caret |
| 52 | `12ea82f` | 2026-05-20 00:55 | feat | feat(share): portal z-index fix, touch targets, and topojson deps |
| 53 | `4408b19` | 2026-05-19 12:49 | feat | feat(share): redesign ShareButton for non-technical users |
| 54 | `80a2df5` | 2026-05-19 12:41 | feat | feat(research): two-panel dark-theme share-multiplier SVG |
| 55 | `8099a41` | 2026-05-19 12:36 | feat | feat(research): replace share-multiplier SVG with two-panel light-mode design |
| 56 | `78453af` | 2026-05-19 12:31 | feat | feat(research): add share-multiplier animated SVG for partner communication |
| 57 | `293cf72` | 2026-05-19 12:29 | feat | feat(research-map): add Share button with iframe embed snippet for partners |
| 58 | `13ac3a5` | 2026-05-19 12:24 | fix | fix(research-map): add missing dataSource and instanceId to embed profile-config |
| 59 | `685e142` | 2026-05-19 12:20 | feat | feat(research-map): add standalone embed page for partner websites |
| 60 | `1bf4df2` | 2026-05-19 11:41 | fix | fix(legend): constrain desktop panel height to map container, not viewport |
| 61 | `61cf0e1` | 2026-05-19 11:33 | fix | fix(region-popup): wire WAGF Region, WAGF Block, and UUPG count into country-click detail |
| 62 | `50b94b3` | 2026-05-19 11:26 | fix | fix(pins): increase touch target to 44px+ on tablet zoom levels 4-8 |
| 63 | `6a39fdf` | 2026-05-19 11:25 | fix | fix(legend): hide SemanticTreeLegend when people-group detail opens |
| 64 | `dffa1ae` | 2026-05-19 11:24 | fix | fix(legend): cap panel height to viewport instead of stretching to bottom on tablet |
| 65 | `cd48c1a` | 2026-05-18 22:19 | fix | fix(DoxaMapSlot): only render top scroll pad for simple maps |
| 66 | `e9d8fd7` | 2026-05-18 22:17 | feat | feat(1040-maps): prayer ripple animation, unified legend labels, mobile legend parity |
| 67 | `d35bab4` | 2026-05-18 18:28 | feat | feat(legend): collapsed pill parity, pin dimming, tab scrollbar fix, legend state preservation |
| 68 | `367554d` | 2026-05-18 18:01 | feat | feat(legend): match flat legend carets + collapsed pill to SemanticTreeLegend |
| 69 | `fe4237d` | 2026-05-18 17:04 | feat | feat(research-map): add mobile edge scroll padding instead of cooperativeGestures |
| 70 | `24c03cd` | 2026-05-18 16:59 | fix | fix(legend-mobile): add doxa-regions (WAGF Regions) to mobile SemanticTreeLegend |
| 71 | `2be3ece` | 2026-05-18 16:55 | feat | feat(1040-maps): modern map styling — Apple Maps / Felt quality polish |
| 72 | `967de06` | 2026-05-09 22:25 | feat | feat: rename legend title from Affinity Blocks to People Groups |
| 73 | `b08a708` | 2026-05-08 23:36 | other | Replace doxa-{simple,research}-mfe with unified 1040-maps forge |
| 74 | `cd45481` | 2026-05-08 09:39 | other | Maps round 10: feature-flag the active-overlay emphasis off on simple-map |
| 75 | `f415199` | 2026-05-08 09:31 | other | Maps round 9: Joshua-Project outline now also flows through ACTIVE_LAYER overlay |
| 76 | `160e7f5` | 2026-05-08 09:23 | other | Maps round 8: untilt selected pin + theme-aware thin Joshua-Project-style data-pin outline |
| 77 | `29206bd` | 2026-05-08 08:58 | other | Maps round 7: rephrase + enlarge 'Explore our research maps' link |
| 78 | `c52d886` | 2026-05-08 08:54 | other | Maps round 6: angled brush-style pin + 'advanced research map' link on simple-map pages |
| 79 | `cfaf7db` | 2026-05-08 08:21 | other | Maps round 5: unify needs-red, rename Languages tab, dynamic selection-pin color |
| 80 | `b986399` | 2026-05-07 13:55 | other | CMS: Put Documents component in a tiptap node |
| 81 | `e2ebca5` | 2026-05-07 13:40 | other | Show the feedback widget if the user is logged in. |
| 82 | `562bfb8` | 2026-05-07 13:35 | other | Don't throw errors when saving CMS pages. |
| 83 | `16a9af4` | 2026-05-06 15:07 | other | Maps round 4: research caret pattern on simple-map mobile + slight padding trim |
| 84 | `996d4d0` | 2026-05-06 14:08 | other | Maps round 3: unify greens to #22c55e, simple black pin on research, legend reflow when geocoder hidden |
| 85 | `7e5c739` | 2026-05-06 16:06 | other | Implement CMS version history. |
| 86 | `f098b76` | 2026-05-06 14:43 | other | Add page title to CMS pages and update CMS heading styles |
| 87 | `5b631f9` | 2026-05-05 15:40 | other | Maps round 2: prayer green unify, geocoder flag, black pin, default tab |
| 88 | `d37c3d6` | 2026-05-05 12:23 | other | Add /api/maps/token endpoint, swap PPLR page back to static HTML |
| 89 | `46208c6` | 2026-05-05 12:04 | other | Ship PPLR data maps page at /research/pplr-data-maps |
| 90 | `4754c7c` | 2026-05-05 14:18 | other | Catch prayer map errors. |
| 91 | `adadf6f` | 2026-05-04 13:41 | other | Fix Oauth redirect when not logged in |
| 92 | `79e286f` | 2026-05-04 13:15 | other | Change cookie same site method to allow oauth |
| 93 | `adc0a66` | 2026-05-04 12:06 | other | Remove old string |
| 94 | `04ad4c9` | 2026-05-04 11:51 | other | Add invitation to sign up to pray on the adoption form. |
| 95 | `65a7e92` | 2026-05-04 10:59 | other | Better error messages when updating the CMS |
| 96 | `d332a7a` | 2026-05-04 10:55 | other | Don't log every 404 error. |
| 97 | `e37e3c4` | 2026-05-03 23:37 | other | Research map iter-21: bump desktop tab-bar left padding to clear rounded corner |
| 98 | `4acaebe` | 2026-05-03 23:33 | other | DoxaMapSlot: add contain:paint for reliable canvas clipping |
| 99 | `490c5b1` | 2026-05-03 23:28 | other | DoxaMapSlot: inherit border-radius onto the custom element host |
| 100 | `cc9fe84` | 2026-05-03 23:24 | other | Research map iter-20: isolate .rm-root stacking so internal z-index doesn't leak |
| 101 | `6012029` | 2026-05-03 23:15 | other | Research map iter-19: swap Adoption before Engagement in tab order |
| 102 | `ba9d149` | 2026-05-03 23:08 | other | Simple-map iter-3: flat top edges on collapsed mobile footer |
| 103 | `84d74a0` | 2026-05-03 23:01 | other | Simple-map iter-2: slim rows + darken badge bg for neon green readability |
| 104 | `147c4c3` | 2026-05-03 22:40 | other | Research map iter-18: wire mobile SemanticTreeLegend @select to onSemanticTreeSelect |
| 105 | `eaf04b9` | 2026-05-03 22:31 | other | Research map iter-17: fix duplicate label in collapsed-detail footer |
| 106 | `8d93442` | 2026-05-03 22:27 | other | Research map iter-16: collapsed-detail footer for PeopleGroupDetail mode |
| 107 | `6b22cb8` | 2026-05-03 22:14 | other | Research map iter-15: snap legend to default 30% on pin select / detail close |
| 108 | `2d34e3d` | 2026-05-03 21:39 | other | Research map iter-14: fix legendMode check (was 'data', should be !== 'detail') |
| 109 | `d1c2dfa` | 2026-05-03 21:34 | other | Research map iter-13: slim mobile rows + free-drag legend pull-tab |
| 110 | `3919455` | 2026-05-03 21:28 | other | Simple-map iter-1: unify engagement+adoption green to neon, move prayer-page map |
| 111 | `3eedc74` | 2026-05-03 21:13 | other | Research map iter-12: clicking empty map clears stuck row-dim filter |
| 112 | `fc76212` | 2026-05-02 19:06 | other | Research map iter-11: add min-height:0 to .stl-rows so SemanticTreeLegend scrolls |
| 113 | `0b87099` | 2026-05-02 18:46 | other | Research map iter-10: fix tier-3 fullyOpen white-space-at-bottom on mobile |
| 114 | `398e57a` | 2026-05-02 18:32 | other | Research map iter-9: slotted mobile caret + symmetric padding cleanup |
| 115 | `fe3bdca` | 2026-05-02 18:17 | other | Research map iter-8: bump --lrg-caret-col on mobile so caret stops overlapping title |
| 116 | `d501d09` | 2026-05-02 18:10 | other | Research map iter-7: per-tab legend tier memory + bright-row badge contrast |
| 117 | `2a3bbbe` | 2026-05-02 17:59 | other | Research map iter-6: fix CSS specificity collision + descender clip |
| 118 | `154846a` | 2026-05-02 17:43 | other | Research map iter-5: mobile caret z-index, padding, title alignment, mixed-case |
| 119 | `e679831` | 2026-05-02 17:21 | other | Research map iter-4: collapsed footer layout, search ranking, geocoder hard-clear |
| 120 | `62216cb` | 2026-05-02 17:03 | other | Research map mobile iter-3: tab-change reset + stronger caret styling |
| 121 | `ba16f2b` | 2026-05-02 16:46 | other | Research map mobile iter-2 + UPGs/Pop center-align (4 items) |
| 122 | `55ed724` | 2026-05-02 16:26 | other | Research map mobile iter-1: SemanticTreeLegend embedded-in-sheet overrides |
| 123 | `2210707` | 2026-05-02 15:52 | other | Research map: ROOT-CAUSE fix — useMapData.deriveLanguageFamily now does comma-inversion |
| 124 | `8e41d22` | 2026-05-02 09:21 | other | Research map: 3 bugs from desktop QA — pin-color, family-filter coverage, detail-card width |
| 125 | `c97bb26` | 2026-05-02 07:45 | other | Research map iter-2: align geocoder pill geometry + focus ring to PPLR |
| 126 | `7d17cba` | 2026-05-02 07:38 | other | Research map: restore pin-click → people-group detail on language-family tab + align geocoder column |
| 127 | `36660ff` | 2026-05-01 22:21 | other | Research map: stop auto-switching tabs on legend row click |
| 128 | `c94ed59` | 2026-05-01 22:07 | other | Research map: SemanticTreeLegend now an EXACT clone of PPLR's; mounted standalone |
| 129 | `313a77a` | 2026-05-01 21:41 | other | Research map iter-2: PPLR port runtime fixes (4 items) |
| 130 | `a3435fb` | 2026-05-01 21:29 | other | Research map: replace LegendFamilyTree with ported PPLR SemanticTreeLegend |
| 131 | `3ca1510` | 2026-05-01 19:00 | other | Research map: QA building-round-1 R3 fixes (5 items, cherry-picked from PPLR SemanticTreeLegend) |
| 132 | `af20455` | 2026-05-01 18:30 | other | Research map: QA building-round-1 R2 fixes (5 items) |
| 133 | `f343586` | 2026-05-01 17:30 | other | Research map: 3 bug fixes from screenshot QA |
| 134 | `592d466` | 2026-05-01 17:13 | other | Research map: revert iter-3 tab info popovers |
| 135 | `de19094` | 2026-05-01 17:02 | other | Research map iter-3: tab info popovers (ⓘ buttons with definitions) |
| 136 | `02a1ce0` | 2026-05-01 16:50 | other | Research map iter-2: search → tab navigation for language-family + dialect kinds |
| 137 | `e633b5f` | 2026-05-01 16:36 | other | Research map iter-1: Dialects/Varieties tab, parent-display title, per-map geocoder placeholder |
| 138 | `199e126` | 2026-05-01 16:28 | other | Research map: parse dialects from language field; add dialect tab + selection |
| 139 | `8d74269` | 2026-05-01 15:35 | other | Implement content editor role and fix role names |
| 140 | `bd2b746` | 2026-04-30 13:30 | other | fix build |
| 141 | `1b2f491` | 2026-04-30 13:21 | other | fix build |
| 142 | `feeb987` | 2026-04-30 12:15 | other | Setup Analytics |
| 143 | `f9699d9` | 2026-04-30 11:11 | other | move profile page to /admin/profile and link in admin sidebar |
| 144 | `197b9df` | 2026-04-30 09:45 | other | oauth profile connected apps and admin magage page. |
| 145 | `f0d7158` | 2026-04-29 15:20 | other | layers in .layers |
| 146 | `082f3d2` | 2026-04-29 15:07 | other | mcp security |
| 147 | `f95f8fa` | 2026-04-29 14:17 | other | Hide: WARN  Duplicated imports "useAppConfig", |
| 148 | `9b521b8` | 2026-04-29 13:06 | other | Implement CMS MCP |
| 149 | `0ebe124` | 2026-04-28 15:17 | other | Add settings table and setting to disable registration |
| 150 | `3de5c40` | 2026-04-28 15:07 | other | add mcp layer to extend |
| 151 | `d38b2c4` | 2026-04-28 06:26 | other | User invitation (#3) |
| 152 | `241ccfa` | 2026-04-27 13:33 | other | CMS page translation |
| 153 | `c6fa6bb` | 2026-04-27 07:12 | other | Add Go Pin Indicator 2 Research Map 2 Make Disciples - fix map slots |
| 154 | `7832495` | 2026-04-27 07:03 | other | Add Go Pin Indicator 2 Research Map 2 Make Disciples |
| 155 | `4103268` | 2026-04-27 06:56 | other | Launch v1 Doxa Research Maps |
| 156 | `a668e1f` | 2026-04-27 12:38 | other | switch feedback widget to remote bundle, hide by default |
| 157 | `e4e869d` | 2026-04-27 11:59 | other | Click Language Selecture to keep it open |
| 158 | `6035251` | 2026-04-27 11:57 | other | On documents page don't make menu header clickable. |
| 159 | `e0003fc` | 2026-04-27 10:44 | other | And missing people groups field. |
| 160 | `eefa6d6` | 2026-04-27 09:54 | other | Make CMS pages permissions more granular. |
| 161 | `43c4631` | 2026-04-27 09:23 | other | Upgrade migration system to support layers |
| 162 | `2fef05a` | 2026-04-26 02:53 | other | Doxa-life is now a monorepo -> embeddables built inline -> Doxa-life /public/js serves as static CDN for serving map widgets to partner DOXA sites. UNLOCKS people of the day widget. |
| 163 | `2533859` | 2026-04-24 14:33 | other | fix ts issues |
| 164 | `02d00bf` | 2026-04-24 11:18 | other | Change phone input to npm |
| 165 | `bd03c92` | 2026-04-24 10:42 | other | CMS: Ability to set if links open in new tab. |
| 166 | `bec56dc` | 2026-04-24 10:16 | other | implement /research/search/[term] |
| 167 | `5146e8d` | 2026-04-24 10:06 | other | Fix languages dropdown and implement group resources page |
| 168 | `298e61a` | 2026-04-23 20:34 | other | Better CMS page transition |
| 169 | `5a43875` | 2026-04-23 20:00 | other | change caching from fs to memory. |
| 170 | `f62a346` | 2026-04-23 18:16 | other | Cache fixes |
| 171 | `22c2a7c` | 2026-04-23 16:46 | other | fix uupg list |
| 172 | `780e85b` | 2026-04-23 15:50 | other | Implement page categories |
| 173 | `ce8888b` | 2026-04-23 15:16 | other | refactor resources page |
| 174 | `cf4ea19` | 2026-04-23 08:24 | other | MERGE MAP REPOS AS PUBLIC PLUGINS |
| 175 | `ed64d19` | 2026-04-23 14:05 | other | Better CMS page routing and Caching. |
| 176 | `20ab948` | 2026-04-23 12:34 | other | CMS disbale translation button |
| 177 | `281e0de` | 2026-04-23 12:27 | other | Add verse node. |
| 178 | `792eed4` | 2026-04-23 12:01 | other | CMS page layout and saving changes |
| 179 | `5b82409` | 2026-04-23 11:44 | other | add theme and custom css to CMS metadata |
| 180 | `fb4a812` | 2026-04-23 11:15 | other | Ability to align CMS images |
| 181 | `2cc4d20` | 2026-04-23 11:10 | other | Ability to add the UUPG list tip tap component. |
| 182 | `a2ed71e` | 2026-04-23 11:05 | other | Central tiptap block definitions |
| 183 | `329d87a` | 2026-04-23 10:56 | other | switch to public s3 for images in CMS |
| 184 | `d90044f` | 2026-04-23 10:56 | other | Shared enabled languages |
| 185 | `839c637` | 2026-04-23 03:51 | other | "Fixed more info button url mapping, fixed legend gets translated fields from api using language code from parent site passed as prop,  fixed legend numbers for engagement mapped to propper field" |
| 186 | `e40e0d2` | 2026-04-22 15:34 | other | update translations |
| 187 | `ee8637e` | 2026-04-22 14:56 | other | fix SSR admin pages. |
| 188 | `fe33584` | 2026-04-22 14:25 | other | translation of titles |
| 189 | `eaabc30` | 2026-04-22 14:10 | other | remove missing file. |
| 190 | `b5bdb5a` | 2026-04-22 07:31 | other | Add global feedback-widget bubble to parent site (#1) |
| 191 | `7456102` | 2026-04-22 12:07 | other | maps on pray adopt and home pages |

---

## DISCUSSION POINTS — known API/data bugs to review before merge

These are **documented, not fixed** in this branch (per scope). They are display/data-shape
issues in the WAGF block/region map-search path — worth a decision before or shortly after merge.

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

