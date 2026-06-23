# Color Strategies — modular folder

One strategy = one file (per upstream refactor `ideation3.md § R2`). Each strategy
decides how people-group pins are colored on the map for a given "color mode"
(language family, prayer progress, religion, …). `_registry.js` is the central
enum + lookup; back-compat shims `../colorStrategies.js` and `../colors.js`
re-export from here so older imports keep working.

## The strategy contract

Every `<name>.js` file MUST `export default` an object with this shape. Missing
`name` is the exact regression card #20 fixed — `listStrategies()` and any UI that
labels the strategy read `strategy.name`, so an absent `name` shows up as
`undefined` (the map still paints, but the tab/legend label is blank).

```js
export const PROPERTY_KEY = 'myField'        // GeoJSON feature property this reads

export function getColor(properties) { ... }  // (props) -> '#rrggbb' — JS-side resolver
export function applyColor(options = {}) { ... } // -> Mapbox expression array (head = operator)
export const buildColorExpression = applyColor   // alias used by the tab-switch handler

export default {
  name:        'My Strategy',   // REQUIRED — human label. Never omit.
  propertyKey: PROPERTY_KEY,
  getColor,
  applyColor,
  buildColorExpression,
  // …any palette/labels you also want on the default export
}
```

`applyColor()` must return a valid Mapbox paint expression — an array whose first
element is an operator (`'match'`, `'case'`, `'interpolate'`, …). It is fed
directly to `circle-color` in `useMapLayers.addLanguageFamilyLayer`.

## Add a custom strategy (full checklist)

1. **Create `<name>.js`** next to this file, following the contract above.
   If you derive color from a string, reuse `generateColorFromString` from
   `../../utils/geoUtils.js` (see `doxa-region.js`).
2. **Register it in `_registry.js`:**
   - add an `import` at the top,
   - add a key to `COLOR_MODES`,
   - add it to the `STRATEGIES` map,
   - add it to the bottom named re-export block (parity — all strategies are listed there).
3. **Make sure the pin feature carries your `PROPERTY_KEY`.** Pin properties are
   built in `composables/useMapLayers.js → addLanguageFamilyLayer` (the big
   `properties: { … }` block). If your field isn't there, the Mapbox expression
   reads `undefined` and every pin falls to the default color.
4. **Wire the legend** (only if the map shows a legend tab for this mode) in
   `composables/useLegendData.js`: add a `TITLE_KEYS` entry, an `activeFilter`
   branch, a `setFilter` branch, and an `items` branch that emits the rows.
   Religion is the worked example — it reads its palette/labels via the named
   exports (`PALETTE`, `RELIGION_FAMILIES`, `getReligionFamily`), not the default
   export, so export those too if the legend needs them.
5. **Verify** by running the structural harness (it resolves every mode, asserts a
   non-empty `name`, a valid expression array, and a hex `getFeatureColor`):

   ```
   node /tmp/colorstrat-verify.mjs    # see card #20; copy into a repo test if you want it permanent
   ```

## Status / custom modes

`COLOR_MODES.STATUS` and `COLOR_MODES.CUSTOM` are declared but have no dedicated
strategy file — `getColorStrategy()` falls back to `LANGUAGE_FAMILY` for any
unknown/unregistered mode. Add a real file + registration (steps above) when one
of these graduates from placeholder to a real coloring.
