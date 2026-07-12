# src/components/ — your map's own Vue pieces

Small `.vue` components that belong to **this map only** live here. If a piece is
specific to your map — a custom info card, a bespoke overlay, a one-off panel — it
goes here, not in the shared library.

## What belongs here vs. in the library

| Piece | Where |
|---|---|
| A component **only your map** uses | **here** — `src/components/YourThing.vue` |
| A reusable, parameterized component (legend, toolbar button, drawer) | `library/components/` — reuse via `@map/components/…` |

Before you build a component, check **`docs/REFERENCE-library-index.md`** at the bundler root —
the library already ships legends, map-control buttons, drawers, a geocoder search
bar, poster tools, and more. Reuse those; only build here what's genuinely yours.

## How you import

```js
// reuse a shared component from the library (by reference, never copied):
import LegendDesktop from '@map/components/legends/LegendDesktop.vue'

// use your own component from this sandbox (relative path):
import YourThing from './src/components/YourThing.vue'
```

Your profile `.vue` files (the map screens themselves) stay **flat at the bundle
root** next to `index.js` — that's the discovery convention (`import.meta.glob('./*.vue')`).
The pieces those screens are *built from* live here.

## See also

- `../../../../docs/REFERENCE-library-index.md` — the menu of reusable `@map/components/…`.
- `../README.md` — the sandbox overview (the two import styles).
