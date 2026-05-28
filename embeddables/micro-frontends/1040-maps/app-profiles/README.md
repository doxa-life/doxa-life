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

- Architecture: `the refactor ideation`
- First migration: `the refactor ideation`