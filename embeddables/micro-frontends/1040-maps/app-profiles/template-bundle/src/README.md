# src/ — your map's sandbox

This is **your** folder. Everything your map needs that isn't already in the
shared `library/` gets built right here. Nothing in this folder leaks to any other
map — build freely.

> **Two zones, in one sentence:** `library/` (imported with the `@map/…` alias) is
> the shared, reusable menu you **reuse, never edit**; `app-profiles/<your-map>/src/`
> (this folder) is your private sandbox where you **build anything**.

## The layout

```
src/
├── api/          your data-source wiring (which API/CSV/endpoint this map reads)
├── colors/       ALL your map's colors: plain values (colors.json) + strategy .js files
├── components/   your map's own .vue pieces (not reusable → they live here)
├── composables/  your map's own logic hooks (useThing.js)
└── utils/        your map's own pure helper functions
```

Each subfolder has its own README explaining what belongs there. Start with a
subfolder only when you actually need it — an empty sandbox is fine.

## The two ways you import

There are exactly two import styles, and they mean different things:

1. **Reuse a shared piece from the library** → import with the **`@map/…` alias**.
   The alias points at the bundler's `library/` folder. You never copy library
   code into your folder; you import it by reference.

   ```js
   import { useMapInstance } from '@map/composables/useMapInstance.js'
   import LegendDesktop      from '@map/components/legends/LegendDesktop.vue'
   ```

   The full menu of what `@map/…` offers is **`docs/REFERENCE-library-index.md`** at the bundler
   root.

2. **Use your own code from this sandbox** → import with a **relative path**
   (`./`), from your profile `.vue` at the bundle root or from a sibling file here.

   ```js
   // from template-map-a.vue (sits at the bundle root, next to index.js):
   import colors    from './src/colors/colors.json'
   import { fmt }   from './src/utils/format.js'
   ```

   There is **no `@map/`-style alias for your sandbox** — your own code is always a
   relative `./src/...` path. That relative-path boundary is exactly what keeps your
   sandbox private to your map.

## The rule for what goes where

> **Reusable by more than one map + parameterized → it belongs in `library/`**
> (and that's an expert move — propose it, don't just do it).
> **Specific to this one map → it stays here, in `src/`.**

Local by default. A file only graduates from `src/` into `library/` once a *second*
map genuinely needs it.

## See also

- `../README.md` — the step-by-step guide to building a new map from this template.
- `../../../docs/REFERENCE-library-index.md` — the menu of reusable `@map/…` pieces.
- `../../../docs/HOWTO-build-a-map.md` — the 3 zones + 3 rules, in one page.
