# app-profiles/ — where YOUR maps live

> **Zero-context summary:** the `1040-maps` repo is a **shared Apache template**
> in `../library/` (aliased `@map`). You never edit it per-map. Instead, you make a
> folder **here**, in `app-profiles/<your-map>/`, and build *your* map by
> composing the template's building blocks. Your folder is **yours** — your
> color strategy, your API connections, your i18n. The template is **shared** —
> Apache-2.0, common to everyone, propagated to every map on the next build.

If you only remember one thing: **shared template → `app-profiles/<your-map>/` →
your custom color + API + i18n.** Read on for exactly where each piece goes.

---

## The bundle pattern (folder → bundle → profiles → script tags)

This is the whole convention in one picture:

```
app-profiles/<your-map>/        ← a FOLDER here = one JS BUNDLE named after the folder
   ├── index.js                  ← entry: registers the custom element, discovers profiles
   ├── overview.vue              ← one .vue = one APP PROFILE  (FLAT — directly in the folder)
   └── detail.vue                ← another profile in the SAME bundle

        builds to ─────────────►  ../../../public/js/<your-map>.js   (one file)
```

- **Folder name = bundle name.** `app-profiles/<your-map>/` builds to exactly one
  file, `../../../public/js/<your-map>.js`. (Folders starting with `_` or `.` are
  skipped — handy for staging WIP.)
- **Each `.vue` in the folder = one app profile.** Profiles sit **flat, directly
  in the bundle folder** — there is **no `profiles/` subfolder**. A profile is one
  map screen; one bundle can hold many. (See `template-bundle/` for a minimal
  two-profile example.)
- **Each profile is reachable from a single `<script src>` + custom element.** The
  page loads the one bundle, then picks which profile to show with the
  `profile` field in the element's `profile-config`. So every profile has a
  paste-ready embed snippet that differs only in that one field.

```html
<!-- same bundle, two profiles, chosen by `profile` -->
<script src="/js/<your-map>.js"></script>
<doxa-map profile-config='{"profile":"overview","tk":"pk.eyJ..."}'></doxa-map>
<doxa-map profile-config='{"profile":"detail","tk":"pk.eyJ..."}'></doxa-map>
```

---

## The embed template (paste-ready — just swap the bundle name)

Copy this onto any page. Change **`<your-map>`** to your folder name and
**`profile`** to one of your `.vue` filenames (without `.vue`). Nothing else
changes between maps.

```html
<!-- 1. Mapbox peer (loaded once per page, before any bundle) -->
<link  href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
<script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
<script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js"></script>

<!-- 2. Your bundle — swap <your-map> for the app-profiles folder name -->
<script src="/js/<your-map>.js"></script>

<!-- 3. The map — swap `profile` for one of your <name>.vue files (without .vue) -->
<doxa-map profile-config='{
  "profile": "<your-map>",
  "tk": "pk.eyJ...",                                  // your Mapbox token
  "dataSource": { "type": "rest-api",
                  "endpoint": "https://your-api.example/api/people-groups/list" }
}'></doxa-map>
```

- The `<script src>` URL is the only thing that changes between hosting modes:
  a **relative** path (`/js/<your-map>.js`) when the host serves the file, or an
  **absolute CDN** URL (`https://cdn.example.org/.../<your-map>.js`) when an
  external/partner site serves it. The bundle is identical either way. See
  `../CONTRIBUTING.md` for the two CDN modes.
- The same bundle can point at different data with no rebuild — `profile-config`
  is read at runtime, so swapping `dataSource` or `tk` on the page is enough.

---

## The three-step agent workflow

Adding a map is three steps, start to finish:

```bash
# ── Step 1: create the folder + at least one profile .vue ──────────────────
mkdir -p app-profiles/<your-map>
#   app-profiles/<your-map>/index.js        ← copy doxa-simple-map/index.js, rename the tag
#   app-profiles/<your-map>/<name>.vue      ← your screen (FLAT in the folder), built from @map/* blocks

# ── Step 2: build ──────────────────────────────────────────────────────────
npm run build
#   → ../../../public/js/<your-map>.js appears
#   (or, for just this one:  BUNDLE=<your-map> npm run build:bundle)

# ── Step 3: get the script tag and embed ──────────────────────────────────
#   <script src="/js/<your-map>.js"></script>
#   <doxa-map profile-config='{"profile":"<name>","tk":"pk.eyJ..."}'></doxa-map>
```

The dev staging index (`npm run dev`, served at `/`) also **auto-detects** the new
folder and shows a copy-paste embed snippet for each profile — no edit to any
index needed. See `../CONTRIBUTING.md` for the build-vs-dev distinction.

---

## The model — three zones, never mixed

