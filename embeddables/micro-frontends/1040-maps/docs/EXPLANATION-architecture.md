# Architecture — 1040 Maps Starter Kit

> The reference for how the kit is shaped: **one shared library, many bundles, one
> build.** Read this to understand *why* a map is one `.vue` file, how the build turns
> bundle folders into self-contained `<script src>` files, and how a profile gets mounted
> at runtime with no rebuild.
>
> Companion docs: [`NO-REBUILD-ARCHITECTURE.md`](./NO-REBUILD-ARCHITECTURE.md) (the
> runtime-config contract) and [`EMBED-CONTRACT-shell-wiring.md`](./EMBED-CONTRACT-shell-wiring.md)
> (how a host page mounts a bundle).

---

## 1. Overview — one shared library, many bundles, one build

The kit has exactly two kinds of source:

| | Path | Role |
|---|---|---|
| **The shared library** | `library/` (Vite alias `@map`) | One Apache-2.0 template of building blocks: map components, composables, color strategies, API connectors, stores, i18n. Reusable across every map. |
| **The bundles** | `app-profiles/<bundle>/` | One folder per shippable `<script src>` bundle. Each folder holds the `.vue` map screens that compose `@map` blocks into a specific map. |

```
library/                      ← @map — the shared library (fix once, every map benefits)
app-profiles/<bundle>/        ← one folder = one self-contained bundle
              <map>.vue       ← one .vue = one map (a "profile")
              index.js        ← bundle entry: registers the custom element, globs ./*.vue
              index.html      ← Vite html entry (dev staging page)
        │
        │  npm run build
        ▼
../../../public/js/<bundle>.js   ← one self-contained IIFE per bundle folder
../../../public/js/manifest.json ← semantic index scraped from @description headers
```

**The mental model:** an *app profile* is the "main class" of a map — the single entry
component that *is* the map. **One `.vue` file = one map = one profile.** The library in
`library/` provides the blocks; your profile composes them. The only place a map's identity
lives is its `app-profiles/<bundle>/` folder; never fork `library/` per map.

**Profiles are FLAT.** A bundle folder holds its `.vue` files **directly** — there is
**no `profiles/` subfolder**. The entry does `import.meta.glob('./*.vue')`, which matches
only siblings of `index.js`. A `profiles/` subfolder would not be discovered. Any diagram
showing `app-profiles/<bundle>/profiles/…` is wrong.

A bundle can hold **one** `.vue` (the common case — one map) or **several** (several maps
in one `<script src>`, selected at runtime by the `profile` field). See
`app-profiles/template-bundle/` for the minimal multi-profile reference.

---

## 1a. Component placement — the reusability rule (library vs profile folder)

Section 1 says *what* the two kinds of source are. This is the rule for deciding *which
kind a given component is* — the single most important call for keeping the library clean
as the number of maps grows into the hundreds.

**The rule:**

| A component belongs in… | when… |
|---|---|
| **the shared library** (`library/`) | it is used by **2+ profiles** AND it is **truly reusable** — parameterized (options as props) / feature-flagged so each profile passes its own config. Examples: the semantic-tree legend, the map component itself, map controls, the search bar, poster/packet export. |
| **the profile folder** (`app-profiles/<bundle>/`) | it is used by **one** profile, or it is **experimental / not-yet-proven reusable**, or it hard-codes one map's behaviour. Anything profile-specific lives with its profile. |

Default to the profile folder. A component only **earns promotion** into `library/` once a
*second* profile genuinely needs it and it has been generalized (config in, no hard-coded
map identity). "It might be reusable someday" is not enough — keep it beside its profile
until a real second consumer proves the abstraction.

**Why the rule exists — it solves two problems at once:**

1. **No orphan library components.** Because a profile's custom components live in its own
   folder, *excluding or `.gitignore`-ing a profile removes its components with it.* You
   never publish shared building-blocks that no visible map consumes — the first thing a
   careful reviewer asks about ("what uses this?"). To audit an existing library, trace the
   import graph (e.g. `dependency-cruiser` / `madge`): any `library/` component reachable from
   only one profile is mis-placed and should move into that profile's folder.

2. **Profiles don't break each other.** When many maps share one component, one map's edit
   can silently break another. The rule is the guardrail: a component is allowed in `library/`
   only if it is **truly parameterized**, so every dependent profile passes its own options
   and keeps working. If a component *cannot* be generalized without one map fighting
   another for it, **fork it into the profile folder** — a clean profile-specific copy
   beats a brittle forced share. A staging environment that renders *every* map at once is
   how you verify a shared-component change didn't regress the others.

