---
id: far-fast-tools/FARFAST1-HOP-POP-PLOT/DOXA/doxa-website-nuxt/doxa-life/embeddables/micro-frontends/1040-maps/src/stores/README
audience: trinitarian-believers
audience-strict-66-book: true
framework: farfast-1
kingdom-kernel: false
parent: stores
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
- stores
size-class: short
svg-candidate: false
svg-candidate-reasons: []
svg-candidate-score: 0
svg-candidate-tagged-at: '2026-05-09T17:40:05.450553+00:00'
svg-candidate-version: '0.2'
tagged-at: '2026-05-09T05:49:38.335493+00:00'
tagged-by: lk10x-tagger-v0.1.0
tags:
- mapstore-js
- profileloader-vue-import
- doxa-map-customelements
- activemapid-uistore
- legendstate-prayerfilter-datastore
- mapbox-instances-selectedregion
- instance-pinia
voice-memo-shape: false
word-count: 198
---

# template/src/stores/

> **Per-instance Pinia stores.** Three stores, one responsibility each. Created fresh per `<doxa-map>` element by `entry.js`. Exposed to descendants via `provide()` from `ProfileLoader.vue` — never import directly elsewhere (LL-010, LL-023).

| File | Owns | Example fields |
|---|---|---|
| `mapStore.js` | Map-level state: selections, zoom, bbox, registered Mapbox instances | `selectedRegion`, `selectedFamily`, `selectedPeopleGroup`, `maps[mapId]`, `activeMapId` |
| `uiStore.js` | UI state: sidebar, tabs, theme, toasts, modals, breakpoint | `activeTab`, `sidebarCollapsed`, `theme`, `legendState`, `prayerFilter` |
| `dataStore.js` | Data caching: GeoJSON features (markRaw), fetch status, errors | `sources[sourceId]`, `loadingStates[sourceId]` |

## Conventions

- Use `markRaw()` on large GeoJSON arrays (LL-018) — Vue should not deeply proxy them.
- Actions, not mutations directly — keep state changes in named methods.
- No store imports cross-file (`mapStore` doesn't import `uiStore`); cross-store coordination happens at the component level.

## Cross-references

- Pinia patterns → [`/docs/pinia/`](../../../docs/pinia/)
- Per-instance rule → [`/docs/lessons/LL-010-per-instance-pinia.md`](../../../docs/lessons/LL-010-per-instance-pinia.md)
- markRaw rule → [`/docs/lessons/LL-018-markraw-large-data.md`](../../../docs/lessons/LL-018-markraw-large-data.md)
- ProfileLoader (where stores get instantiated + provided) → `../ProfileLoader.vue`

## Next

To add a fourth store, justify it first (the three above intentionally exhaust the framework's responsibilities). If justified: add to `ProfileLoader.vue`'s setup, provide it under a stable key, and document in [`/docs/pinia/store-structure.md`](../../../docs/pinia/store-structure.md).