# template/src/components/map-controls/

> **Per-button toolbar controls.** Each file is a single, focused button or input that mounts inside the map's control area. Replaces the older monolithic `../MapControlsComponent.vue`.

| File | Role |
|---|---|
| `MapToolbar.vue` | Container that lays out the buttons below |
| `MapControlButton.vue` | Base button primitive used by the others (icon + tooltip + accessibility) |
| `ZoomInButton.vue` | `+` button — `map.zoomIn()` |
| `ZoomOutButton.vue` | `-` button — `map.zoomOut()` |
| `LocationButton.vue` | Geolocation button — fly to user's position |
| `FullscreenButton.vue` | Toggle fullscreen on the map container |
| `HamburgerButton.vue` | Open/close side menu |
| `ThemeToggleButton.vue` | Light/dark theme toggle (delegates to `uiStore.theme`) |
| `GeocoderComponent.vue` | Mapbox Geocoder wrapper — Carmen-format aware, shadow-DOM-safe (LL-004, LL-015) |

## Conventions

- Every button accepts a `size` prop (`'sm' | 'md' | 'lg'`) and follows the `MapControlButton` shape.
- Click handlers go through `inject('mapStore')` or call `getMap()` — never via a captured Mapbox instance.
- Geocoder z-index is set per LL-004 (above the legend, below popups).

## Cross-references

- Catalog spec → [`/docs/components/map-controls.md`](../../../../docs/components/map-controls.md)
- Geocoder pattern → [`/docs/mapbox/geocoder.md`](../../../../docs/mapbox/geocoder.md)
- Shadow-DOM z-index → [`/docs/shadow-dom/z-index-and-layers.md`](../../../../docs/shadow-dom/z-index-and-layers.md)
- Lessons → [LL-004](../../../../docs/lessons/LL-004-geocoder-z-index.md), [LL-015](../../../../docs/lessons/LL-015-custom-geocoder-carmen.md)

## Next

If you need to add a new toolbar button, copy `ZoomInButton.vue` and add it to `MapToolbar.vue`.