**Publishing a subset (per target / per branch).** Keep one local kit with every profile;
to ship only some maps, `.gitignore` the profiles a given target should not receive. Their
profile folders — and their profile-specific components — drop out cleanly, while the
genuinely-shared library blocks remain (and stay useful for building new maps). Git
worktrees make this ergonomic: one worktree per branch/target, each including a different
set of profiles, each with its own auto-ported staging server.

---

## 2. The build pipeline

`package.json`:

```jsonc
"build":        "npm run clean && for d in app-profiles/*/; do BUNDLE=$(basename \"$d\") vite build || exit 1; done && npm run manifest",
"build:bundle": "vite build",          // builds the one bundle named in $BUNDLE
"manifest":     "node generate-manifest.mjs"
```

### Per-bundle Vite IIFE

`npm run build` loops every `app-profiles/*/` folder and runs **one Vite build per
bundle**, passing the folder name as `BUNDLE`. `vite.config.js` reads that env var, picks
that folder's `index.js` as the single input, and emits **one self-contained IIFE** to
`../../../public/js/<bundle>.js`. Key build settings (from `vite.config.js`):

- `format: 'iife'` + `inlineDynamicImports: true` — everything the bundle needs is in one
  file, so a host needs only a single `<script src>`.
- `cssInjectedByJsPlugin` + `cssCodeSplit: false` — CSS is injected by the JS, so there is
  no separate `.css` to load.
- `resolve.alias['@map'] = library/` — the `@map` import prefix points at the shared library.
- `external: ['jspdf']` mapped to a CDN ESM URL — the lazy poster/packet export is kept
  out of the bundle (it would otherwise be inlined and bloat every map); the browser
  fetches it at runtime only when a user exports.

Each bundle therefore **only bundles what its profiles import** — a simple map stays small;
a research map pulls in more.

Build just one bundle while iterating: `BUNDLE=<bundle> npm run build:bundle`.

> `npm run build` updates the host's static dir; `npm run dev` is HMR for working on a
> map in isolation and writes nothing to `public/js/`.

### `generate-manifest.mjs` — the `@description` scrape

After the per-bundle builds, `npm run build` runs `generate-manifest.mjs`. It:

1. Scans `app-profiles/<bundle>/*.vue` (flat — profiles live directly in the folder).
2. Pulls the **optional** JSDoc header tags from the top of each profile — `@description`,
   `@profile`, `@element`, etc. — via a zero-dependency regex over the first 8 KB.
3. Reads the custom-element tag(s) each bundle registers, from its `index.js`.
4. Merges any pre-built/harvested bundles listed in `vendored-bundles.json`.
5. Writes **`public/js/manifest.json`** — a semantic index of every bundle, its element
   tag(s), and what each profile does.

```jsonc
{ "schema": "doxa-1040-maps-manifest@1",
  "bundles": [
    { "bundle": "doxa-simple-map",
      "output": "public/js/doxa-simple-map.js",
      "elements": ["doxa-simple-map", "doxa-map"],
      "profiles": [ { "profile": "doxa-simple-map", "description": "…" } ] } ] }
```

The header is optional — a profile with no header still appears, just with an empty
description. This lets tooling discover "what maps exist and what they do" without opening
each `.vue`. (Run it standalone: `npm run manifest`.) Add a header at the top of a
profile's `<script setup>`:

```vue
<script setup>
/**
 * @description Country-level engagement choropleth for the 10/40 window.
 * @profile     my-map        — must match this filename
 * @element     doxa-map
 */
</script>
```

---

## 3. How a profile mounts — `ProfileLoader.vue`

`library/ProfileLoader.vue` (`@map/ProfileLoader.vue`) is the **only** component that reads
the runtime `profile-config` attribute. The bundle entry registers it as a custom element
and hands it the profile registry; the loader parses the config, resolves the profile, and
mounts it.

**The bundle entry** (`app-profiles/<bundle>/index.js`) does three things:

```js
import { defineCustomElement } from 'vue'
import { createPinia } from 'pinia'
import ProfileLoader from '@map/ProfileLoader.vue'
import { createAppI18n } from '@map/i18n/index.js'

const profileModules = import.meta.glob('./*.vue')   // FLAT registry of THIS bundle's profiles

const El = defineCustomElement(ProfileLoader, {
  configureApp(app) {
    app.use(createPinia())
    const i18n = createAppI18n()
    app.use(i18n)
    app.provide('appI18n', i18n)
    app.provide('profileModules', profileModules)     // hand the glob to ProfileLoader
  }
})
customElements.define('doxa-map', El)                 // one tag per bundle
```

