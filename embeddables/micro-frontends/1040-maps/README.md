# 1040-maps

A Vite-powered monorepo + map forge for building embeddable Mapbox MFE bundles. Named after the 10/40 window — the geographic frame most of these maps serve.

> ### 🛠️ Embedding in a parent Nuxt host? Read this first.
> This MFE is a **standalone Vite build** — not part of the parent app's module
> graph. To see your changes in the parent Nuxt app, run **`pnpm run build`** in
> this folder (it writes the bundle into the parent's `public/js/`). Running
> **`pnpm run dev` does NOT update the parent** — there is no HMR across the
> boundary. Full guide: **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

> **Built using the 1040 Maps Forge template (Apache-2.0).** Your maps are
> private, custom and uniquely yours; the shared template **library** is Apache.
> Your maps live in the `app-profiles/` folder. You share a common Apache
> template that lets you fully own your own application profiles — your own
> color strategies, API connections, and i18n.

## What it is

One repo. One library (`packages/map-core`). N bundles (one per `app-profiles/<bundle>/` folder). `npm run build` emits one IIFE per bundle into `app/`.

## Why it exists

Replaces the clone-the-template-then-edit pattern. Every map app that previously was its own MFE repo (cloning `template/src/` and drifting) gets refactored into 1040-maps **once**, then re-output as its own bundle. Edits to `SemanticTreeLegend`, `colorStrategies`, etc., happen once in `packages/map-core/` and propagate to every bundle on next build.

## Layout

```
1040-maps/
├── packages/map-core/        ← shared library: components, composables, config, utils
├── app-profiles/<bundle>/    ← bundle source folders (committed)
│   ├── index.js              ← bundle entry — imports profiles + registers web component
│   └── profiles/             ← 1..N .vue files
├── app/                      ← build outputs (gitignored)
└── vite.config.js            ← multi-entry: discovers app-profiles/<bundle>/ folders
```

## Convention: folder = bundle

A subfolder of `app-profiles/` IS a bundle. Folder name = bundle name. `npm run build` discovers them at build time, no manual entry list needed.

## Three profile patterns supported

- **Individual** — single `.vue` profile per bundle (simplest)
- **Parameterized** — one profile, behavior driven by `profile-config.tabs[]` props at runtime
- **Nested** — one profile internally rendering others via tabs (workbench-style)

A single bundle can mix all three. Recursive composition allowed.

## Quick start

```bash
npm install
npm run build      # builds every bundle in app-profiles/ → app/<name>.iife.js
npm run dev        # Vite dev server for live development
```

## Adding a new bundle

```bash
mkdir -p app-profiles/my-new-map/profiles
# create app-profiles/my-new-map/index.js (entry)
# create app-profiles/my-new-map/profiles/*.vue
npm run build
# → app/my-new-map.iife.js appears
```

## Migration plan

See `the refactor ideation` for the first refactor (doxa-simple-map-mfe → 1040-maps).

## License & provenance

The shared template **library** (`packages/map-core/`, the build tooling, and
this scaffold) is **Apache-2.0** — a permissive, reproducible base everyone
shares. Your **application profiles** under `app-profiles/<bundle>/` are
**yours**: your custom color strategies, API connections, and i18n. Building on
the shared Apache template is what lets you keep your own maps private, custom,
and uniquely yours.