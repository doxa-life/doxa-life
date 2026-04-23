# doxa-research-mfe

Vue 3 + Mapbox GL micro-frontend that produces a single self-contained IIFE
bundle (`dist/research-map.iife.js`) registering a `<doxa-map>` web component.
The element defaults to the **research-map** application profile and uses the
**pray-tools** REST API as its data source.

This project is a clone of the
[Map-Framework template](../../Map-Framework/template/) — it owns no
framework patterns of its own. All composables, components, stores, configs,
and the geo-steward subtree are copied verbatim from the template. The only
project-local files are the build configuration (`vite.config*`,
`package.json`), the host pages (`index.html`, `wrapper.html`), and the
`src/config/sources.json` whose `activeSource` is flipped to `"pray-tools"`.

## Quick start

```bash
npm install

# Dev preview — http://localhost:5173 (single research-map embed):
npm run dev

# Production build — dist/research-map.iife.js + dist/research-map.css:
npm run build

# Serve wrapper.html (production-style preview against the IIFE):
npm run serve   # http://localhost:8000/wrapper.html
```

## Embedding

```html
<!-- Mapbox GL — CDN, NOT bundled -->
<link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
<script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>

<!-- (Optional) tell DataSourceManager where the REST API lives -->
<script>window.MAP_APP_API_URL = 'https://pray.doxa.life';</script>

<!-- IIFE bundle CSS + JS -->
<link rel="stylesheet" href="./dist/research-map.css" />
<script src="./dist/research-map.iife.js"></script>

<!-- Place one or many — each instance has its own Shadow DOM + Pinia -->
<doxa-map
  profile-config='{"profile":"research-map","tk":"pk.eyJ...","dataSource":"pray-tools"}'
></doxa-map>
```

### `profile-config` keys

| Key | Required | Description |
|---|---|---|
| `profile` | yes | Filename in `src/app-profiles/` without `.vue` (e.g. `research-map`) |
| `tk` | yes | Mapbox public token (LL-026: passed in, never baked into the bundle) |
| `dataSource` | no | Source ID from `sources.json` (default `pray-tools` here) |
| `instanceId` | no | Stable ID for cross-instance event isolation |
| `tabs` | no | Override the 10-tab contract; see `src/app-profiles/research-map.vue` |
| `colorSet` | no | Color strategy override |

## Architecture

```
entry.js               → registers <doxa-map> custom element
                          per-instance Pinia (no state bleed between embeds)

ProfileLoader.vue      → parses profile-config prop
                          auto-discovers src/app-profiles/*.vue via glob

src/app-profiles/
  research-map.vue     ← default profile — 10-tab researcher's workbench
  example-map.vue      ← demo
  two-tab-demo.vue     ← demo
  ten-tab-map.vue      ← demo
  world-map.vue        ← demo

src/composables/       ← framework composables (verbatim from template)
src/components/        ← framework components (verbatim from template)
src/config/            ← framework config (sources.json activeSource = pray-tools)
src/stores/            ← framework Pinia stores (verbatim)
src/utils/             ← framework utils + DataSourceManager
src/geo-steward/       ← geo-steward subtree (polygon/tileset toolkit)
```

## Data source

`src/config/sources.json` defines the available data sources. This project
ships with two:

- **doxa-csv** — local CSV at `assets/data/Joshua-project-ids-Doxa-1439.csv`
- **pray-tools** ← `activeSource` — REST API at `window.MAP_APP_API_URL`
  + the endpoints declared in the source's `endpoints` map

`DataSourceManager` reads `sources.json` at build time (static import) and
switches between source types (`csv` / `api` / `rest-api`) at runtime.

## Source of patterns

All framework code lives in
[`Map-Framework/template/`](../../Map-Framework/template/). Bug fixes,
new composables, and shared components belong **there**, not here. Every file
under `src/` in this repo should be a verbatim copy from the template. The
only intentional divergence is the `activeSource` flag in `sources.json`.

## Build / deploy

`vite.config.js` is in `.gitignore` per **LL-025**. Commit
`vite.config.example.js` instead, then each developer copies it to
`vite.config.js` and adds their own deploy targets if needed.
