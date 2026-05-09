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
