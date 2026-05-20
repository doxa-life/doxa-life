---
id: far-fast-tools/FARFAST1-HOP-POP-PLOT/DOXA/doxa-website-nuxt/doxa-life/embeddables/micro-frontends/1040-maps/src/utils/README
audience: trinitarian-believers
audience-strict-66-book: true
framework: farfast-1
kingdom-kernel: false
parent: utils
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
- utils
size-class: short
svg-candidate: false
svg-candidate-reasons: []
svg-candidate-score: 0
svg-candidate-tagged-at: '2026-05-09T17:40:05.451195+00:00'
svg-candidate-version: '0.2'
tagged-at: '2026-05-09T05:49:38.753498+00:00'
tagged-by: lk10x-tagger-v0.1.0
tags:
- geojson-helpers-clusterhelpers
- javascript-helpers-vue
- window-mapappapiurl-viteapibaseurl
- js-resolves-api
- networkclusteringutil-js
voice-memo-shape: false
word-count: 187
---

# template/src/utils/

> **Pure JavaScript helpers.** No Vue, no Pinia, no Mapbox imports. Anything reactive is a composable; anything stateful is a store. See [`/docs/utils/`](../../../docs/utils/) and [`/docs/geo-math/`](../../../docs/geo-math/) for the full catalog.

| File | Purpose |
|---|---|
| `apiBaseUrl.js` | Resolves the API base URL at runtime from `window.MAP_APP_API_URL` / `VITE_API_BASE_URL` |
| `geoUtils.js` | Centroid, bounds, validation, GeoJSON helpers |
| `ClusterHelpers.js` | Shared helpers used by both clustering utilities below |
| `MSTClusteringUtil.js` | Minimum-spanning-tree clustering for affinity blocks |
| `NetworkClusteringUtil.js` | Network-line clustering — connect nearby pins with edges |

## Conventions

- No `import { ref } from 'vue'` allowed in this folder.
- No `import mapboxgl from 'mapbox-gl'` — operate on plain `[lng, lat]` arrays.
- Prefer named exports for tree-shaking.
- JSDoc on every export.

## Cross-references

- Utils catalog → [`/docs/utils/`](../../../docs/utils/)
- Geo-math reference → [`/docs/geo-math/`](../../../docs/geo-math/)
- Clustering archetype → [`/docs/research-maps/cluster-heatmap.md`](../../../docs/research-maps/cluster-heatmap.md)
- Mapbox clustering doc → [`/docs/mapbox/clustering.md`](../../../docs/mapbox/clustering.md)

## Next

If you find yourself writing reactive logic here, stop — move it to `../composables/` and rename `useXxx`. If you need Mapbox APIs, same — that's a composable, not a util.