# doxa-map-widget

Vue 3 + Mapbox GL web component. One JS bundle, unlimited application profiles via `profile-config` prop.  
`npm run build` compiles **and automatically deploys** the bundle into every WordPress environment you configure — no manual copying required.

---

## Quick Start

```bash
npm install
cp .env.example .env            # add your Mapbox token
cp vite.config.example.js vite.config.js   # add your deploy paths
npm run dev
```

Open `http://localhost:5173` — you'll see the `example-map` profile rendering.

---

## How It Works

```
<doxa-map profile-config='{"profile":"example-map","tk":"pk.eyJ..."}'></doxa-map>
```

1. `entry.js` registers `<doxa-map>` as a web component
2. `ProfileLoader.vue` parses the `profile-config` JSON prop
3. The `profile` field resolves to `src/app-profiles/example-map.vue` (auto-discovered)
4. That application profile renders the map

---

## Add a New Application Profile

1. Copy `src/app-profiles/example-map.vue` to `src/app-profiles/your-profile.vue`
2. Update map style, center, zoom inside the new file
3. Use it with: `<doxa-map profile-config='{"profile":"your-profile","tk":"..."}'>`

No registration needed — filenames are auto-discovered via `import.meta.glob`.

---

## Directory Structure

```
src/
├── entry.js              ← Registers <doxa-map> web component
├── ProfileLoader.vue     ← Reads profile-config prop, loads app profile
├── app-profiles/         ← One .vue file per map (filename = profile name)
│   └── example-map.vue
├── composables/          ← useXxx(mapId) — framework-level composables
│   └── useMapInstance.js
├── config/               ← All external config (no config inside components)
│   ├── sources.json      ← Data source definitions
│   ├── mapConfig.js      ← Default map init options
│   └── colorStrategies.js
├── stores/               ← Pinia stores
│   ├── mapStore.js       ← Per-instance map state, keyed by mapId
│   ├── uiStore.js
│   └── dataStore.js
└── styles/
    └── main.css
```

---

## Build & Auto-Deploy to WordPress

```bash
npm run build
```

This does **two things in one command**:

1. **Compiles** `src/entry.js` → `dist/map-app.iife.js` + `dist/map-app.css`
2. **Copies** those two files into every path listed in `DEPLOY_TARGETS` inside your `vite.config.js`

### Setting up your deploy targets

```bash
cp vite.config.example.js vite.config.js
```

Then edit `vite.config.js` and fill in your paths, for example:

```js
const DEPLOY_TARGETS = [
  // Staging (static server)
  resolve(__dirname, '../../Map-Framework/staging-environment/public/dist'),

  // doxa-website theme — workspace source copy
  resolve(__dirname, '../doxa-website/assets/map-app'),

  // Local WordPress site (LocalWP / Local by Flywheel)
  '/home/YOUR_USER/Local Sites/testo/app/public/wp-content/themes/doxa-website/assets/map-app',

  // Another local WP site — e.g. a staging clone
  '/home/YOUR_USER/Local Sites/stage/app/public/wp-content/themes/doxa-website/assets/map-app',
]
```

> `vite.config.js` is in `.gitignore` so your private local paths never get committed.  
> `vite.config.example.js` is what you commit — it documents all the possible targets with comments.

### Dev mode (watch + auto-deploy on every save)

```bash
npm run dev
```

Runs `vite build --watch` — every time you save a source file the bundle rebuilds **and** re-copies to all targets instantly.  No browser refresh needed in WordPress; just reload the page.

### WordPress usage

After `npm run build`, drop this into any WordPress template or Elementor HTML block:

```html
<script src="/wp-content/themes/doxa-website/assets/map-app/map-app.iife.js"></script>
<link  rel="stylesheet" href="/wp-content/themes/doxa-website/assets/map-app/map-app.css">

<doxa-map profile-config='{"profile":"example-map","tk":"pk.eyJ..."}'></doxa-map>
```

The `tk` value comes from your PHP token API — never hardcode a Mapbox token in source.

---

## Profile Config Prop Shape

| Field | Required | Description |
|-------|----------|-------------|
| `profile` | ✅ | App profile filename (without `.vue`) |
| `tk` | ✅ | Mapbox temporary key (from PHP tokens API) |
| `dataSource` | optional | Which source from `sources.json` to use |
| `colorSet` | optional | Which color strategy to apply |

---

## Key Rules

- ❌ Never hardcode the Mapbox token in any source file — always use `profile-config.tk`
- ❌ Never put config inside components — use `src/config/`
- ❌ Never add buttons as config arrays — use `#toolbar` named slots
- ✅ Use `markRaw()` on all large datasets in `dataStore`
- ✅ All map state goes in `mapStore`, keyed by `mapId`
