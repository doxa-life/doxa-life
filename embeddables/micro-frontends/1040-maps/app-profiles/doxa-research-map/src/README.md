# src/ — doxa-research-map's sandbox

This is **this map's** folder. Everything the research map needs that isn't
already in the shared `library/` gets built right here. Nothing in this folder
leaks to any other map — build freely.

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

## What's in here today

- `colors/` holds the THREE research-only color strategies — `affinity-block.js`,
  `doxa-region.js`, `resource.js` — registered by this bundle's `index.js` via
  `import.meta.glob('./src/colors/*.js')`. Shared strategies (adoption,
  engagement, language-family, religion) stay in `library/colors/` because other
  maps use them.
- `api/`, `components/`, `composables/`, `utils/` are empty scaffolds — add this
  map's own code as it grows.

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
   // from research-map.vue (sits at the bundle root, next to index.js):
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

- `../../template-bundle/README.md` — the step-by-step guide the src/ pattern comes from.
- `../../../docs/REFERENCE-library-index.md` — the menu of reusable `@map/…` pieces.
- `../../../docs/HOWTO-build-a-map.md` — the 3 zones + 3 rules, in one page.
