# src/colors/ — ALL of your map's colors live here

The map-maker's rule: a bundle's ROOT holds only the application profile(s)
(`.vue`) plus the scanner-contract files (`index.js`, `index.html`,
`*.instances.json`, `README.md`). **Everything else lives in `src/`** — and every
color, value or logic, lives in **this folder**. It mirrors the shared library's
`library/colors/` by name, but everything here is **bundle-private**: editing it
can never break another map.

This folder holds **two kinds of color surface**, side by side:

| Kind | File(s) | You edit… |
|---|---|---|
| **Values** — fixed colors | `colors.json` | hex strings only, no code |
| **Strategies** — data-driven colors | `<mode>.js` (e.g. `example-mode.js`) | a tiny JS module with a palette + expression |

> **Registry note:** at bundle init, `index.js` globs `./src/colors/*.js` —
> **only `.js` files** are picked up as strategies. `colors.json` is *not* matched
> by that glob (by design): it's a plain-value import surface, never a strategy.
> The two coexist in this folder without colliding.

## Surface 1 — `colors.json` (plain values)

`colors.json` is a **pure-value edit surface**. Open it, change the hex values, save.
That's the whole workflow — a non-programmer can recolor the map here.

```json
{
  "pins":     { "default": "#2563eb", "selected": "#f59e0b", "muted": "#94a3b8" },
  "polygons": { "fill": "#93c5fd", "fillOpacity": 0.35, "outline": "#1d4ed8" },
  "fallback": "#cbd5e1"
}
```

- **pins** — the dot colors: normal, selected, and de-emphasized.
- **polygons** — area fill, its opacity, and the outline stroke.
- **fallback** — the color used when a value is missing or unknown.

Use it in your profile with a **relative import** (your sandbox has no `@map/`
alias — that's for the library only):

```js
import colors from './src/colors/colors.json'
// colors.pins.default → "#2563eb"
```

## Surface 2 — color strategies (data-driven colors)

A **strategy** colors pins **by a data value** (green if praying, red if not).
Any `<name>.js` you drop in this folder belongs to **this bundle only** — it can
override a shared library color mode or add a brand-new one, without touching the
library and without affecting any other map.

### How it works

At bundle init, this bundle's `index.js` runs:

```js
registerStrategies(import.meta.glob('./src/colors/*.js', { eager: true }))
```

That merges every `<name>.js` here **over** the shared library set:

- **Filename → mode key**: `example-mode.js` → mode `exampleMode` /
  `COLOR_MODES.EXAMPLE_MODE` (kebab → camelCase / UPPER_SNAKE). Files starting
  with `_` or `.` are skipped.
- **Same mode as a shared strategy** → your file **overrides** it (for this bundle only).
- **New mode** → your file **adds** a profile-private strategy.

Each bundle builds as its own IIFE, so registering here can never leak into another map.

### Add one

1. Copy `example-mode.js` → `<your-mode>.js` in this folder and rename so the
   derived mode key matches the `colorStrategy` your map's tab passes.
2. Set `PROPERTY_KEY` to the pin field you color by; fill `PALETTE`; keep a
   non-empty `name`.
3. `bun run dev` on the bundler → HMR picks it up, no rebuild.

The full strategy **contract** (required `export default` shape) lives in
`../../../../library/colors/README.md`. `religion.js` there is the canonical example.

## Which surface do you need?

| You want to… | Use |
|---|---|
| Set a **fixed** color (all pins blue, this outline red) | **`colors.json`** |
| Color **by a data value** (green if praying, red if not) | a **strategy `.js`** |

Pick values when the color is constant; pick a strategy when the color depends
on the data.

## The one rule (where does a strategy belong?)

> **Parameterized + genuinely reused by more than one profile → shared library**
> (`library/colors/`).
> **Not reused → keep it here, in your profile.**

"Local by default, promote deliberately." Start a color here; move it into the
library only once a second profile genuinely needs it. Never rewire the color
*mechanism* in `library/` — that's shared plumbing you reuse, not edit.

## See also

- `../../../../library/colors/README.md` — the strategy contract + the shared registry.
- `../../../../contributing/COLORS.md` — the two places a color can live, in depth.
- `../../../../docs/HOWTO-build-a-map.md` — "How to change colors".
- `../../../../contributing/` — the whole contributor story (the multiplying
  micro-frontend architecture, the paste-the-bundler workflow).
