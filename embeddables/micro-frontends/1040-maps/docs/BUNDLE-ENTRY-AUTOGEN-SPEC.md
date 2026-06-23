# Spec: Auto-generate bundle entries — remove per-bundle `index.js` / `index.html`

> **Card:** `378e4156` (swim_lane `arch-decision`). Driver-confirmed vision:
> **"App profiles = just `.vue` files in a bundle folder. Period."**
> Vite must discover `.vue` files directly and produce one `<folder>.js` bundle
> per folder, with no per-bundle `index.js` or `index.html`.
>
> **Status: IMPLEMENTATION-READY SPEC — not yet applied.** Two facts make a blind
> in-place rewrite irresponsible (see §2). The cutover (§6) must land in a
> **build-capable environment** where `npm run build` + `npm run dev` can be run.

---

## 1. What `index.js` does today (must be preserved by the generator)

Every `app-profiles/<bundle>/index.js` is a near-identical entry that:

1. `import.meta.glob('./*.vue')` → the bundle-private profile registry.
2. `defineCustomElement(ProfileLoader, { configureApp })` → wraps the loader.
3. `app.use(createPinia())` + `app.use(createAppI18n())` per instance.
4. `app.provide('profileModules', profileModules)` (Q3 contract — ProfileLoader
   reads this via `inject`).
5. Mapbox RTL text plugin init (once per module).
6. `customElements.define(<tag>, …)` — one or more tags, guarded by `.get()`.
7. `export default` the element class.

The **only** things that vary between bundles are: the folder's `.vue` set, and
**the custom-element tag name(s)**. Everything else is boilerplate → ideal for a
generated virtual entry.

`index.html` per bundle is only the **isolated dev staging page**. A central
staging page already exists at the `1040-maps` root (`index.html` + `src/staging.js`,
which globs `/app-profiles/*/*.vue`), so per-bundle `index.html` is redundant for
discovery — but see §5 for the dev-server live-page implication.

---

## 2. Why this can't be a blind in-place edit (the two hard constraints)

### 2a. Production custom-element **tag contract** (would break silently)

The host selects a tag per bundle in `app/components/DoxaMapSlot.vue`:

```js
const TAG_BY_BUNDLE = {
  'simple-map':    'doxa-map',            // ← legacy tag, NOT the folder name
  'research-map':  'doxa-research-map',
  'countries-map': 'doxa-countries-map',
}
```

Current `customElements.define` calls:

| Bundle folder | Tag(s) registered | Folder-name convention would give | Breaks? |
|---|---|---|---|
| `doxa-simple-map`   | `doxa-map` **and** `doxa-simple-map` | `doxa-simple-map` only | **YES** — drops legacy `<doxa-map>` (home/pray/adopt + partner embeds) |
| `doxa-research-map` | `doxa-research-map` | `doxa-research-map` | no |
| `doxa-countries-map`| `doxa-countries-map` | `doxa-countries-map` | no |
| `my-upg-100-list`   | `my-upg-100-list-map` | `my-upg-100-list` | **YES** — tag loses `-map` suffix |
| `template-bundle`   | `template-bundle` | `template-bundle` | no |

So **tag name is real configuration that cannot be derived from the folder name
alone.** Once `index.js` is deleted, the tag(s) + default profile must live
somewhere. Resolving *where* is the core architecture decision this card needs.

### 2b. The build **cannot be verified headlessly** in this environment

`COMMIT-LOG.md` §1 ("Build — DEFERRED (cannot run headlessly)") confirms
`npm run build` does not run in CI/agent contexts here. A `vite.config.js`
virtual-module rewrite that can't be built is unverifiable; a wiring bug bricks
**all five** bundles with no feedback loop. Therefore the destructive cutover
(§6) is explicitly deferred to a build-capable env.

---

## 3. Design — virtual per-bundle entry + one central manifest

Keep the vision ("just `.vue` files in the folder") by moving the only real
per-bundle config — **tag names** — into **one central file at the project root**,
exactly like the one central staging `index.html` the Driver already blessed. No
per-bundle infra files remain.

