# template-bundle — copy this to start a new map

You're a **programmer** (a *coder*, a *map-maker*) about to build a map. This folder
is your starting point. **Copy it, then build your map inside the copy.** It's a
tiny working bundle — two trivial profiles that render a colored box, no Mapbox, no
data — plus a `src/` sandbox laid out for the real code you'll add.

Don't build from a blank folder. Start here.

---

## The two zones

Know which zone a file is in before you touch it.

| Zone | What it is | Can you edit it? |
|---|---|---|
| **`library/`** (imported as `@map/…`) | The shared, reusable, parameterized building blocks — map, legends, toolbars, composables, the color + API registries. | **No — reuse only.** Editing it breaks other maps. |
| **`app-profiles/<your-map>/src/`** | Your **safe sandbox**. Your screens, colors, API wiring, components, utils. | **Yes — build anything.** Nothing here leaks to any other map. |

To see everything `library/` gives you, read **`docs/REFERENCE-library-index.md`** at the bundler
root. That's the menu you pick from.

## The three rules

1. **Reference the template.** Start every new map by copying this folder.
2. **Build everything for your map inside your app-profile.** Colors, APIs,
   components, utils, data — all of it goes in `app-profiles/<your-map>/`.
3. **Don't edit `library/`** (nor `internal/`) unless you're an expert and know
   exactly why. `library/` is shared; a change there can break every other map.

Rule of thumb: **local by default.** Code only moves into `library/` once a
*second* map genuinely needs it — and that's an expert move, not a first move.

---

## To build a new map — the steps

1. **Copy this folder.** `app-profiles/template-bundle/` → `app-profiles/<your-map>/`.
   The folder name becomes your bundle name (and its output file, `<your-map>.js`).
2. **List your requirements.** Write down what your map needs: which data, which
   colors, which controls (legend, search, share, fullscreen…).
3. **Pick pieces from `docs/REFERENCE-library-index.md`.** Match your list to the reusable
   `@map/…` components, composables, and utils. Import them **by reference** — never
   copy library code into your folder.
4. **Put your custom code in `src/`.** Anything that's yours and specific to this
   map — screens, components, hooks, helpers — goes in `src/` (see the map below).
   Rename the custom-element tag in `index.js` to your map's tag.
5. **Edit your colors in `src/colors/colors.json`.** Change the hex values — no
   code. For color that varies by data value, use a strategy in `src/colors/`
   (start from `example-mode.js` there — a strategy is any `<mode>.js` in that folder).
6. **Run the build.** `bun run build` (or `npm run build`) → your `<your-map>.js`
   appears. For just yours: `BUNDLE=<your-map> bun run build:bundle`.

---

## What's in this folder

```
app-profiles/template-bundle/
├── index.js              ← bundle entry: registers <template-bundle>, globs ./*.vue
├── index.html            ← dev staging page (required for the build to find the bundle)
├── template-map-a.vue    ← profile "template-map-a"   ← FLAT, at the bundle root
├── template-map-b.vue    ← profile "template-map-b"   ← FLAT, at the bundle root
└── src/                  ← YOUR SANDBOX — build your map's own code here
    ├── api/                which data source this map reads
    ├── colors/             ALL your colors: colors.json (plain values) + strategy .js
    │                       files (data-driven — example-mode.js to copy)
    ├── components/         your map's own .vue pieces
    ├── composables/        your map's own logic hooks
    └── utils/              your map's own helper functions
```

**The map-maker's rule:** the bundle **root** holds ONLY the application
profile(s) (`.vue`) plus the scanner-contract files (`index.js`, `index.html`,
`*.instances.json`, `README.md`). Everything else lives in `src/`.

Each `src/` subfolder has its own README explaining what belongs there. It builds
into **one** file: `../../../public/js/template-bundle.js`.

---

## The flat design (profiles at the bundle root)

The `.vue` profile files sit **directly in the bundle folder**, side by side with
`index.js`. There is **no nested `profiles/` subfolder** — because the entry
discovers profiles with a **flat glob**:

```js
// index.js
const profileModules = import.meta.glob('./*.vue')   // ← './*.vue', not './profiles/*.vue'
```

```
template-bundle/
   index.js
   template-map-a.vue      ✅ flat — discovered
   template-map-b.vue      ✅ flat — discovered
   profiles/
      template-map-c.vue   ❌ would NOT be discovered
```

Keep your **profile screens flat** at the root. The *pieces those screens are built
from* (small components, hooks, helpers) live in `src/`.

## How the pieces map together

| Thing | Value here | Rule |
|---|---|---|
| Folder name | `template-bundle` | = the bundle name |
| Output file | `../../../public/js/template-bundle.js` | `<folder>.js` |
| Custom element tag | `<template-bundle>` | registered in `index.js` |
| Profile files | `template-map-a.vue`, `template-map-b.vue` | each `*.vue` = one profile |
| Profile name | `template-map-a` / `template-map-b` | the filename without `.vue` |

One bundle, two profiles. The page picks which profile to render with the
`profile` field of `profile-config` — both share the single `template-bundle.js`.

## The two ways you import

- **Reuse from the library** → the **`@map/…` alias** (points at `library/`):
  `import { useMapInstance } from '@map/composables/useMapInstance.js'`
- **Use your own sandbox code** → a **relative `./src/...` path**:
  `import colors from './src/colors/colors.json'`

There is no `@map/`-style alias for your sandbox — your own code is always a
relative path. That boundary is what keeps your sandbox private to your map.

---

## Embed it

```html
<script src="/js/template-bundle.js"></script>

<!-- profile A -->
<template-bundle profile-config='{"profile":"template-map-a"}'></template-bundle>

<!-- profile B — same bundle, different profile -->
<template-bundle profile-config='{"profile":"template-map-b"}'></template-bundle>
```

(`profile` must match a `.vue` filename in this folder, without the `.vue`.)

## Build / preview

```bash
# build just this bundle → ../../../public/js/template-bundle.js
BUNDLE=template-bundle npm run build:bundle

# or build every bundle
npm run build

# preview in isolation (HMR) — open the staging page for this bundle
npm run dev
```

## Add a third profile

Drop another flat `.vue` next to the others — no config to edit:

```bash
#   app-profiles/template-bundle/template-map-c.vue
npm run build      # → still one file, template-bundle.js, now with 3 profiles
```

Then request it: `<template-bundle profile-config='{"profile":"template-map-c"}'></template-bundle>`.

## See also

- `src/README.md` — the sandbox layout and the two import styles.
- `../../docs/HOWTO-build-a-map.md` — the 3 zones + 3 rules, in one page.
- `../../docs/REFERENCE-library-index.md` — the menu of reusable `@map/…` pieces.
- `../README.md` — the app-profiles authoring guide (bundle pattern, embed template).
- `../../CONTRIBUTING.md` — build vs dev, the two CDN modes, partner-site embedding.
- `../doxa-simple-map/index.js` — a fuller, real-map reference bundle entry.
