---
id: far-fast-tools/FARFAST1-HOP-POP-PLOT/DOXA/doxa-website-nuxt/doxa-life/embeddables/micro-frontends/1040-maps/src/components/README
audience: trinitarian-believers
audience-strict-66-book: true
framework: farfast-1
kingdom-kernel: false
parent: components
path-tags:
- far-fast-tools
- FARFAST1-HOP-POP-PLOT
- DOXA
- doxa-website-nuxt
- doxa-life
- embeddables
- micro-frontends
- 1040-maps
- src
- components
size-class: short
svg-candidate: false
svg-candidate-reasons: []
svg-candidate-score: 0
svg-candidate-tagged-at: '2026-05-09T17:40:05.451950+00:00'
svg-candidate-version: '0.2'
tagged-at: '2026-05-09T05:49:39.360475+00:00'
tagged-by: lk10x-tagger-v0.1.0
tags:
- legends-mapcontrolscomponent-vue
- shared-vue-components
- new-legendmobilesheet-vue
- mobile-legend-drawer
- rendering-primitive-shared
voice-memo-shape: false
word-count: 271
---

# template/src/components/

> **Shared Vue components used by app-profiles.** Catalog and contracts live in [`/docs/components/`](../../../docs/components/).

## Files in this folder

| File / folder | Role | Docs |
|---|---|---|
| `LegendDesktop.vue` | Desktop legend panel | [`/docs/components/legend-components.md`](../../../docs/components/legend-components.md) |
| `LegendMobile.vue` | Mobile legend (drawer / sheet) | same |
| `LegendRows.vue` | Flat rendering primitive shared by both legends | same |
| `MapControlsComponent.vue` | Legacy combined map controls — being replaced by `map-controls/` | [`/docs/components/map-controls.md`](../../../docs/components/map-controls.md) |
| `PeopleGroupDetail.vue` | Feature record card (right-side panel content) | [`/docs/components/detail-panels.md`](../../../docs/components/detail-panels.md) |
| `PrayerLapsComponent.vue` | Live prayer-count bar | same |
| `ResearchMapFilterPanel.vue` | Research-map specific filter panel | (no dedicated doc yet) |
| `ResearchMapSideMenu.vue` | Research-map side menu | (no dedicated doc yet) |
| `SideMenuDrawer.vue` | Generic slide-in side panel primitive | [`/docs/components/detail-panels.md`](../../../docs/components/detail-panels.md) |
| `map-controls/` | Per-button toolbar components — see subfolder README |
| `poster/` | Poster export UI (dialog, preview, slot composition) — see subfolder README |
| `archive/` | **Deprecated.** Retained for diff/history. Do not import. |

## Conventions

- Every component uses `<script setup>` (Vue 3.5+).
- Every component that renders any CSS calls `useShadowStyles()` so styles attach to the shadow root.
- Stores accessed via `inject('mapStore' | 'uiStore' | 'dataStore')` — never via direct `useXxxStore()` import.
- Mapbox token via `inject('mapboxToken')`.

## Cross-references

- Component catalog → [`/docs/components/`](../../../docs/components/)
- Vue 3 conventions → [`/docs/vue3-conventions/`](../../../docs/vue3-conventions/)
- Provide/inject pattern → [`/docs/vue-patterns/provide-inject.md`](../../../docs/vue-patterns/provide-inject.md)
- Shadow-DOM conventions → [`/docs/shadow-dom/`](../../../docs/shadow-dom/)

## Next

If you need a component spec contract, go to [`/docs/components/`](../../../docs/components/). If you need to add a new component, follow the catalog conventions and write a matching doc entry.