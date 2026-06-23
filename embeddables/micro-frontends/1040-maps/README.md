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

One repo. One shared library (`src/`). N bundles (one per `app-profiles/<bundle>/` folder). `npm run build` emits one IIFE per bundle into `../../../public/js/` (the parent host's static dir).

## Why it exists

Replaces the clone-the-template-then-edit pattern. Every map app that previously was its own MFE repo (cloning `template/src/` and drifting) gets refactored into 1040-maps **once**, then re-output as its own bundle. Edits to `SemanticTreeLegend`, `colorStrategies`, etc., happen once in `src/` and propagate to every bundle on next build.

## Layout

```
1040-maps/
├── src/                      ← shared library: components, composables, config, utils, i18n
├── app-profiles/<bundle>/    ← bundle source folders (committed)
│   ├── index.html            ← that bundle's own Vite dev page
│   ├── index.js              ← bundle entry — imports profiles + registers web component
│   └── profiles/             ← 1..N .vue files
├── index.html                ← auto-detecting staging index (dev only; lists every bundle,
│                                no hardcoded list — see "Staging / dev index" below)
├── ../../../public/js/       ← build outputs (one <bundle>.js per profile; in the parent host)
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
npm run build      # builds every bundle in app-profiles/ → ../../../public/js/<name>.js
npm run dev        # Vite dev server; open / for the auto-detecting staging index (index.html)
```

## Adding a new bundle

```bash
mkdir -p app-profiles/my-new-map/profiles
# create app-profiles/my-new-map/index.js (entry)
# create app-profiles/my-new-map/profiles/*.vue
npm run build
# → ../../../public/js/my-new-map.js appears
# (the new folder also auto-shows on the dev staging index — no edit to index.html needed)
```

## Staging / dev index

`index.html` (served at `/` by `npm run dev`) is an **auto-detecting** staging page: it
discovers every `app-profiles/*/` folder and each `profiles/*.vue` at dev time via Vite's
`import.meta.glob` (logic in `src/staging.js`), renders one card per bundle with a copy-paste
embed snippet and a lazy live `<iframe>`, and hot-updates when you add a folder or a `.vue` —
**no hardcoded list, no build step**. Adding a bundle needs zero edits here.

## Migration plan

The first refactor folded `doxa-simple-map-mfe` into 1040-maps. See **[CONTRIBUTING.md](./CONTRIBUTING.md)**
for the per-bundle authoring guide and `_reverse-engineering/` for the source-template analysis.

## License & provenance

The shared template **library** (`src/`, the build tooling, and
this scaffold) is **Apache-2.0** — a permissive, reproducible base everyone
shares. Your **application profiles** under `app-profiles/<bundle>/` are
**yours**: your custom color strategies, API connections, and i18n. Building on
the shared Apache template is what lets you keep your own maps private, custom,
and uniquely yours.