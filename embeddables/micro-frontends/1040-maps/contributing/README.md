# Contributing to 1040-maps

Welcome. You want to help build maps — edit colors, add a map, tune a legend — but you
don't need to understand the whole architecture to do it safely. This folder explains
just enough, and points you at the exact file to touch.

## The one rule that keeps everything clean

> **Parameterized + genuinely reused by more than one map → the shared library**
> (`library/`).
> **Not reused → it lives in your app-profile folder** (`app-profiles/<your-map>/`).

"**Local by default, promote deliberately.**" When in doubt, keep your change local to
your own map. Something graduates into the shared library only once a *second* map
genuinely needs it. That rule is what keeps the boundary clean: the library stays
reusable-only, and each map owns its private pieces.

---

## 1. The big picture — a multiplying micro-frontend

1040-maps is **one bundler that produces many independent, embeddable map bundles**.

```
1040-maps/                       ← the bundler (this folder)
  library/        (= @map)       ← the SHARED library: reusable map machinery only
                                   (the map, search bar, legends, color strategies,
                                    data sources, shared components/composables)
  app-profiles/<bundle>/         ← YOUR map(s). One folder = one bundle.
    index.js                     ← bundle entry (registers the web component)
    <profile>.vue                ← one .vue = one embeddable map ("profile")
    src/colors/                  ← your bundle's PRIVATE colors (values + strategies)
  internal/                      ← the bundler's own build scripts — never edited by map builders
  vite.1040-maps-build-config.json ← the ONE build-settings file
```

- A **bundle** is a micro-frontend: one paste-anywhere `.js` file + staging pages.
- A **profile** is one map (one `.vue`). A bundle can hold several profiles.
- The build emits a self-contained `doxa-maps/` folder with a `manifest.json` at its
  root indexing every bundle + profile, each carrying ready-to-paste embed snippets.

**One library, built once → instantiated indefinitely.** That's the multiplier.

---

## 2. The workflow — paste it in, build where you want, no server rebuild

You do **not** rebuild your website to work on maps.

1. **Drop the bundler into your site.** The 1040-maps bundler folder can live inside any
   production site — e.g. in an `embeddable/` folder. (On the old WordPress site it lived
   inside WordPress; when we migrated to the new XT environment, the built bundles simply
   transferred over — the output folder is portable and host-agnostic.)

2. **Point the output wherever you want** in `vite.1040-maps-build-config.json`:
   - `name` — the output folder name (default `doxa-maps`), independent of this
     bundler folder's own name.
   - `paths` — extra destinations to copy the whole tree into. The tree is always
     written to `./app/<name>/` **plus** each `<path>/<name>/`. (Ours currently also
     copies to `../../../public/js`.)

3. **Run the dev server on the bundler** for your own staging environment with **hot
   module replacement**:
   ```bash
   bun install
   bun run dev        # → http://localhost:5173  (all bundles, live HMR)
   ```
   Edit a `.vue`, a color, a legend → the staging map updates instantly. No build, no
   server restart.

4. **When you love it, build** the portable multi-MFE folder:
   ```bash
   bun run build      # builds each app-profile as its own IIFE, then writes the tree
   ```
   The resulting `doxa-maps/` folder is fully modular — it runs **in and outside** your
   environment (own site, external site, Cloudflare, Vercel, Android, …). Drop it
   anywhere HTML+JS runs.

---

## 3. What you probably came here to do

### Edit or add colors
See **[COLORS.md](./COLORS.md)** — the two paths:
- **Path A** — tweak a color in the shared library (`library/colors/`).
- **Path B** — override or add a color that's private to *your* map
  (`app-profiles/<your-map>/src/colors/`).

### Add a new map (profile)
Create `app-profiles/<bundle>/<your-map>.vue`, then `bun run dev`. The bundle
auto-discovers it (`import.meta.glob('./*.vue')`). See `CLAUDE.md` → "Adding a new map".

### Add a whole new bundle
Copy `app-profiles/template-bundle/` → `app-profiles/<your-bundle>/`, edit the `.vue`
file(s), `bun run build`. The template is the minimal copy-me reference — including a
`src/colors/` example strategy.

### Contribute UPGs / SPGs (people-group data)
People-group pins come from a **data source** (the `library/api/` seam), not hard-coded.
To add or correct people-group data, work through the source configured in
`library/api/sources.json` (see `library/api/README.md` for the connection
contract). If your map needs its *own* source, add it there and select it per profile —
same "local by default" rule: private sources stay with your profile, shared ones live
in the library.

---

## 4. Where things live (quick map)

| You want to… | Touch |
|---|---|
| Tweak a shared color | `library/colors/<name>.js` |
| Add a color only my map uses | `app-profiles/<my-map>/src/colors/<name>.js` |
| Add a map | `app-profiles/<bundle>/<name>.vue` |
| Add a bundle | copy `app-profiles/template-bundle/` |
| Change the output folder / destinations | `vite.1040-maps-build-config.json` |
| Change the Mapbox token endpoint | `vite.1040-maps-build-config.json` → `tokenUrl` |
| Configure a data source | `library/api/sources.json` |

**Golden rule again:** reusable + parameterized → `library/`. Everything else → your
`app-profiles/<map>/` folder.
