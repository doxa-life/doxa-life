# micro-frontends/

Full-application-sized custom elements (Vue + Vite) that bundle into single IIFE files and register as custom elements. Not to be confused with `web-components/` (small/single-purpose things).

## What lives here

- `_template/` — shared blueprint: components, composables, config loaders that every micro-frontend imports from. The leading underscore marks this as "not a shippable micro-frontend."
- `<name>/` — one folder per micro-frontend. Each has its own `package.json`, `vite.config.js`, `src/`. Built output goes either:
  - `../../public/js/<name>.iife.js` (public — served at `/js/<name>.iife.js`)
  - `./app/<name>.iife.js` (private — stays inside the widget, never served)

## Naming

- No `-mfe` suffix on folder names. The parent `micro-frontends/` folder makes the category clear.
- Custom-element tag name matches the folder name in kebab-case (e.g. `<doxa-simple-map>`).

## Build

```bash
cd micro-frontends/doxa-simple-map
npm install
npm run build
```

Build output lands at `doxa-life/public/js/doxa-simple-map.iife.js`. Nuxt serves it as a static asset; any external site can `<script src="https://doxa.life/js/doxa-simple-map.iife.js">`.

## Sharing via `_template/`

Each widget's `vite.config.js` adds an alias to the shared blueprint:

```js
resolve: {
  alias: {
    '@':         fileURLToPath(new URL('./src', import.meta.url)),
    '@template': fileURLToPath(new URL('../_template/src', import.meta.url))
  }
}
```

Then import in code:

```js
import Legend from '@template/components/Legend.vue'      // shared
import Profile from '@/app-profiles/doxa-simple-map.vue'   // local to this micro-frontend
```

Vite traces imports + tree-shakes — each micro-frontend bundles only what it actually imports.

## See also

- `web-components/` — smaller, single-purpose custom elements.
- `doxa-life/public/js/` — where public bundles are served from.
- Design notes: `/home/qwerty/Workspace/port-kingdom/FMWK-Vite-CDN/QA-Map-MFE-CDN-Deployment.md`.