### 3a. Central manifest — `bundles.config.js` (project root)

```js
// bundles.config.js — the ONLY per-bundle config. Folder name = bundle/JS name.
// `tags`: custom-element tag(s) to register (first = primary; extras = aliases).
// `defaultProfile`: profile mounted when profile-config omits `profile`
//   (defaults to the folder name if a `<folder>.vue` exists).
// A folder absent here uses convention: tags:[folderName], defaultProfile:folderName.
export default {
  'doxa-simple-map':   { tags: ['doxa-map', 'doxa-simple-map'], defaultProfile: 'doxa-simple-map' },
  'doxa-research-map':  { tags: ['doxa-research-map'] },
  'doxa-countries-map': { tags: ['doxa-countries-map'] },
  'my-upg-100-list':    { tags: ['my-upg-100-list-map'] },
  'template-bundle':    { tags: ['template-bundle'] },
}
```

This file is the single source of truth for the §2a contract. It is central (not
per-bundle), so the "`.vue` files only" rule for bundle folders holds.

### 3b. Vite plugin — synthesize the entry as a virtual module

A small plugin resolves `virtual:bundle-entry/<name>` to generated source that is
exactly today's `index.js`, parameterized by the manifest. Sketch:

```js
// vite-plugin-bundle-entries.js
import bundles from './bundles.config.js'
const PREFIX = 'virtual:bundle-entry/'
export function bundleEntries() {
  return {
    name: 'bundle-entries',
    resolveId(id) { return id.startsWith(PREFIX) ? '\0' + id : null },
    load(id) {
      if (!id.startsWith('\0' + PREFIX)) return null
      const name = id.slice(('\0' + PREFIX).length)
      const cfg = bundles[name] || { tags: [name] }
      const tags = cfg.tags?.length ? cfg.tags : [name]
      // import.meta.glob is rewritten relative to THIS generated module — point it
      // at the real folder so each bundle captures only its own profiles.
      return `
import { defineCustomElement } from 'vue'
import { createPinia } from 'pinia'
import ProfileLoader from '@map/ProfileLoader.vue'
import { createAppI18n } from '@map/i18n/index.js'
const profileModules = import.meta.glob('/app-profiles/${name}/*.vue')
// normalize keys to './<profile>.vue' so ProfileLoader's lookup is unchanged
const normalized = Object.fromEntries(
  Object.entries(profileModules).map(([k, v]) => ['./' + k.split('/').pop(), v]))
if (typeof window !== 'undefined' && window.mapboxgl?.setRTLTextPlugin) {
  try { window.mapboxgl.setRTLTextPlugin(
    'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.3.0/mapbox-gl-rtl-text.js', null, true) } catch (_) {}
}
function build() {
  return defineCustomElement(ProfileLoader, { configureApp(app) {
    app.use(createPinia()); app.use(createAppI18n())
    app.provide('profileModules', normalized)
  }})
}
if (typeof customElements !== 'undefined') {
  ${tags.map(t => `if (!customElements.get(${JSON.stringify(t)})) customElements.define(${JSON.stringify(t)}, build())`).join('\n  ')}
}
export default build()
`
    },
  }
}
```

> **Glob caveat to verify at cutover:** `import.meta.glob` is normally evaluated
> relative to the importing file. From a virtual module, an **absolute** glob
> (`/app-profiles/<name>/*.vue`) is the reliable form; the generated code then
> normalizes keys back to `./<profile>.vue` so `ProfileLoader.vue` (which looks up
> `` `./${profile}.vue` ``) needs **no change**. This is the one part that most
> needs a real `vite build`/`dev` run to confirm.

### 3c. `vite.config.js` — discover folders by `.vue`, point entries at virtuals

