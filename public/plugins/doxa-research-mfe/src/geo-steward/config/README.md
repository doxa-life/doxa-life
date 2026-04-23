# template/src/geo-steward/config/

> **Static configuration for the geo-steward library.** No runtime logic; just exported constants the composables and components read.

| File | Exports |
|---|---|
| `workflow-steps.js` | The ordered list of workflow steps + their UI labels (used by `useWorkflow`) |
| `print-defaults.js` | Default page size, orientation, margins for `usePrintDialog` |
| `svg-defaults.js` | Default stroke widths, colors, fonts for the `Svg*` classes |
| `export-formats.js` | Supported export formats for `useGeoJsonIO` (GeoJSON, KML, …) |

## Conventions

- Pure data — no Vue, no DOM, no Mapbox imports.
- One concern per file.
- Importable in any environment (browser, Node test, Worker).

## Cross-references

- Library README → [`../README.md`](../README.md)
- Workflow composable → [`../composables/useWorkflow.js`](../composables/)
- Print dialog composable → [`../composables/usePrintDialog.js`](../composables/)
- Print/export pattern → [`/docs/print-export/`](../../../../docs/print-export/)

## Next

To add a new export format, edit `export-formats.js` and update `useGeoJsonIO.js` to dispatch on it.
