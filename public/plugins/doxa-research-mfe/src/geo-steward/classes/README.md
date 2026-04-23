# template/src/geo-steward/classes/

> **Plain ES6 classes for SVG/DOM work.** Zero Vue dependency. Testable in isolation. Each class has one responsibility.

| File | Class | Role |
|---|---|---|
| `SvgCanvas.js` | `SvgCanvas` | Top-level SVG container — children attach here |
| `SvgShape.js` | `SvgShape` | Base shape — common attributes (stroke, fill, transform) |
| `SvgPolygon.js` | `SvgPolygon` | Polygon shape — point lists, closed paths |
| `SvgCircle.js` | `SvgCircle` | Circle shape — `cx`, `cy`, `r` |
| `SvgPath.js` | `SvgPath` | Arbitrary path — SVG `d` attribute helper |
| `SvgText.js` | `SvgText` | Text node — font, anchor, baseline |
| `SvgGroup.js` | `SvgGroup` | `<g>` container for transforms / styling siblings |
| `SvgExporter.js` | `SvgExporter` | Serialize an `SvgCanvas` to an SVG string or download |
| `SvgLabelPlacer.js` | `SvgLabelPlacer` | Avoid label collision — relax labels into open space |
| `SvgLegendRenderer.js` | `SvgLegendRenderer` | Render a legend (color swatches + text) into an SvgCanvas |

## Conventions

- ES6 classes; constructor takes plain options.
- No imports from `vue`, `mapbox-gl`, `pinia`.
- No DOM mutations outside the SVG namespace — these classes produce SVG, the caller decides whether to mount it.

## Cross-references

- Plan → [`/docs/geo-steward-component-library/svg-classes-plan.md`](../../../../docs/geo-steward-component-library/svg-classes-plan.md)
- Library README → [`../README.md`](../README.md)

## Next

To add a new shape (e.g., `SvgArc.js`), extend `SvgShape` and add it to this README's table.
