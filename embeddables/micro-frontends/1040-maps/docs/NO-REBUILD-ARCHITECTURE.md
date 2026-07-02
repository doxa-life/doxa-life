# No-Rebuild Architecture — verified

> **Claim under test:** one built bundle serves many teams; each team's map identity
> (which screen, token, data, colors, language) is set at **runtime** via
> `profile-config` — **no per-team rebuild.**
>
> **Verdict: CONFIRMED.** Verified by reading the loader + data layer and grepping the
> shipped bundles in `public/js/`. Evidence is in §4.

---

## 1. How the runtime config swap works

The whole host↔map wiring is **one HTML attribute**, `profile-config`, a JSON string.
`src/ProfileLoader.vue` is the *only* component that reads it, and it reads it **at
runtime in the browser** — nothing about it is fixed at build time.

```html
<doxa-map profile-config='{"profile":"doxa-simple-map","tk":"pk.eyJ...","dataSource":"pray-tools","colorSet":"default","locale":"en"}'></doxa-map>
```

Loader flow (`ProfileLoader.vue`):

1. `JSON.parse(props.profileConfig)` — parse the attribute at runtime.
2. `profile` → look up `./<profile>.vue` in the bundle's glob registry
   (`import.meta.glob('./*.vue')`, provided by the bundle entry) and mount it via
   `defineAsyncComponent`. **Every** profile screen in the bundle is present; which one
   renders is chosen now, from the attribute — not at build.
3. `tk`, `dataSource`, `colorSet`, `locale`/`lang` are `provide()`d to all descendants
   via `inject()`. No value is compiled in; each embed supplies its own.

**Data** is fetched at runtime too. `src/api-connections/apiBaseUrl.js` resolves the API
base URL in this order:

1. `window.MAP_APP_API_URL` — **set by the host page at runtime** (e.g. a CMS/WordPress
   inline script). No rebuild.
2. `import.meta.env.VITE_API_BASE_URL` — build-time fallback from `.env`.
3. `''` — relative.

So a host can point the same bundle at a different API origin with a one-line
`<script>window.MAP_APP_API_URL='…'</script>` — no rebuild.

## 2. The two no-rebuild axes

| Axis | Mechanism | Rebuild? |
|---|---|---|
| **Which map screen** | `profile-config.profile` selects among the bundle's flat `.vue` profiles at runtime | ❌ no |
| **Token / data / colors / language** | `profile-config.tk` / `.dataSource` / `.colorSet` / `.locale` provided at runtime; API base URL from `window.MAP_APP_API_URL` | ❌ no |

A multi-profile bundle (e.g. `template-bundle.js` → `template-map-a`, `template-map-b`)
literally ships **both** screens in one file; two pages loading the same `.js` with
different `profile` values render two different maps.

## 3. What is baked at build time vs runtime

| Baked at build (`npm run build`) | Supplied at runtime (`profile-config` / host) |
|---|---|
| The profile **screen code** (compiled `.vue`) for every profile in the bundle | **Which** profile renders (`profile`) |
| The shared `@map` library: legends, map controls, color *strategies*, i18n catalogs | Mapbox **token** (`tk`) — never baked (verified 0 hits) |
| `sources.json` field-mappings + default `activeSource` | **Data source** choice (`dataSource`) and the live **data** itself (fetched from API) |
| Default color presets | Which **colorSet** is active |
| 11 language catalogs | Active **locale/lang** |
| — | API **base URL** (`window.MAP_APP_API_URL`) |

**No profile-specific data is bundled.** There are no `app-profiles/*/data/` datasets in
this repo; all people-group / country / prayer data comes from the live API at runtime.

## 4. Proof (verification evidence)

Run against the shipped bundles in `../../../public/js/`:

| Check | Command (gist) | Result |
|---|---|---|
| No Mapbox token baked | `grep -oE 'pk\.eyJ…' public/js/*.js` | **0 hits** — `tk` is runtime ✅ |
| API base URL resolved at runtime | `grep MAP_APP_API_URL public/js/doxa-*.js` | present in `doxa-simple-map.js` & `doxa-research-map.js` ✅ |
| One bundle holds many profiles | `grep -c template-map-a/-b public/js/template-bundle.js` | **both present** in the single file ✅ |
| Runtime config parse shipped | `grep -c profile-config / profileModules public/js/doxa-simple-map.js` | present (runtime `JSON.parse` + glob registry) ✅ |
| No static datasets shipped | `ls app-profiles/*/data/` | **none** — data is fetched live ✅ |

**Live confirmation (optional):** open the same built `template-bundle.js` on a page with
two `<template-bundle>` elements, one `profile-config='{"profile":"template-map-a"}'` and
one `'{"profile":"template-map-b"}'` → two different screens, one bundle, zero rebuilds.
(The bundle's own `app-profiles/template-bundle/index.html` staging page does exactly this.)

## 5. Limitations — what DOES require a rebuild

The runtime swap covers *configuration and data*, not *code*. You must run
`npm run build` (and re-publish the bundle) when:

1. **Adding a new profile screen** (a new `.vue`) or a **new bundle** — the code for it
   doesn't exist in the shipped `.js` until it's built in.
2. **Changing shared `@map` code** — legend, map controls, a color *strategy*'s logic,
   component fixes.
3. **Changing `sources.json` field-mappings / endpoints / default `activeSource`** — these
   are compiled into the bundle. (Switching among *already-defined* sources via
   `dataSource` is runtime; redefining a source's shape is build-time.)
4. **Changing the i18n catalogs / adding a language.**

Everything a *team* normally varies — token, which map, data origin, colors, language —
is runtime. Everything that's *shared map code* is build-time and owned by the
maintainers. That split is exactly what makes "hundreds of teams, no rebuild" hold.

---

*Cross-references: `WIKI.md` §4 (full `profile-config` contract) ·
`src/api-connections/apiBaseUrl.js` (runtime base-URL resolution) ·
`starter-kit/README.md` (team-facing version of this) ·
`docs/RAILWAY-DEPLOY.md` (serving the bundles as a CDN origin).*
