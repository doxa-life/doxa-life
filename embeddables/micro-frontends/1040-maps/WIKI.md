# 1040-maps WIKI — the app-profile bundle system

> **Goal of this page:** a new developer or agent can read this once and add a
> working map app-profile in ~30 minutes without asking anyone a question.
>
> **Read order if you're brand new:** §1 (mental model) → §3 (add a profile,
> step by step) → §6 (build & where output goes) → §7 (embed in Nuxt). The rest
> is reference.

`1040-maps` is a **Vite "map forge":** *one shared library, N independent
embeddable bundles.* Each bundle is a single self-contained `.js` file that
registers a custom HTML element (`<doxa-map>`, `<doxa-research-map>`, …) you can
drop onto any web page — including a Nuxt page in the parent `doxa-life` host.

---

## 1. What is an app-profile?

An **app-profile is one map application** — your map, with your screens, your
colors, your data source, your translations. It is a **folder** under
`app-profiles/`:

```
app-profiles/doxa-simple-map/   ← this folder IS one app-profile = one bundle
```

The whole repo is split into **two halves that are never mixed:**

| Half | Path | Alias | License | You edit it… |
|---|---|---|---|---|
| **Shared template library** | `src/` | `@map` | Apache-2.0 | …once; the fix reaches every bundle on next build |
| **Your app-profile** | `app-profiles/<name>/` | — | yours | …freely; nothing here leaks to other maps |

The shared library (`src/`, imported everywhere as `@map`) holds the reusable
map machinery: components (legends, toolbar, drawers), composables
(`useMapInstance`, `useMapData`, `useMapLayers`, …), config (color strategies,
colors, zoom), i18n (11 base locales), Pinia stores, and utils. **Never bake one
map's private choices into `src/`** — it is common to everyone.

Your app-profile folder is the *only* place your map's identity lives: its
`index.js` entry, its `*.vue` screen(s) sitting **flat in the folder**, and
optionally its own `data/*.json`.

> **Terminology note:** the word "profile" is used at two levels.
> 1. A **bundle / app-profile** = a folder under `app-profiles/`.
> 2. A **profile screen** = one `.vue` file sitting **directly** in that folder
>    (flat — there is **no** `profiles/` subfolder; the entry globs `./*.vue`).
> A bundle can contain several profile screens; the host picks which screen to
> render with the `profile` field of the `profile-config` attribute (see §4).

### The three profile patterns (mix freely in one bundle)

- **Individual** — one `.vue` profile screen per bundle. Simplest. (`doxa-simple-map`)
- **Parameterized** — one profile screen whose behavior is driven by
  `profile-config` props at runtime (e.g. a `tabs[]` array). Same bundle points
  at different data/colors with no rebuild.
