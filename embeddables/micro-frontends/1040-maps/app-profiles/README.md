---
id: far-fast-tools/FARFAST1-HOP-POP-PLOT/DOXA/doxa-website-nuxt/doxa-life/embeddables/micro-frontends/1040-maps/app-profiles/README
audience: trinitarian-believers
audience-strict-66-book: true
framework: farfast-1
kingdom-kernel: false
parent: app-profiles
path-tags:
- far-fast-tools
- FARFAST1-HOP-POP-PLOT
- DOXA
- doxa-website-nuxt
- doxa-life
- embeddables
- micro-frontends
- 1040-maps
- app-profiles
size-class: short
svg-candidate: false
svg-candidate-reasons:
- ascii-diagram-light:15
svg-candidate-score: 1
svg-candidate-tagged-at: '2026-05-09T17:40:05.449861+00:00'
svg-candidate-version: '0.2'
tagged-at: '2026-05-09T05:49:37.759492+00:00'
tagged-by: lk10x-tagger-v0.1.0
tags:
- map-vue-profile
- app-profiles-subfolder
- iife-js-folders
- config-nested
- staging-folder-index
- map-renders-doxa
- vite-multi-entry
voice-memo-shape: false
word-count: 161
---

# app-profiles/

Each subfolder here is a bundle. Folder name = bundle name. The Vite multi-entry build discovers folders here at build time and emits one IIFE per folder into the sibling `app/` directory.

## Conventions

- Folder name = bundle name (becomes `app/<folder-name>.iife.js`)
- Folders prefixed with `_` or `.` are skipped at build time (use for staging)
- Each folder MUST have an `index.js` entry that:
  - Imports the bundle's profiles
  - Registers the web component (e.g. `<doxa-map>`)
  - Mounts the host-side `profile-config` reader

## Example folder

```
app-profiles/doxa-simple-map/
├── index.js              ← entry: imports profiles, registers <doxa-map> web component
└── profiles/
    ├── prayer-tab.vue
    ├── adoption-tab.vue
    └── engagement-tab.vue
```

## Three profile patterns

- **Individual** — single `.vue` profile per bundle
- **Parameterized** — one profile, props-driven (host page declares behavior via `profile-config`)
- **Nested** — one profile that internally renders others (research-map-style workbench)

A bundle can mix all three.

## See also

- Architecture: `Map-Framework/00-input/map-framework-refactor/ideation3.md`
- First migration: `Map-Framework/00-input/map-framework-refactor/migration-001-doxa-simple-map.md`