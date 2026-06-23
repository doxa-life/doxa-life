# app-profiles/ — where YOUR maps live

> **Zero-context summary:** the `1040-maps` repo is a **shared Apache template**
> in `../src/` (aliased `@map`). You never edit it per-map. Instead, you make a
> folder **here**, in `app-profiles/<your-map>/`, and build *your* map by
> composing the template's building blocks. Your folder is **yours** — your
> color strategy, your API connections, your i18n. The template is **shared** —
> Apache-2.0, common to everyone, propagated to every map on the next build.

If you only remember one thing: **shared template → `app-profiles/<your-map>/` →
your custom color + API + i18n.** Read on for exactly where each piece goes.

---

## The model — two halves, never mixed

```
1040-maps/
├── src/   (alias @map)   ← THE SHARED APACHE TEMPLATE — do not customize per-map
│   ├── components/        reusable map UI (legends, toolbar, buttons, drawers)
│   ├── composables/       useMapInstance, useMapData, useMapLayers, …
│   ├── config/
│   │   ├── color-strategies/   the menu of ways to color pins (pick or extend)
│   │   ├── colors.js · colorStrategies.js · mapConfig.js · prayerColors.js
│   ├── i18n/locales/      11 base languages: ar de en es fr hi it pt ro ru zh
│   ├── utils/             DataSourceManager (csv | api | rest-api), helpers
│   └── stores/            Pinia stores (map / data / ui)
│
└── app-profiles/<your-map>/   ← YOUR PRIVATE APP PROFILE — everything here is yours
    ├── index.js                bundle entry (registers the web component)
    ├── profiles/*.vue          your map screen(s), built from @map blocks
    └── data/*.json  (optional) your own bundled data
```

**Shared template (`src/`, `@map`)** is the Apache-2.0 base everyone shares. Fix a
bug or improve a legend *once* here and **every** map gets it on the next build.
Because it is shared, never bake one map's private choices into it.

**Your app profile (`app-profiles/<your-map>/`)** is the only place your map's
identity lives. Nothing here leaks to anyone else's map.

---

## Where YOUR three things go

### 1. Your color strategy
A *color strategy* decides how pins get colored (by language family, prayer
progress, religion, …). The shared menu lives in
`@map/config/color-strategies/` — one strategy per file, registered in
`_registry.js` (see that folder's README for the contract).

- **Pick one** the template already ships — your profile selects it by color
  mode (e.g. `getColorStrategy('language-family')`).
- **Add your own** — drop `my-strategy.js` into `@map/config/color-strategies/`
  following the strategy contract, then select it from your profile. (It lives in
  the shared folder so the build can see it, but it is *your* strategy to author.)

### 2. Your API connections
Your map gets its data through the **`profile-config`** attribute on the host
page — so the *same* bundle can point at different data without a rebuild:

```html
<script src="/app/your-map.iife.js"></script>
<your-map profile-config='{
  "profile": "your-map",
  "tk": "pk.eyJ...",                         // your Mapbox token
  "dataSource": { "type": "rest-api",
                  "endpoint": "https://your-api/api/people-groups/list" }
}'></your-map>
```

Inside your `.vue` profile you read it via `inject('profileConfig')`,
`inject('mapboxToken')`, `inject('dataSource')`, and hand the source to
`@map/utils/DataSourceManager` which supports three shapes:
`csv` (local file) · `api` (single JSON URL) · `rest-api` (pray-tools REST shape).
Prefer the **real API** — do not inline JSON into the bundle. If you must ship
static data, put it in **your** `app-profiles/<your-map>/data/*.json`.

### 3. Your i18n
The template ships 11 base locales in `@map/i18n/locales/`. Your profile uses
`useI18n()` (from `vue-i18n`) for translated strings and `RTL_LOCALES`
(from `@map/i18n`) for right-to-left handling. Add or override strings for your
map from your own profile — the shared locales stay shared.

---

## Build conventions (how a folder becomes a bundle)

- **Folder name = bundle name** → builds to `app/<folder-name>.iife.js`.
- Folders prefixed with `_` or `.` are **skipped** at build time (use for staging).
- Each folder MUST have an `index.js` entry that:
  - evaluates `import.meta.glob('./profiles/*.vue')` locally (bundle-private
    registry) and hands it to `ProfileLoader` via `app.provide('profileModules', …)`,
  - registers the web component(s) via `defineCustomElement`,
  - lets `ProfileLoader` parse the host's `profile-config`.

The `profile` field in `profile-config` MUST match a file in your `profiles/`
folder. See `doxa-simple-map/index.js` for a complete, commented example.

## Three profile patterns (mix freely)

- **Individual** — one `.vue` profile per bundle (simplest).
- **Parameterized** — one profile, behavior driven by `profile-config` props at
  runtime (e.g. `tabs[]`).
- **Nested** — one profile that internally renders others (workbench-style, like
  `doxa-research-map`).

## Quick start — add your map

```bash
mkdir -p app-profiles/my-new-map/profiles
# 1. app-profiles/my-new-map/index.js          ← copy doxa-simple-map/index.js, rename the tag
# 2. app-profiles/my-new-map/profiles/*.vue     ← build your screen from @map/* blocks
# 3. (optional) app-profiles/my-new-map/data/*.json
npm run build      # → app/my-new-map.iife.js appears
```

## License & provenance

The shared template (`src/` / `@map`, build tooling, this scaffold) is
**Apache-2.0** — a permissive base everyone shares. Your **app profiles** under
`app-profiles/<your-map>/` are **yours**: your color strategy, API connections,
and i18n. Building on the shared Apache template is exactly what lets you keep
your own maps private, custom, and uniquely yours.

## See also

- `../README.md` — repo overview & build pipeline
- `@map/config/color-strategies/README.md` — the color-strategy contract
- `doxa-simple-map/index.js` — fully commented reference bundle entry
