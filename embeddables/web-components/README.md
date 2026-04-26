# web-components/

Small, single-purpose custom elements (Vue + Vite) — smaller in scope than anything in `micro-frontends/`.

**Empty for now.** Populate as small reusable custom elements emerge (e.g. a map legend alone, a standalone language picker, a prayer timer).

## Difference vs `micro-frontends/`

| | web-components/ | micro-frontends/ |
|---|---|---|
| Size | Small, single-purpose | Full app — sub-menus, panels, application profiles |
| UI composition | One or two components | Many components, often its own routing / state |
| Example | Chat bubble, form field, language picker | Map with filters, dashboard, full research tool |
| Build output | `public/js/<name>.iife.js` | `public/js/<name>.iife.js` (same destination) |

The distinction is granularity (size) — both build to the same `public/js/` location and embed via `<script>` + custom element. Angular Architects call the larger ones "coarse-grained web components that represent entire domains" — that maps to `micro-frontends/` here.

## When to create one

- Does it fit in ~1 Vue component with maybe 1–2 children? → `web-components/`
- Does it have its own menu structure, data sources, or application profiles? → `micro-frontends/`

When in doubt, start in `web-components/` and promote later if it grows.

## Build pattern (same as micro-frontends)

```bash
cd web-components/my-element
npm install
npm run build
# → doxa-life/public/js/my-element.iife.js
```

Import from shared blueprint (if needed) via the same `@template` alias that micro-frontends use — but prefer keeping `web-components/` small and dependency-free.