```js
function discoverBundles() {
  const out = {}
  for (const name of readdirSync(profilesDir)) {
    if (name.startsWith('_') || name.startsWith('.')) continue
    const dir = resolve(profilesDir, name)
    if (!statSync(dir).isDirectory()) continue
    const hasVue = readdirSync(dir).some(f => f.endsWith('.vue'))   // ← discovery rule
    if (!hasVue) continue
    out[name] = `virtual:bundle-entry/${name}`                       // ← virtual entry
  }
  return out
}
// build: input = { [name]: 'virtual:bundle-entry/'+name }
// dev:   no per-bundle index.html; central root index.html + staging.js (see §5)
// plugins: [vue(), cssInjectedByJsPlugin(), bundleEntries()]
```

`emptyOutDir:false`, `outDir:../../../public/js`, IIFE per `BUNDLE`, naming, and
alias `@map` all stay as-is. Output filenames stay `[name].js` = folder name.

---

## 4. Files deleted at cutover

- `app-profiles/*/index.js`   (all 5 — replaced by the virtual entry)
- `app-profiles/*/index.html` (all 5 — replaced by central root staging, §5)

Bundle folders then contain **only `.vue` files** (+ any `data/` a bundle needs,
e.g. `my-upg-100-list/data/*.json`). Vision achieved.

---

## 5. Dev staging without per-bundle `index.html`

`src/staging.js` already discovers via `import.meta.glob('/app-profiles/*/*.vue')`
and renders the central root `index.html`. Two things to wire at cutover:

1. The central staging currently links/iframes `/app-profiles/<name>/` (the old
   per-bundle dev page). With per-bundle `index.html` gone, those URLs 404.
   **Fix:** the central staging should mount each bundle's element **inline**
   (load `virtual:bundle-entry/<name>` via the dev server and drop the
   `<tag profile-config=…>` element directly), instead of linking to a sub-page.
2. Vite **dev** needs an entry to serve. With no per-bundle `index.html`, the
   single root `index.html` (loading `src/staging.js`) is the only html entry —
   `build === 'serve'` branch keys off the virtual entries for HMR, and the vue
   plugin still HMRs the underlying `.vue` files since they're imported via the
   normalized glob.

---

## 6. Migration steps (run in a BUILD-CAPABLE env)

1. Add `bundles.config.js` (§3a) and `vite-plugin-bundle-entries.js` (§3b).
2. Refactor `vite.config.js` (§3c); register the plugin.
3. Update `src/staging.js` to inline-mount (§5.1).
4. **Run `npm run build`** — confirm 5 files in `../../../public/js/` (one per
   folder), each a valid IIFE, sizes comparable to before.
5. **Run `npm run dev`** — confirm each bundle renders on the central staging
   page with HMR.
6. Verify the **tag contract**: `<doxa-map>` still defined by the simple-map
   bundle; `<my-upg-100-list-map>` still defined; host `DoxaMapSlot` pages
   (home/pray/adopt/research/countries) all mount.
7. Only after 4–6 pass: **delete** `app-profiles/*/index.js` + `index.html` (§4).
8. Smoke-test partner-embed path (external `<script>` + `<doxa-map>`).

---

## 7. Risks / open checks

- **`import.meta.glob` from a virtual module** — the highest-risk wiring; must be
  confirmed with a real build (§3b caveat). Fallback if absolute-glob keys don't
  resolve: keep a 3-line generated `*.vue` re-export per folder, or have the
  plugin emit the glob map as a literal object it builds from `readdirSync`.
- **`defineCustomElement` + multiple tags** — same component class can't be reused
  across two `define()` calls (Vue throws `NotSupportedError`); the generator calls
  `build()` fresh per tag, matching today's `doxa-simple-map` (two classes).
- **CSS injection** — `vite-plugin-css-injected-by-js` must still see each virtual
  entry as a chunk root; confirm injected CSS appears for a built bundle.
- **`@types`/SSR guards** — generated code keeps the `typeof window/customElements`
  guards so Nuxt SSR import (if any) doesn't crash.

---

## 8. Recommendation

The design is sound and additive-first. Because (a) the build can't be verified
here and (b) the cutover rewrites the production custom-element contract, land §3
(manifest + plugin + config, all **additive/non-destructive**) and run the §6
verification in a build-capable environment **before** the §4 deletions. Do not
delete the working `index.js` files until `npm run build` + `npm run dev` pass.