`import.meta.glob('./*.vue')` is evaluated by Vite **at build time relative to the entry
file**, so it captures only this bundle's flat profiles. `ProfileLoader` lives in `@map`
(a different folder) and cannot run the glob itself — that is why the entry must
`provide('profileModules', …)`.

**`ProfileLoader.vue`** then, in `setup`:

1. Parses the `profile-config` JSON string (`{ profile, tk, instanceId?, dataSource?,
   colorSet?, locale? }`).
2. Resolves `./<profile>.vue` in the injected `profileModules` registry and mounts it via
   `defineAsyncComponent`. If the name is missing it renders an inline error.
3. `provide()`s everything descendants need, so no profile or composable prop-drills:
   - `mapboxToken` (from `tk`)
   - `dataSource` (from `config.dataSource`, defaulting to `sources.json`'s `activeSource`)
   - `colorSet`, `profileConfig`, `instanceId`, `lang`
   - the **instance-scoped Pinia stores**: `uiStore`, `mapStore`, `dataStore` (resolved
     inside this bundle's own Pinia, so multiple embeds on one page never cross-bleed).

> Note: `mapboxToken` and `dataSource` are provided as **computed refs** — descendants must
> `unref`/`.value` before use.

Because `ProfileLoader` runs in `setup` before any profile renders, it is also the shared
boot seam — e.g. it restores the persisted theme once so every profile is themed
consistently on first paint.

---

## 4. The no-rebuild contract

`profile-config` is an HTML attribute read **at runtime in the browser** — nothing about a
map's identity is fixed at build time. The *same* built bundle re-points to a different
screen, token, data source, color set, or language just by changing the JSON on the page —
**no rebuild.**

```html
<doxa-map profile-config='{"profile":"doxa-simple-map","tk":"pk...","dataSource":"pray-tools","colorSet":"default","locale":"en"}'></doxa-map>
```

This is what lets one bundle serve many sites/teams: build once, configure per embed. Full
verification (loader + data layer read, shipped bundles grepped) is in
[`NO-REBUILD-ARCHITECTURE.md`](./NO-REBUILD-ARCHITECTURE.md).

---

## 5. The embed contract

A built bundle is just a `<script src>` plus a custom element. Load the Mapbox peer once,
then the bundle, then the element. `profile` selects which `.vue` mounts; `tk` is the
Mapbox token.

```html
<!-- Mapbox peer (once per page, before the bundle) -->
<link  href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
<script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
<script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js"></script>

<!-- Your bundle, then the map -->
<script src="/js/doxa-simple-map.js"></script>
<doxa-map profile-config='{"profile":"doxa-simple-map","tk":"pk.eyJ..."}'></doxa-map>
```

Each bundle registers a **shadow-DOM** web component (via `defineCustomElement`), so it
owns its own ShadowRoot, styles, Pinia store, and i18n instance — multiple embeds on one
page do not bleed state. The full host-shell wiring (mounting a bundle full-page from a
single config row, `embed_type = shadowdom`) is in
[`EMBED-CONTRACT-shell-wiring.md`](./EMBED-CONTRACT-shell-wiring.md).

---

## 6. The 3 customization seams in depth

A map is yours through exactly three seams. Pick or extend a seam; never fork `library/` per
map.

### Seam 1 — Color strategies (`library/colors/`)

How pins/regions are colored. **One strategy = one file**, auto-discovered at build time
via `import.meta.glob('./*.js')` (the same pattern bundles use) — there is no manual
registration. Shipped strategies include `engagement.js`, `prayer-progress.js`,
`adoption.js`, `language-family.js`, `affinity-block.js`, `religion.js`, `resource.js`,
`doxa-region.js`. The filename derives the mode key (`affinity-block.js` → `affinityBlock`).
Add `my-strategy.js` exporting `{ name, propertyKey, getColor, applyColor, … }` and it
appears automatically on the next build. A profile picks one via `colorSet` /
`profile-config`.

### Seam 2 — API connections (`library/api/` + `library/api/sources.json`)

Where data comes from. `sources.json` declares each source and its `fieldMappings`;
`DataSourceManager` supports `csv`, `api`, and `rest-api`. `activeSource` names the default
(e.g. the live `pray-tools` REST API). Components stay source-agnostic — they read whatever
`DataSourceManager` returns — so swapping data is an edit to `sources.json`, not to
components. A host can override per embed with `profile-config.dataSource`.

### Seam 3 — i18n (`library/i18n/`)

Translated strings via `useI18n()`. Eleven base locales ship in `library/i18n/locales/`
(`ar de en es fr hi it pt ro ru zh`); RTL is handled for the RTL locales. The bundle entry
installs the i18n instance and hands it to `ProfileLoader` by reference; a profile can set
the active language via `profile-config.locale` (or `lang`), which drives both UI chrome
and the API `lang` param. A profile may override individual strings.

---

## 7. Library-vs-profile rule + `library/` folder map

**The rule:** if a thing is reusable across **2+ profiles**, it belongs in `library/` (`@map`);
if it is unique to **one** map, it belongs in that map's `app-profiles/<bundle>/` folder.
Fix a legend or control once in `@map` and every map gets it on the next build. Never fork
`library/` to customize a single map — use the three seams above.

`library/` (alias `@map`) groups:

| Folder | What lives here |
|---|---|
| `components/` | Shared map UI: legends (`LegendDesktop/Mobile/Rows/Tools`), `SemanticTreeLegend`, side menus, detail panels. |
| `components/dashboards/` | Composable dashboard blocks — top bar, search header, facet rail, charts rail, data table, map panel, breadcrumb, filter chips, detail drawer. |
| `components/map-controls/` | Map chrome buttons + toolbar — zoom, fullscreen, location, theme toggle, geocoder, hamburger, help, share. |
| `components/poster/` | Poster/export dialog + preview + slots. |
| `composables/` | The map engine as `use*` hooks — `useMapInstance`, `useMapData`, `useMapLayers`, `useMapEvents`, `useMapFly`, `useMapSelection`, `useShadowStyles`, dashboard + poster composables, etc. |
| `colors/` | **Color strategies** (Seam 1) — one strategy per file, auto-registered by `_registry.js`. |
| `config/` | Poster config: `posterDefaults.js`, `posterSizes.js` (map defaults live in `constants/mapDefaults.js`). |
| `constants/` | Never-change values: `mapDefaults.js`, `zoom.js`. |
| `api/` | `DataSourceManager.js` + `sources.json` + `_registry.js` (Seam 2). |
| `stores/` | Pinia stores — `uiStore`, `mapStore`, `dataStore` (instance-scoped per embed). |
| `utils/` | Pure helpers — clustering, geo utils, CSV/data helpers. |
| `i18n/` | `index.js` + `locales/` (Seam 3). |
| `data/` | Shared lookup data (e.g. language-family-by-ISO maps). |
| `ProfileLoader.vue` | The single mount seam (§3). |

---

## 8. Dashboards vs maps — both are app-profiles

A **dashboard is also an app profile** — the same model, no special case. A map profile
composes `@map` map blocks (`useMapInstance`, legends, controls); a dashboard profile
composes the `library/components/dashboards/` blocks (search header, facet rail, charts rail,
data table, map panel) and the dashboard composables (`useDashboardData`,
`useDashboardShell`, `useDashboardAggregations`). Both:

- live as **flat `.vue` files** in an `app-profiles/<bundle>/` folder,
- are mounted by `ProfileLoader.vue` from the runtime `profile-config`,
- build to one self-contained `public/js/<bundle>.js`,
- and are embedded with `<script src>` + a custom element.

So "build a dashboard" is the same job as "build a map": drop one `.vue` in a bundle
folder, compose the shared blocks for the kind you want, build, embed. The dashboard blocks
are simply another section of the shared `@map` library, governed by the same
library-vs-profile rule in §7.

---

## See also

- `CLAUDE.md` / `README.md` — build a map in 3 steps.
- `CONTRIBUTING.md` — build vs dev, CDN modes, partner-site embedding.
- `app-profiles/template-bundle/` — minimal copy-me reference bundle (two flat profiles).
- `app-profiles/README.md` — the full authoring guide.
- [`NO-REBUILD-ARCHITECTURE.md`](./NO-REBUILD-ARCHITECTURE.md) — runtime-config contract, verified.
- [`EMBED-CONTRACT-shell-wiring.md`](./EMBED-CONTRACT-shell-wiring.md) — host-shell mount contract.
