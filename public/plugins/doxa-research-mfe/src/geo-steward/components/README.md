# template/src/geo-steward/components/

> **Vue 3 SFCs ported from the legacy `vue-geo-steward` plugin.** All use `<script setup>`, `provide`/`inject` for stores, and `useShadowStyles()` for CSS injection.

| File | Role |
|---|---|
| `AppShell.vue` | Top-level shell that hosts the workflow + side menus |
| `CardFlip.vue` | 3D flip-card primitive (front/back faces) |
| `CardStack.vue` | Workflow of CardFlips — sequenced steps |
| `WorkflowHeader.vue` | Sticky header for the workflow shell |
| `WorkflowFooter.vue` | Sticky footer (next/back/save controls) |
| `MapboxCanvas.vue` | The Mapbox GL canvas wrapper |
| `MapGeocoder.vue` | Geocoder UI (Carmen-format aware) |
| `MapToolbarButton.vue` | Toolbar button primitive used by buttons below |
| `LayersMenuButton.vue` | Toggle layer-visibility menu |
| `PolygonDrawButton.vue` | Toggle polygon-draw mode (mapbox-gl-draw) |
| `RgbToggleButton.vue` | Switch between color render modes |
| `SideMenu.vue` | Top-level side menu container |
| `SubMenuPanel.vue` | Sliding sub-menu inside the side menu |
| `SettingsPanel.vue` | Settings drawer (theme, units, language) |
| `P2PDropdown.vue` | Polygon-to-polygon dropdown selector |
| `PolygonList.vue` | List of selected/pending/committed polygons |
| `TilesetStatus.vue` | Live status of the active tileset upload |
| `TilesetPopup.vue` | Popup that appears when a tileset feature is clicked |
| `ScanUploader.vue` | Image-scan upload with progress |
| `LoadingOverlay.vue` | Reusable loading-state overlay |
| `AcceptanceDialog.vue` | Modal for confirming destructive/irreversible actions |
| `ImportGeoJsonButton.vue` | Trigger GeoJSON import via `useGeoJsonIO` |
| `ExportGeoJsonButton.vue` | Trigger GeoJSON export via `useGeoJsonIO` |
| `PrintDialog.vue` | Modal that drives `usePrintDialog` |

## Conventions

- All components consumed via the `../index.js` barrel — never import from this folder directly.
- Stores accessed via `inject('polygonStore' | 'workflowStore' | …)`. The barrel-consumer (a profile or `AppShell`) is responsible for `provide()`.
- Styles injected via `useShadowStyles()`.

## Cross-references

- Library README → [`../README.md`](../README.md)
- Spec → [`/docs/geo-steward-component-library/`](../../../../docs/geo-steward-component-library/)
- Component port survey → [`/docs/geo-steward-component-library/component-port-survey.md`](../../../../docs/geo-steward-component-library/component-port-survey.md)

## Next

To add a component, follow the same Vue-3 + `<script setup>` + `useShadowStyles()` pattern, then add it to the `index.js` barrel and to this README's table.
