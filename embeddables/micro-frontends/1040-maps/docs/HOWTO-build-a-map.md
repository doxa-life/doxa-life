# HOWTO-build-a-map — start here

You want to build a map. This is the first thing to read. It makes the whole
layout clear in one page so you (or your agent) never get lost.

You are the **programmer** here — also called the **coder** or the **map-maker**.
Your job: build one map, inside one folder that is yours. Read the two rules of
the road below, then follow the steps.

---

## The 3 zones

The repo has exactly three zones. Know which one you're in before you touch a file.

| Zone | What it is | Can you edit it? |
|---|---|---|
| **`library/`** | Reusable, shared, parameterized building blocks (map, legends, toolbars, composables, color + API registries). You **reuse** these via the `@map/…` import alias. | **No — reuse only.** A change here can break other maps. Only touch it if you are an expert and you know exactly why. |
| **`app-profiles/<your-map>/`** | Your **safe sandbox**. Your one map lives here: your `.vue` screens, your colors, your API wiring, your utils. | **Yes — build anything.** Nothing here leaks to any other map. This is where you spend all your time. |
| **`internal/`** | The bundler's own machinery — the build/check scripts (`generate-tree.mjs`, `clean.mjs`, `generate-library-index.mjs`, the portability + parse checks). It's the machine that turns your folder into a shippable bundle. | **No — never.** You don't edit the machine that builds the bundles. |

One-line version: **reuse `library/`, build in `app-profiles/<your-map>/`, never
touch `internal/`.**

To see what `library/` already gives you, read **[REFERENCE-library-index.md](./REFERENCE-library-index.md)**
in this same `docs/` folder. That's the menu.

---

## The 3 rules

1. **Reference the template.** Start every new map by copying
   `app-profiles/template-bundle/`. Don't build from a blank folder.
2. **Build everything for your map inside your app-profile.** Colors, APIs,
   components, utils, data — all of it goes in `app-profiles/<your-map>/`. If it's
   yours, it lives with you.
3. **Don't edit `library/` or `internal/`** unless you know exactly what you're
   doing. `library/` is shared (you'll break other maps); `internal/` is the build
   machine (you'll break the build).

Rule of thumb: **local by default.** Keep your change inside your own folder. Code
only moves into `library/` once a *second* map genuinely needs it — and that's an
expert move, not a first move.

**The map-maker's rule** (how your bundle folder is laid out): the bundle **root**
holds ONLY the application profile(s) (`.vue`) plus the scanner-contract files
(`index.js`, `index.html`, `*.instances.json`, `README.md`). **Everything else
lives in `src/`** — and your map's colors live at **`src/colors/`** (matching the
shared library's `colors/` name).

---

## How to make a new map

Do these in order.

1. **Copy the template.** Copy `app-profiles/template-bundle/` to
   `app-profiles/<your-map>/`. The folder name becomes your bundle name.
2. **Read the template's README.** Open `app-profiles/<your-map>/README.md` — it
   explains the flat `.vue` layout and the entry file. Rename the custom-element
   tag in `index.js` to your map's tag.
3. **List your requirements.** Write down what your map needs: which data, which
   colors, which controls (legend, search, share, fullscreen…).
4. **Pick from the library.** Open **[REFERENCE-library-index.md](./REFERENCE-library-index.md)** and
   pick the pieces that match your list. Import each with the `@map/…` alias — do
   not copy their code into your folder.
5. **Build in your `src/`.** Write your map's own screens and code inside
   `app-profiles/<your-map>/`. This is your sandbox — anything you build here is
   private to your map.
6. **Edit your colors.** Put your color choices in your app-profile's
   `src/colors/` folder (start from the `example-mode.js` the template gives
   you). See the next section.
7. **Build.** Run `bun run build` (or `npm run build`) to produce your bundle.
   For just yours: `BUNDLE=<your-map> bun run build:bundle`.

---

## How to change colors

Colors are **values, not logic**. You edit values; the library owns the mechanism.

- Your map's colors live in **your app-profile's color folder**:
  `app-profiles/<your-map>/src/colors/`.
- Copy `example-mode.js` there, rename it, and edit the `PALETTE` — just change the
  hex values. Set `PROPERTY_KEY` to the field you color by.
- Your colors **merge over** the shared set for *your map only*. Editing them here
  can never break another map.
- You do **not** edit `library/colors/` to recolor your own map. That's the shared
  registry (the mechanism) — leave it alone.

Rule: recolor in **your** folder, with **values**. Never rewire the color
mechanism in `library/`.

---

## For your agent

If you point an AI agent at this repo, tell it exactly this:

> This is the 1040-maps bundler. There are **three zones**:
> `library/` = reusable shared blocks — **reuse via the `@map/…` alias, never
> edit**. `app-profiles/<map>/` = the sandbox for **one** map — **build everything
> here**. `internal/` = the build machine — **never touch it**.
>
> To build a map: copy `app-profiles/template-bundle/`, read its README, list the
> requirements, pick reusable pieces from **docs/REFERENCE-library-index.md**, then build the map's
> own code (screens, colors, API, utils) inside `app-profiles/<the-map>/`. Change
> colors by editing **values** in that map's `src/colors/` folder — not logic
> in `library/`. Then run `bun run build`.
>
> Never edit `library/` or `internal/`. If a change seems to belong in `library/`,
> stop and ask — that's an expert move that can break every other map.

That paragraph is the guardrail. Give it to the agent first, before it reads any code.

**Power-up (optional but recommended):** Mapbox publishes official agent skills —
performance patterns, cartography/color design, style recipes, search integration —
that make your agent much better at map work. If your agent supports skills
(Claude Code, Cursor, Copilot):

```
/plugin marketplace add mapbox/mapbox-agent-skills
/plugin install mapbox
```

or `npx skills add mapbox/mapbox-agent-skills`. The most useful ones for this repo:
`mapbox-cartography` (choosing colors!), `mapbox-style-patterns`,
`mapbox-web-performance-patterns`, `mapbox-web-integration-patterns`.

---

## See also

- **[EXPLANATION-why-this-structure.md](./EXPLANATION-why-this-structure.md)** — why is it organized this way? The rationale behind the zones and folder names.
- **[REFERENCE-library-index.md](./REFERENCE-library-index.md)** — the menu of reusable `library/` pieces.
- **[CLAUDE.md](../CLAUDE.md)** — bundler overview + build config.
- **[app-profiles/template-bundle/README.md](../app-profiles/template-bundle/README.md)** — the copy-me skeleton.
- **[contributing/COLORS.md](../contributing/COLORS.md)** — the two places a color can live.
