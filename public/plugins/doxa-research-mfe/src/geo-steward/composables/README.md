# template/src/geo-steward/composables/

> **Composables ported from the legacy `vue-geo-steward` services.** Each replaces some slice of the old monoliths (`gomap-service.js`, `useTilesetPlotter.js`, …) with a focused Vue 3 composable.

| File | Purpose | Replaces |
|---|---|---|
| `useWorkflow.js` | Multi-step workflow state + step transitions | (new — pulled from `cardflip` route + workflow stores) |
| `useCardFlip.js` | 3D flip-card animation primitive | (new) |
| `useBatchRunner.js` | Async iteration with progress + cancel | `gomap-service.js` (subset) |
| `useMapCapture.js` | Canvas / Mapbox snapshot to data URL | `static-image-service.js` (subset) |
| `usePolygonWorkflow.js` | Selected / pending / committed polygon sets | polygon-store + batch-selection-store |
| `useGeoJsonIO.js` | Import/export GeoJSON (with stewardship-log nesting) | `useGeoJsonIO.js` (696 LOC original) |
| `useMapboxStylesAPI.js` | Wrapper around the Mapbox Styles REST API | `useMapboxStylesAPI.js` (492 LOC original) |
| `useTilesetManager.js` | Tileset upload/status/swap | `useTilesetPlotter.js` (1609 LOC; refactor in progress) |
| `usePrintDialog.js` | iframe-based `window.print()` orchestration | `print-dialog-service.js` |

## Conventions

- All stores accessed via `inject(...)`. The barrel-consumer wires `provide()`.
- Composables return an object: reactive state + methods + refs. Callers destructure.
- No `console.log` in production paths.

## Cross-references

- Catalog (in main composables doc) → [`/docs/composables/geo-steward-services.md`](../../../../docs/composables/geo-steward-services.md)
- Migration notes → [`/docs/gomap-service/migration-to-framework.md`](../../../../docs/gomap-service/migration-to-framework.md)
- Original architecture analysis → [`/docs/vue-geo-steward/architecture-analysis.md`](../../../../docs/vue-geo-steward/architecture-analysis.md)

## Next

To extend `useTilesetManager`, wait for the refactor split (currently 1609 LOC source is being chunked).
