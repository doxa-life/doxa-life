# template/src/composables/

> **Reusable Vue 3 composables.** Each `useXxx.js` is the unit of reuse — profile components consume them via `inject()`-backed wiring. Catalog and contracts live in [`/docs/composables/`](../../../docs/composables/).

| File | Purpose |
|---|---|
| `useMapInstance.js` | Mapbox GL map lifecycle, shadow-DOM-aware CSS injection, resize logic |
| `useMapFly.js` | `flyTo` / `fitBounds` with UI-offset awareness |
| `useMapData.js` | DataSourceManager wrapper — load, normalize, cache, derived stats |
| `useMapLayers.js` | Add Mapbox layers (pins, regions, clusters, language families) |
| `useMapEvents.js` | Click/hover/cursor handlers, popup generation |
| `useMapSelection.js` | Region/family visibility, pin dimming, connection lines |
| `useMapClustering.js` | Pin clustering with network lines + MST affinity blocks |
| `useSelectedPin.js` | Single-pin selection highlight marker |
| `useLegendData.js` | Data-driven legend item tree (prayer / engagement / adoption / …) |
| `useDoxaSearch.js` | Local geocoder — supplements Mapbox with dataset-aware search |
| `useShadowStyles.js` | Idempotent CSS injection into the shadow root |
| `useAvatarGenerator.js` | Two-letter initials avatar (SVG/inline) for popups + legends |
| `useMapPoster.js` | Compose a printable poster from the live map + legend + metadata |
| `usePosterLayout.js` | Page-size + slot positioning for the poster |
| `useStaticImage.js` | Mapbox Static Images API client — fixed-bbox raster capture |

## The Golden Rule

> **Composables inject stores via `inject()` — never `useXxxStore()` directly.**

See [LL-010](../../../docs/lessons/LL-010-per-instance-pinia.md) and [LL-023](../../../docs/lessons/LL-023-local-pinia-resolution.md). Only `ProfileLoader.vue` calls the `useXxxStore()` factories; everything below it injects.

## Cross-references

- Catalog & contracts → [`/docs/composables/`](../../../docs/composables/)
- Composition rules → [`/docs/composables/composition-rules.md`](../../../docs/composables/composition-rules.md)
- Pinia per-instance → [`/docs/pinia/per-instance-stores.md`](../../../docs/pinia/per-instance-stores.md)
- Geo-steward composables (separate folder) → `../geo-steward/composables/`

## Next

If you need a contract spec for a composable, go to [`/docs/composables/`](../../../docs/composables/). If you're writing a new composable, follow the rules in [`/docs/composables/composition-rules.md`](../../../docs/composables/composition-rules.md).
