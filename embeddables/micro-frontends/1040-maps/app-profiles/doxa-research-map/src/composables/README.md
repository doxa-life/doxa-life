# src/composables/ — your map's own logic hooks

Vue Composition-API hooks (`useSomething.js`) that hold **this map's** logic live
here. A composable bundles reactive state + behavior your screens share — the
map-specific version of the reusable hooks the library ships.

## What belongs here vs. in the library

| Logic | Where |
|---|---|
| Behavior **only your map** needs | **here** — `src/composables/useYourThing.js` |
| Reusable map logic (map instance, data loading, layers, clustering, theme) | `library/composables/` — reuse via `@map/composables/…` |

The library already ships the heavy lifting: `useMapInstance`, `useMapData`,
`useMapLayers`, `useMapClustering`, `useMapFly`, `useMapTheme`, `useLegendData`,
and more — see **`docs/REFERENCE-library-index.md`**. Reuse those; write here only the glue that
is unique to your map.

## How you import

```js
// reuse shared logic from the library:
import { useMapInstance } from '@map/composables/useMapInstance.js'

// use your own hook from this sandbox (relative path):
import { useYourThing } from './src/composables/useYourThing.js'
```

## Convention

- One hook per file, named `useThing.js`, exporting a `useThing()` function.
- Keep it framework-pure — no direct DOM assumptions beyond the map element you're
  handed. That's what keeps a hook easy to promote to `library/` later, *if* a
  second map ever needs it (an expert move — local by default).

## See also

- `../../../../docs/REFERENCE-library-index.md` — the menu of reusable `@map/composables/…`.
- `../README.md` — the sandbox overview.
