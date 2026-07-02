# 1040-maps Starter Kit — host your own map, no rebuild

> **For teams.** You do **not** clone, build, or maintain any code to put a 1040 map
> on your site. A map is a **`<script src>` + one custom element** whose behavior is
> set by a single JSON attribute. This kit gives you the three things you need:
> the script tag, a profile-config you fill in, and a deploy guide for hosting the
> bundle yourself.

```
starter-kit/
├── README.md            ← you are here — what it is, how to get the script tag, how to customize
├── profile-template.json ← the minimal profile-config you fill in (copy its fields onto your page)
└── deploy-guide.md      ← host the bundle yourself: Railway · Coolify · nginx · S3 (1 page each)
```

## What "the starter kit" actually is

Two pieces, and you usually only touch the second:

1. **The bundle** — a single self-contained `<bundle>.js` (e.g. `doxa-simple-map.js`),
   already built and published. It carries the whole map: Vue, the legend, the data
   layer, 11 languages. You either point at a hosted copy or host your own (see
   `deploy-guide.md`).
2. **The profile-config** — a small JSON object on *your* page that says which map to
   show and with what token/data/colors. **This is the only thing most teams edit, and
   changing it never requires a rebuild.**

## Get a map on your page in 3 steps

### 1. Load the Mapbox peer + the bundle

```html
<!-- Mapbox peer — once per page, before the bundle -->
<link  href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
<script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
<script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js"></script>

<!-- The bundle. Use a hosted origin, or your own (deploy-guide.md). -->
<script src="https://YOUR-CDN-ORIGIN/doxa-simple-map.js"></script>
```

### 2. Drop the element with your profile-config

```html
<doxa-map profile-config='{"profile":"doxa-simple-map","tk":"pk.eyJ...","instanceId":"my-team-map","dataSource":"pray-tools"}'></doxa-map>
```

(That JSON is exactly `profile-template.json` collapsed onto one line.)

### 3. Fill in `profile-template.json`

| Field | Required | What to put |
|-------|----------|-------------|
| `profile` | ✅ | Which map screen to render. Must match a `.vue` name in the bundle (e.g. `doxa-simple-map`). A wrong value shows a yellow "Profile not found" box that lists the valid names. |
| `tk` | ✅ | **Your own** Mapbox public token (`pk....`). Supplied here at runtime so it is **never baked into the bundle** — every team uses its own. |
| `instanceId` | optional | A unique id if you put more than one map on a page; isolates their events. |
| `dataSource` | optional | A named source (e.g. `"pray-tools"`) **or** an object: `{"type":"rest-api","endpoint":"https://…"}`. Supports `csv`, `api`, `rest-api`. |
| `colorSet` | optional | A color preset; `"default"` if unsure. |

## Why this is "no-rebuild" hosting

The **same** `<bundle>.js` serves every team. Your map's identity — token, data,
colors, language, which screen — lives entirely in the `profile-config` JSON on your
page, read at **runtime**. To change your map you edit that JSON. You only need a new
build when the shared map *code* changes, and that's the maintainers' job, not yours.

## Available maps (profiles)

Open `manifest.json` next to the bundles (e.g. `https://YOUR-CDN-ORIGIN/manifest.json`)
to see every published bundle, its custom-element tag, and what each profile does. It's
a machine-readable index so you never have to open source files to find a map.

## Next

- **Host the bundle yourself** → `deploy-guide.md` (Railway · Coolify · nginx · S3).
- **Make your own map** (with an AI agent, no coding) → `../docs/BUILD-A-MAP.md`.
- **Deep contract reference** → `../WIKI.md` §4 (the full `profile-config` contract).