- **Nested** — one profile screen that internally renders others via tabs
  (researcher's-workbench style). (`doxa-research-map` — 7 baked-in tabs.)

---

## 2. Directory tree

```
1040-maps/
├── src/                          ← SHARED TEMPLATE LIBRARY (alias @map, Apache-2.0)
│   ├── index.js                  ← thin barrel; prefer subpath imports for tree-shaking
│   ├── ProfileLoader.vue         ← the ONE component that reads profile-config & loads a screen
│   ├── components/               ← map UI: legends, map-controls/, poster/, drawers, detail panels
│   │   └── SemanticTreeLegend.vue  ← hierarchical one-to-many legend (see §5)
│   ├── composables/              ← useMapInstance, useMapData, useMapLayers, useMapFly, …
│   ├── config/                   ← colors.js, colorStrategies.js, mapConfig.js, zoom.js
│   │   └── color-strategies/     ← one strategy per file, registered in _registry.js
│   ├── i18n/locales/             ← 11 base locales: ar de en es fr hi it pt ro ru zh
│   ├── stores/                   ← Pinia: dataStore, mapStore, uiStore (per-instance)
│   └── utils/                    ← DataSourceManager (csv | api | rest-api), helpers
│
├── app-profiles/                 ← ALL the bundles live here (each subfolder = 1 bundle)
│   ├── doxa-simple-map/          ← example bundle (parameterized pattern)
│   │   ├── index.js              ← bundle ENTRY — registers the web component(s)
│   │   ├── index.html            ← Vite html entry = the dev STAGING page
│   │   └── doxa-simple-map.vue   ← the profile screen (FLAT — no profiles/ subfolder)
│   ├── doxa-research-map/        ← nested pattern (7-tab workbench)
│   ├── my-upg-100-list/          ← bundle with its own data/*.json
│   ├── README.md                 ← deeper "where your 3 things go" guide
│   └── _staging/  .anything/     ← folders starting with _ or . are SKIPPED by the build
│
├── app/                          ← legacy/local build-output mirror (gitignored)
├── vite.config.js                ← multi-entry: discovers app-profiles/<name>/ folders
├── package.json                  ← the build/dev scripts
├── README.md  CONTRIBUTING.md    ← repo overview + the "build not dev" embedding rule
└── .env / .env.example           ← VITE_MAPBOX_TOKEN (dev only; never baked into a bundle)
```

> **Reality check vs. the README:** `README.md` aspirationally calls the shared
> library `packages/map-core/`. The code as it actually stands today ships it as
> **`src/`**, aliased **`@map`** in `vite.config.js`. Import from `@map/...`.

---

## 3. How to add a new app-profile (step by step, ~30 min)

The fastest path is **copy the `doxa-simple-map` bundle and rename it.**

### Step 1 — make the folder

```bash
cd embeddables/micro-frontends/1040-maps
mkdir -p app-profiles/my-new-map      # profiles are FLAT — no profiles/ subfolder
```

The folder name `my-new-map` **becomes the bundle name** and the output file
name (`my-new-map.js`). Don't prefix it with `_` or `.` — those are skipped by
the build.

### Step 2 — create the bundle entry `index.js`

Copy `app-profiles/doxa-simple-map/index.js` and change the custom-element tag
name(s). The entry MUST do three things (see the annotated original for the
full version):

```js
import { defineCustomElement } from 'vue'
import { createPinia } from 'pinia'
import ProfileLoader from '@map/ProfileLoader.vue'
import { createAppI18n } from '@map/i18n/index.js'

// (1) Evaluate import.meta.glob LOCALLY — it must run in the bundle that owns
//     the .vue screens; ProfileLoader (in @map) cannot reach across.
//     Profiles are FLAT in the bundle folder, so the glob is './*.vue'.
const profileModules = import.meta.glob('./*.vue')

function buildElement() {
  return defineCustomElement(ProfileLoader, {
    configureApp(app) {
      app.use(createPinia())          // per-instance Pinia (isolation)
      app.use(createAppI18n())        // per-instance i18n
      // (2) Hand the bundle-private registry to ProfileLoader.
      app.provide('profileModules', profileModules)
    }
  })
}

// (3) Register your custom element tag(s). Guard against double-registration.
if (typeof customElements !== 'undefined' && !customElements.get('my-new-map')) {
  customElements.define('my-new-map', buildElement())
}

export default buildElement()
```

**Why each step matters:**
- `import.meta.glob('./*.vue')` is resolved by Vite **at build time,
  relative to this file**, so it captures *only this bundle's* flat screens. That glob
  is then `app.provide('profileModules', …)`-ed because `ProfileLoader` lives in
  `@map` and cannot glob across the package boundary.
- Each `defineCustomElement` call yields its own class; give each tag name its
  own class. Per-instance Pinia + i18n keeps two embeds on the same page from
  cross-talking.

### Step 3 — create the staging page `index.html`

Copy `app-profiles/doxa-simple-map/index.html`. This file is **both** the Vite
dev staging page (what you see at the dev URL) **and** the html entry Vite needs
to discover the bundle. At minimum it must end with:

```html
<script type="module" src="./index.js"></script>
```

The provided template also includes the Mapbox GL `<script>`/`<link>` tags and a
`DOXA_SLOTS` array you edit to preview your screens. The Mapbox token is injected
from `.env` via `%VITE_MAPBOX_TOKEN%`.

### Step 4 — write your profile screen `my-new-map.vue` (flat in the bundle folder)

Build it from `@map` blocks. The **filename (without `.vue`) is the screen name**
the host requests via `profile-config.profile`. Read host inputs with `inject`:

```vue
<script setup>
import { inject } from 'vue'
import { useMapInstance } from '@map/composables/useMapInstance.js'
import SemanticTreeLegend from '@map/components/SemanticTreeLegend.vue'

const mapboxToken   = inject('mapboxToken')    // from profile-config.tk
const dataSource    = inject('dataSource')     // from profile-config.dataSource
const profileConfig = inject('profileConfig')  // the whole parsed object
const instanceId    = inject('instanceId')     // event-isolation scope
// …compose the map from @map composables/components…
</script>
```

`ProfileLoader` provides these (and the instance-scoped Pinia stores `uiStore` /
`mapStore` / `dataStore`) — never prop-drill, never call `useXxxStore()`
directly in a child (it would cross-bleed between embeds).

### Step 5 — build

```bash
BUNDLE=my-new-map npm run build:bundle   # builds just yours → public/js/my-new-map.js
# or: npm run build                       # loops & builds every bundle
```

`app/my-new-map.js` / `public/js/my-new-map.js` appears. You're done — embed it
(§7).

> **Checklist for "Vite didn't discover my bundle":** the folder needs BOTH
> `index.html` AND `index.js`, and must not start with `_` or `.`.

---

## 4. The runtime contract: `profile-config`

A bundle exposes ONE attribute: `profile-config`, a **JSON string**. It is the
entire wiring between the host page and the map. `ProfileLoader.vue` parses it:

```html
<doxa-map profile-config='{
  "profile":   "doxa-simple-map",        // which flat .vue screen in the bundle to render (required)
  "tk":        "pk.eyJ...",              // Mapbox token (required; provided by host, never baked)
  "instanceId":"my-map",                 // optional; isolates window events between embeds
  "dataSource":"pray-tools",             // or { "type":"rest-api","endpoint":"https://…" }
  "colorSet":  "default",
  "tabs":      [ /* parameterized screens read this */ ]
}'></doxa-map>
```

- `profile` **must** match a flat `.vue` filename in this bundle's folder. Mismatch →
  ProfileLoader renders a yellow "Profile not found" error box listing available
  names.
- `tk` is supplied by the host page at runtime so the **token is never compiled
  into the bundle**. (Dev uses `.env`'s `VITE_MAPBOX_TOKEN`.)
- `instanceId` scopes cross-instance window events so multiple `<doxa-map>`
  elements on one page never interfere.
- `dataSource` is handed to `@map/utils/DataSourceManager`, which supports three
  shapes: `csv` (local file) · `api` (single JSON URL) · `rest-api` (pray-tools
  REST shape). Prefer the real API; only ship static JSON in your own
  `app-profiles/<name>/data/`.

---

## 5. How the Semantic Tree Legend works

`@map/components/SemanticTreeLegend.vue` is a **reusable hierarchical legend for
any one-to-many semantic tree** (e.g. Affinity Block → People Cluster → People
Group, or Language Family → Language). It is a direct clone of the upstream PPLR
legend module with the styling routed through `useShadowStyles()` so the CSS
lands inside the custom element's shadow root.

**You feed it a tree of nodes; it renders generation tabs + rows.** Node shape:

```js
{ id, label, color?, count?, pop?, filter?, info?, children?: [ /* TreeNode */ ] }
```

Key props:

| Prop | Meaning |
|---|---|
| `nodes` | the tree (array of root `TreeNode`s) |
| `tabs` | optional labels per generation; auto-generated from tree depth if omitted |
| `columns` | which numeric columns to show, default `['count','pop']` |
| `title` | panel heading |
| `hideTabs` | render a single flat level |
| `exportEnabled` | opt-in flag that reveals the (scaffold) Export affordance |

How it behaves:
- It computes **tree depth** and renders **one tab per generation** (Gen 1, Gen
  2, …). Each tab shows the nodes at that depth via `collectAtDepth`.
- Selecting a node walks the tree (`findAncestorChain`,
  `collectAllDescendantIds`) so the legend can highlight a node together with its
  ancestors and descendants, and emit a `select` event the map listens to for
  filtering.
- **Standalone vs. mediated:** if a per-instance store is provided (via
  `usePplrInstance` → `useInstance()`), the legend syncs `activeTab` and
  `selection` through that shared store (Mediator Pattern) so the map, geocoder,
  and legend stay in lock-step. With no instance it falls back to local
  `ref`-based state and still works on its own.
- It is **decoupled from the map and geocoder** — it never imports them. The
  profile screen wires the legend's `select` emission to map filtering.

To use it in a profile screen: build your `nodes` array (often from a
`useXxxLegendData` composable in `@map/composables/`), pass it in, and react to
`@select`.

---

## 6. The build step — what it does, where output goes

### Scripts (`package.json`)

```jsonc
"dev":          "vite",                     // dev server, all bundles at their html paths
"build":        "npm run clean && for d in app-profiles/*/; do BUNDLE=$(basename \"$d\") vite build || exit 1; done",
"build:bundle": "vite build",               // builds ONE bundle (needs BUNDLE=<name>)
"build:watch":  "vite build --watch",
"clean":        "mkdir -p ../../../public/js"
```

### What a build does

`vite.config.js` is **multi-entry by discovery**: at build time it scans
`app-profiles/`, and for every subfolder that (a) doesn't start with `_`/`.` and
(b) has **both** `index.html` and `index.js`, it registers a bundle named after
the folder.

A single `vite build` invocation builds **exactly one** bundle, selected by the
`BUNDLE=<name>` env var — that's what lets the output be a self-contained
**IIFE** (`inlineDynamicImports: true`). `npm run build` simply loops over every
`app-profiles/*/` folder, running one `vite build` per bundle. If you run a bare
`vite build` with no `BUNDLE`, the config throws and lists the available names.

Each bundle **only bundles what its profile screens import** — different bundles
have different sizes (simple ≈ 420 KB, research ≈ 1.3 MB).

### Where output goes

```js
build: {
  outDir: resolve(__dirname, '../../../public/js'),  // → <parent-app>/public/js/
  emptyOutDir: false,                                // never wipes sibling bundles
  cssCodeSplit: false,                               // CSS injected by JS (single file)
  assetsDir: '',                                     // flat output, no assets/ subfolder
}
```

- Output dir is `../../../public/js`, which resolves to the **parent Nuxt host's
  `public/js/`** (`…/doxa-life/public/js/`) — a folder the host already serves
  statically. No copy step or symlink needed; the build writes straight to where
  the host reads.
- `emptyOutDir: false` means rebuilding one bundle leaves the others intact.
- One folder → exactly one file: `public/js/<bundle>.js`. CSS is injected by JS
  (via `vite-plugin-css-injected-by-js`), so there is no separate `.css` to load.

Confirmed live outputs today: `public/js/doxa-simple-map.js`,
`doxa-research-map.js`, `my-upg-100-list.js`.

### The dev / staging URL

```bash
npm run dev    # Vite dev server (default http://localhost:5173)
```

In dev, Vite serves **all** bundles at their html-entry paths, with HMR:

```
http://localhost:5173/app-profiles/doxa-simple-map/index.html
http://localhost:5173/app-profiles/doxa-research-map/index.html
http://localhost:5173/app-profiles/<your-map>/index.html
```

These staging pages render your screens inside "gem-frame" preview slots driven
by the `DOXA_SLOTS` array in each `index.html`.

> **The one rule that surprises everyone (from CONTRIBUTING.md):** `npm run dev`
> **does NOT update the parent Nuxt app** — there is no HMR across the boundary.
> The parent only ever loads the **built** static file in `public/js/`. To see a
> change in the parent app you must **`npm run build`** (or `build:bundle`), then
> refresh the parent page. `dev` is for iterating on a map *in isolation*.

---

## 7. Embedding a bundle in a Nuxt page (the `doxa-life` host)

The host loads the IIFE as a static script, then renders the custom element. The
`doxa-life` host wraps both steps in a composable + a slot component.

> **Where to see a built bundle live:** the parent `doxa-life` Nuxt host runs its
> dev server on **`http://localhost:3033/`** (`nuxt.config.ts` → `port: 3033`).
> After `pnpm run build`, refresh the relevant page there to see your change.
> (That is distinct from this MFE's own isolated staging server on `:5173` — see §6.)

**Loader composable** — `app/composables/useDoxaMap.ts` — injects the Mapbox CSS
via `useHead`, then in `onMounted` loads, **in order**, `mapbox-gl.js` →
`mapbox-gl-geocoder.js` → the bundle (`/js/<bundle>.js`). Order matters: the
custom element's `connectedCallback` calls `new mapboxgl.Map(...)`, so
`window.mapboxgl` must exist first. It also sets `window.MAP_APP_API_URL` from
runtime config before the IIFE loads, so the map fetches from the configured
prayer API instead of the baked-in fallback.

**Slot component** — `app/components/DoxaMapSlot.vue` — picks the tag name per
bundle and renders it:

```vue
<!-- on a Nuxt page -->
<DoxaMapSlot map-id="pray-map" :profile-config="prayMapConfig" class="rounded-md" />

<!-- research page loads the other bundle -->
<DoxaMapSlot map-id="research-map" bundle="research-map" :profile-config="researchConfig" />
```

```ts
// inside DoxaMapSlot.vue
useDoxaMap(props.bundle)   // 'simple-map' (default) | 'research-map'
const tagName = props.bundle === 'research-map' ? 'doxa-research-map' : 'doxa-map'
// <component :is="tagName" :id="mapId" :profile-config="profileConfig" />
```

`profileConfig` is just the JSON string from §4. `BUNDLES` in the composable maps
a bundle key → its `/js/*.js` URL.

> **One-element-per-tag rule:** `customElements.define()` is one-shot per tag
> name and cannot be overwritten once a page registers it. That's why each
> bundle registers a **distinct** tag (`doxa-map` vs `doxa-research-map`) — so a
> single-page-app can navigate between pages that use different bundles without a
> stale registration causing a "Profile not found" error.

**Minimal embed without the host helpers** (any plain page):

```html
<script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
<script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js"></script>
<link  href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
<script src="/js/doxa-simple-map.js"></script>
<doxa-map profile-config='{"profile":"doxa-simple-map","tk":"pk.eyJ..."}'></doxa-map>
```

---

## 8. Data sources

Maps read their data through `@map/api-connections/` (the engine) driven by
`@map/config/sources.json` (the declaration). `sources.json` lists every
connection keyed by id, picks one `activeSource`, and maps each source's raw
field names onto the system field names components expect (`fieldMappings`).
`DataSourceManager.js` is the engine: **fetch → normalize → cache**; the registry
front door is `api-connections/_registry.js`. Three connection types are supported:

| Type | What | Where it points |
|---|---|---|
| `rest-api` | versioned REST endpoint (the default) | **pray-tools** — `pray.doxa.life` live API for people-group prayer / engagement / adoption counts. Base URL resolved at runtime from `window.MAP_APP_API_URL` → `VITE_API_BASE_URL` → `''` (see `api-connections/apiBaseUrl.js`), so the host sets it with no rebuild. |
| `csv` | a local CSV parsed at load | **Joshua Project** people-groups dataset (`assets/data/Joshua-project-ids-*.csv`); JP also provides the people-group photo fallback URLs. |
| `api` | a single JSON URL | any plain JSON endpoint. |

**Country / region polygons** are *not* a `sources.json` connection. The
countries/regions maps render boundaries from Mapbox's built-in
**`country-boundaries-v1`** tileset (highlighted by `iso_3166_1_alpha_3`), plus a
local WAGF-regions GeoJSON (`doxa-regions-with-geo.json`, lazy-loaded on the
Regions tab). *(Historical note: `geoBoundaries` ADM0 was an early candidate for
this and was superseded — don't reintroduce it without re-deciding.)*

**Add or change a source:** edit `src/config/sources.json` (declaration only) and,
if it needs new field names, extend its `fieldMappings` — components stay
source-agnostic. See `src/api-connections/README.md` for the full contract. Prefer
the live API; only ship static JSON inside your own `app-profiles/<name>/data/`.

---

## 9. Quick reference

| I want to… | Do this |
|---|---|
| Add a new map | copy `app-profiles/doxa-simple-map/` → rename folder + tag in `index.js` (§3) |
| Add a screen to an existing bundle | drop a `.vue` flat in that bundle's folder, request it via `profile-config.profile` |
| Fix a legend / control for ALL maps | edit it once in `src/` (`@map`); rebuild bundles |
| Add a color strategy | new file in `@map/config/color-strategies/`, register in `_registry.js` |
| Build everything | `npm run build` → `public/js/*.js` |
| Build just one | `BUNDLE=<name> npm run build:bundle` |
| Preview in isolation | `npm run dev` → `http://localhost:5173/app-profiles/<name>/index.html` |
| See a change in the parent app | `npm run build`, then refresh the Nuxt page (NOT `dev`) |
| Embed in a Nuxt page | `<DoxaMapSlot :profile-config="…" :bundle="…" />` (§7) |

## 10. See also

- `AGENTS.md` — agent-specific quick-reference: where to make common edits + what NOT to do
- `README.md` — repo overview & licensing (template Apache-2.0; your profiles yours)
- `CONTRIBUTING.md` — the "build not dev" cross-boundary rule, in depth
- `app-profiles/README.md` — "where your three things (color / API / i18n) go"
- `src/config/color-strategies/README.md` — the color-strategy contract
- `app-profiles/doxa-simple-map/index.js` — fully commented reference bundle entry
- `src/ProfileLoader.vue` — the profile-config → screen loader (the runtime contract)
