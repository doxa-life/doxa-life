# template/src/app-profiles/

> **One `.vue` file per kind of map.** Auto-discovered at build time via `import.meta.glob('./app-profiles/*.vue')` from `ProfileLoader.vue`. Adding a new map = dropping a new `.vue` here.

| File | What it is |
|---|---|
| `world-map.vue` | Minimal world-tour skeleton — useful as a from-scratch starting point. |
| `example-map.vue` | Slightly larger example with a basic legend + popup wiring. |
| `two-tab-demo.vue` | Demo of the `tabs` profile-config switching colorStrategy/legend/popup atomically (LL-029). |
| `ten-tab-map.vue` | Stress test of 10 tabs in one profile — used by `stress-tests/`. |
| `research-map.vue` | The composite "researcher's workbench" — clustering, filters, 10 tabs, poster export. The active development target. |

## Conventions

- Filename `kebab-case.vue`. The slug becomes the `profile` value in `profile-config`.
- Single `<script setup>` block; no Options API.
- Composables do almost all the work — the profile is a wiring file, not a logic file.
- Config (colors, zoom, sources, color strategies) is imported from `../config/`, never inlined.

## Cross-references

- Pattern (the *why*) → [`/docs/patterns/profile-driven-rendering.md`](../../../docs/patterns/profile-driven-rendering.md)
- App-profiles deep-dive → [`/docs/app-profiles/`](../../../docs/app-profiles/)
- Auto-discovery → [`/docs/lessons/LL-009-profile-auto-discovery.md`](../../../docs/lessons/LL-009-profile-auto-discovery.md)
- Loader → `../ProfileLoader.vue`

## Next

To add a profile: copy `world-map.vue` → `<your-name>.vue`, set the `profile` slug in your host's `profile-config`, edit. See [`/docs/app-profiles/new-profile-checklist.md`](../../../docs/app-profiles/new-profile-checklist.md).
