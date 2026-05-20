---
id: far-fast-tools/FARFAST1-HOP-POP-PLOT/DOXA/doxa-website-nuxt/doxa-life/embeddables/micro-frontends/1040-maps/README
audience: trinitarian-believers
audience-strict-66-book: true
framework: farfast-1
kingdom-kernel: false
parent: 1040-maps
path-tags:
- far-fast-tools
- FARFAST1-HOP-POP-PLOT
- DOXA
- doxa-website-nuxt
- doxa-life
- embeddables
- micro-frontends
- 1040-maps
size-class: short
svg-candidate: true
svg-candidate-reasons:
- ascii-diagram:20
svg-candidate-score: 3
svg-candidate-tagged-at: '2026-05-09T17:40:05.449172+00:00'
svg-candidate-version: '0.2'
tagged-at: '2026-05-09T05:49:37.391885+00:00'
tagged-by: lk10x-tagger-v0.1.0
tags:
- mapbox-mfe-bundles
- repo-map-helps
- template-src-drifting
- library-components-composables
- semantictreelegend-colorstrategies-happen
- exists-replaces-clone
- vite-powered-monorepo
voice-memo-shape: false
word-count: 298
---

# 1040-maps

A Vite-powered monorepo + map forge for building embeddable Mapbox MFE bundles. Named after the 10/40 window — the geographic frame most of these maps serve.

## What it is

One repo. One library (`packages/map-core`). N bundles (one per `app-profiles/<bundle>/` folder). `npm run build` emits one IIFE per bundle into `app/`.

## Why it exists

Replaces the clone-the-template-then-edit pattern. Every map app that previously was its own MFE repo (cloning `template/src/` and drifting) gets refactored into 1040-maps **once**, then re-output as its own bundle. Edits to `SemanticTreeLegend`, `colorStrategies`, etc., happen once in `packages/map-core/` and propagate to every bundle on next build.

## Layout

```
1040-maps/
├── packages/map-core/        ← shared library: components, composables, config, utils
├── app-profiles/<bundle>/    ← bundle source folders (committed)
│   ├── index.js              ← bundle entry — imports profiles + registers web component
│   └── profiles/             ← 1..N .vue files
├── app/                      ← build outputs (gitignored)
└── vite.config.js            ← multi-entry: discovers app-profiles/<bundle>/ folders
```

## Convention: folder = bundle

A subfolder of `app-profiles/` IS a bundle. Folder name = bundle name. `npm run build` discovers them at build time, no manual entry list needed.

## Three profile patterns supported

- **Individual** — single `.vue` profile per bundle (simplest)
- **Parameterized** — one profile, behavior driven by `profile-config.tabs[]` props at runtime
- **Nested** — one profile internally rendering others via tabs (workbench-style)

A single bundle can mix all three. Recursive composition allowed.

## Quick start

```bash
npm install
npm run build      # builds every bundle in app-profiles/ → app/<name>.iife.js
npm run dev        # Vite dev server for live development
```

## Adding a new bundle

```bash
mkdir -p app-profiles/my-new-map/profiles
# create app-profiles/my-new-map/index.js (entry)
# create app-profiles/my-new-map/profiles/*.vue
npm run build
# → app/my-new-map.iife.js appears
```

## Migration plan

See `Map-Framework/00-input/map-framework-refactor/migration-001-doxa-simple-map.md` for the first refactor (doxa-simple-map-mfe → 1040-maps).