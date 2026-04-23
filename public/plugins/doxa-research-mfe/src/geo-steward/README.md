# template/src/geo-steward/

> **Vue 3 component library refactored from the legacy `vue-geo-steward` plugin.** Standalone — no WordPress dependency. Consumed by app-profiles via the `index.js` barrel export. Spec docs live in [`/docs/geo-steward-component-library/`](../../../docs/geo-steward-component-library/).

| Folder | Contents |
|---|---|
| `components/` | Vue 3 SFCs (CardFlip, CardStack, WorkflowHeader/Footer, PrintDialog, polygon UI, …) |
| `composables/` | Vue 3 composables (useWorkflow, usePolygonWorkflow, useGeoJsonIO, useTilesetManager, …) |
| `classes/` | Plain ES6 classes for SVG/DOM work — no Vue dependency |
| `config/` | Workflow steps, print defaults, SVG defaults, export formats |
| `index.js` | Barrel export — consumers `import { … } from '../geo-steward'` |

## Migration principles

1. Vue 3 only — no Vue 2, no UMD globals.
2. `<script setup>` everywhere.
3. `provide`/`inject` for stores — no `window.useXxxStore` lookups.
4. Composables for logic, classes for behavior.
5. JSDoc on every export.
6. No `console.log` in production paths.

Full migration spec → [`/docs/geo-steward-component-library/`](../../../docs/geo-steward-component-library/).

## Cross-references

- Original analysis → [`/docs/vue-geo-steward/`](../../../docs/vue-geo-steward/)
- Refactor plan → [`/docs/refactor-plans/dt-geo-steward-to-framework.md`](../../../docs/refactor-plans/dt-geo-steward-to-framework.md)
- Component library spec → [`/docs/geo-steward-component-library/`](../../../docs/geo-steward-component-library/)

## Next

To consume: `import { CardStack, useWorkflow } from '../geo-steward'`. Never reach into a subfolder directly — use the barrel.