```
1040-maps/
├── library/   (alias @map)   ← THE SHARED APACHE TEMPLATE — do not customize per-map
│   ├── components/        reusable map UI (legends, toolbar, buttons, drawers)
│   ├── composables/       useMapInstance, useMapData, useMapLayers, …
│   ├── colors/            the menu of ways to color pins (one strategy per file)
│   ├── config/            posterDefaults.js · posterSizes.js (map defaults: constants/mapDefaults.js)
│   ├── api/               DataSourceManager (csv | api | rest-api), sources.json, registry
│   ├── i18n/locales/      11 base languages: ar de en es fr hi it pt ro ru zh
│   ├── utils/             shared helpers
│   └── stores/            Pinia stores (map / data / ui)
│
├── internal/                  ← THE BUNDLER'S OWN BUILD SCRIPTS — never edited by map builders
│
└── app-profiles/<your-map>/   ← YOUR PRIVATE APP PROFILE — everything here is yours
    ├── index.js                bundle entry (registers the web component)
    ├── *.vue                   your map screen(s) — FLAT in the folder, one per profile
    └── data/*.json  (optional) your own bundled data
```

**Shared template (`library/`, `@map`)** is the Apache-2.0 base everyone shares. Fix a
bug or improve a legend *once* here and **every** map gets it on the next build.
Because it is shared, never bake one map's private choices into it.

**Your app profile (`app-profiles/<your-map>/`)** is the only place your map's
identity lives. Nothing here leaks to anyone else's map.

---

## Where YOUR three things go

### 1. Your color strategy
A *color strategy* decides how pins get colored (by language family, progress,
religion, …). The shared menu lives in `@map/colors/` — one
strategy per file, auto-registered by `_registry.js` (see that folder's README for the
contract).

- **Pick one** the template already ships — your profile selects it by color
  mode (e.g. `getColorStrategy('language-family')`).
- **Add your own** — drop `my-strategy.js` into your own
  `app-profiles/<your-map>/src/colors/` folder following the strategy
  contract (start from `template-bundle/src/colors/example-mode.js`). It
  merges over the shared set for **your map only** — never edit `@map/colors/`
  to recolor your own map.

### 2. Your API connections
Your map gets its data through the **`profile-config`** attribute on the host
page — so the *same* bundle can point at different data without a rebuild (see the
embed template above). Inside your `.vue` profile you read it via
`inject('profileConfig')`, `inject('mapboxToken')`, `inject('dataSource')`, and
hand the source to `@map/api/DataSourceManager`, which supports three
shapes:

| `type` | What | Source |
|---|---|---|
| `csv` | a local CSV parsed at load | a file you bundle under your own `data/` |
| `api` | a single JSON URL | any plain JSON endpoint |
| `rest-api` | a versioned REST endpoint (the default) | a live REST API, base URL resolved at runtime |

Prefer the **real API** — do not inline JSON into the bundle. If you must ship
static data, put it in **your** `app-profiles/<your-map>/data/*.json`.

### 3. Your i18n
The template ships 11 base locales in `@map/i18n/locales/`. Your profile uses
`useI18n()` (from `vue-i18n`) for translated strings and `RTL_LOCALES`
(from `@map/i18n`) for right-to-left handling. Add or override strings for your
map from your own profile — the shared locales stay shared.

---

## Build conventions (how a folder becomes a bundle)

- **Folder name = bundle name** → builds to `../../../public/js/<folder-name>.js`.
- Folders prefixed with `_` or `.` are **skipped** at build time (use for staging).
- Each folder MUST have an `index.js` entry that:
  - evaluates `import.meta.glob('./*.vue')` locally (bundle-private registry —
    profiles are **flat** in the folder, so the glob is `./*.vue`, not
    `./profiles/*.vue`) and hands it to `ProfileLoader` via
    `app.provide('profileModules', …)`,
  - registers the web component(s) via `defineCustomElement`,
  - lets `ProfileLoader` parse the host's `profile-config`.

The `profile` field in `profile-config` MUST match a `.vue` file sitting directly
in your bundle folder (the design is flat — no `profiles/` subfolder). See
`doxa-simple-map/index.js` for a complete, commented example, or
`template-bundle/` for a minimal two-profile skeleton.

## Three profile patterns (mix freely)

- **Individual** — one `.vue` profile per bundle (simplest).
- **Parameterized** — one profile, behavior driven by `profile-config` props at
  runtime (e.g. `tabs[]`).
- **Nested** — one profile that internally renders others (workbench-style, like
  `doxa-research-map`).

## License & provenance

The shared template (`library/` / `@map`, build tooling, this scaffold) is
**Apache-2.0** — a permissive base everyone shares. Your **app profiles** under
`app-profiles/<your-map>/` are **yours**: your color strategy, API connections,
and i18n. Building on the shared Apache template is exactly what lets you keep
your own maps private, custom, and uniquely yours.

## See also — the shared `library/` (`@map`) components you build from

- `../library/components/` — reusable map UI: legends, toolbars, buttons, drawers
- `../library/composables/` — `useMapInstance`, `useMapData`, `useMapLayers`, …
- `../library/colors/README.md` — the color-strategy contract
- `../library/api/` — `DataSourceManager` + the source registry
- `../library/i18n/` — base locales and RTL handling
- `../library/ProfileLoader.vue` — parses `profile-config`, mounts the right profile
- `../README.md` — repo overview & build pipeline
- `../CONTRIBUTING.md` — build vs dev, the two CDN modes, partner-site embedding
- `doxa-simple-map/index.js` — fully commented reference bundle entry
