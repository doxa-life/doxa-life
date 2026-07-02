# 1040-maps

A Vite-powered monorepo + map forge for building embeddable Mapbox MFE bundles. Named after the 10/40 window — the geographic frame most of these maps serve.

> ### ✨ New here, and you don't write code?
> You can build real, embeddable maps by **describing them to an AI coding agent** — no
> programming required. Start with the friendly, zero-jargon guide:
> **[docs/BUILD-A-MAP.md](./docs/BUILD-A-MAP.md)**.

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
├── src/                      ← shared library (@map): components (incl. components/dashboards/,
│                                components/map-controls/, components/poster/), composables, config
│                                (incl. config/color-strategies/), api-connections, stores, utils,
│                                i18n, data
├── app-profiles/<bundle>/    ← bundle source folders (committed)
│   ├── index.html            ← that bundle's own Vite dev page
│   ├── index.js              ← bundle entry — globs ./*.vue + registers the web component
│   └── <profile>.vue         ← 1..N FLAT .vue files, DIRECTLY in the folder (NO profiles/ subdir;
│                                the entry globs './*.vue', so a profiles/ subfolder is NOT found)
├── index.html                ← auto-detecting staging index (dev only; lists every bundle,
│                                no hardcoded list — see "Staging / dev index" below)
├── ../../../public/js/       ← build outputs (one <bundle>.js per folder; in the parent host)
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

## Build a map (add a bundle)

```bash
mkdir -p app-profiles/my-new-map
# create app-profiles/my-new-map/index.js        (entry — copy template-bundle/index.js, rename the tag)
# create app-profiles/my-new-map/index.html      (Vite needs it — copy template-bundle/index.html)
# create app-profiles/my-new-map/my-new-map.vue  (FLAT in the folder; filename = profile name)
npm run build
# → ../../../public/js/my-new-map.js appears
# (the new folder also auto-shows on the dev staging index — no edit to index.html needed)
```

Profiles are **flat**: the `.vue` files sit **directly** in `app-profiles/my-new-map/`,
never in a `profiles/` subfolder. The entry globs `import.meta.glob('./*.vue')`, so a
`profiles/` subdirectory is **not** discovered. Filename (without `.vue`) = the profile
name you pass in `profile-config`. Drop several `.vue` files in one folder to ship several
maps in one bundle, picked at runtime by the `profile` field.

### The 3 customization seams

Everything else is shared. Your map is yours via exactly three seams — pick one or add your
own; never fork `src/` per map:

- **Color strategies** — `src/config/color-strategies/` (one file per strategy, registered in
  `_registry.js`): how pins/regions are colored.
- **API connections** — `src/api-connections/` + the declaration in `src/config/sources.json`
  (and `fieldMappings`): where data comes from. Components stay source-agnostic.
- **i18n** — `src/i18n/`: translated strings via `useI18n()`, RTL via `RTL_LOCALES`. Override
  strings from your profile.

Library-vs-profile rule: reusable across 2+ profiles → it lives in `src/` (`@map`); unique to
one map → it lives in that map's `app-profiles/<bundle>/` folder.

## Build a dashboard

A dashboard is just an app-profile too — one that **composes the shared dashboard blocks** in
`src/components/dashboards/` (`@map/components/dashboards`) instead of writing panels by hand.
The map-as-hero grid, facet rail, KPI strip, charts, virtualized table, CSV export, and
brushing-and-linking selection bus all live in the library once. A new dashboard is a thin
profile that passes a **config object** (facets, columns, charts, KPIs, data source), not a
copy of those panels:

1. Create `app-profiles/<your-dashboard>/` with `index.js` (`defineCustomElement` + your tag)
   and `index.html`.
2. Write `dashboard.config.js` — identity, `data.source`, `facets`, `facetRail`, `kpis`,
   `columns`, `charts`, `detail`, `search`.
3. Write `<your-dashboard>.vue` (~35 lines): import panels from `@map/components/dashboards`,
   call `useDashboardShell(config)`, drop the panels into your grid areas.

Full guide and config shape: **[src/components/dashboards/README.md](./src/components/dashboards/README.md)**.

## Embed

A built bundle is just a `<script src>` plus a custom element. Load the Mapbox peer first,
then the bundle, then the element. The `profile` field selects which `.vue` to mount.

```html
<!-- Mapbox peer (once per page, before the bundle) -->
<link  href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
<script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
<script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js"></script>

<!-- Your bundle (relative path = host serves it; absolute https = external/CDN) -->
<script src="/js/my-new-map.js"></script>

<!-- The map. `profile` = your .vue filename without .vue. `tk` = your Mapbox token. -->
<doxa-map profile-config='{"profile":"my-new-map","tk":"pk.eyJ..."}'></doxa-map>
```

`profile-config` is read at **runtime**, so the **same** bundle can re-point at different
data / colors with **no rebuild** — just change the JSON on the page. `src/ProfileLoader.vue`
reads it, looks up `./<profile>.vue` in the bundle's glob registry, mounts it, and provides
`profileConfig` / `mapboxToken` / `dataSource` / the Pinia stores via `inject()`.

See **[docs/NO-REBUILD-ARCHITECTURE.md](./docs/NO-REBUILD-ARCHITECTURE.md)** and
**[docs/EMBED-CONTRACT-shell-wiring.md](./docs/EMBED-CONTRACT-shell-wiring.md)** for the full
no-rebuild + embed-contract details.

## Staging / dev index

`index.html` (served at `/` by `npm run dev`) is an **auto-detecting** staging page: it
discovers every `app-profiles/*/` folder and each flat `*.vue` profile at dev time via Vite's
`import.meta.glob` (logic in `src/staging.js`), renders one card per bundle with a copy-paste
embed snippet and a lazy live `<iframe>`, and hot-updates when you add a folder or a `.vue` —
**no hardcoded list, no build step**. Adding a bundle needs zero edits here.

## Migration plan

The first refactor folded `doxa-simple-map-mfe` into 1040-maps. See **[CONTRIBUTING.md](./CONTRIBUTING.md)**
for the per-bundle authoring guide and `_reverse-engineering/` for the source-template analysis.

## License

The shared template **library** (`src/`, the build tooling, and
this scaffold) is **Apache-2.0** — a permissive, reproducible base everyone
shares. Your **application profiles** under `app-profiles/<bundle>/` are
**yours**: your custom color strategies, API connections, and i18n. Building on
the shared Apache template is what lets you keep your own maps private, custom,
and uniquely yours.

Full license text: **[LICENSE](./LICENSE)** (Apache License 2.0).