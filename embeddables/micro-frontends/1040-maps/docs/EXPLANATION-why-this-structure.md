# EXPLANATION-why-this-structure — the rationale behind the layout

This doc explains **why** the bundler is organized the way it is — the reasoning
behind the folder names and the boundaries. For **how** to build a map, read
[HOWTO-build-a-map.md](./HOWTO-build-a-map.md) instead; this doc never repeats it.

---

## The 3 zones

The repo has exactly three top-level code zones, each with a different owner and a
different edit policy:

| Zone | What it is | Why it exists |
|---|---|---|
| `library/` | The shared runtime code every map reuses via the `@map` import alias (`vite.config.js` maps `@map` → `library/`). | One copy of every shared block. Edited only by people who know the whole system, because a change here reaches every map. |
| `app-profiles/` | One folder per bundle — the map-maker's sandbox. | A programmer building one map gets one folder that is entirely theirs. Nothing inside it can affect another map. |
| `internal/` | The bundler's own machinery: `generate-tree.mjs`, `clean.mjs`, `generate-library-index.mjs`, the portability and parse checks, the staging pages. | Named after Go's enforced `internal/` package convention: code that consumers of the project must not touch. It is the machine, not the product. |

The zones separate three audiences: map-makers (`app-profiles/`), library authors
(`library/`), and the build system itself (`internal/`).

---

## The bundle-root contract

A bundle's root holds **only** the profile `.vue` file(s) plus the scanner-contract
files: `index.js`, `index.html`, and `*.instances.json` (see
`app-profiles/doxa-simple-map/` for an `instances.json` example). Everything else the
map needs lives in that bundle's `src/`.

Why: the scanner (`internal/generate-tree.mjs`, and `discoverBundles()` in
`vite.config.js`) discovers profiles by flat-listing the bundle root. A flat root means
discovery needs no configuration — every root-level `.vue` file *is* a profile, and
anything in `src/` is implementation detail the scanner ignores.

---

## Why each library folder has its name

- **`library/api/`** — the universal frontend convention for the data layer.
  `sources.json` is a declarative connector registry keyed by `type`
  (`rest-api` | `csv`): adding a data source means adding one entry, not writing
  fetch code. `_registry.js` + `DataSourceManager.js` are the engine that reads it.
- **`library/colors/`** — ONE engine (`_registry.js`) plus the shared strategy
  files. Every map's own colors live in **its** `src/colors/` — the same folder
  name on both sides on purpose, so "colors" always means the same thing wherever
  you are.
- **`library/constants/`** — never-change value files: `mapDefaults.js`,
  `zoom.js`, `posterDefaults.js`, `posterSizes.js`. Values only, no logic, so a
  reader knows nothing in here can behave.
- **`library/data/`** — static reference JSON (ISO code tables, language-family
  lookups). Data that ships with the library and never comes from an API.
- **`library/components/` + `library/composables/`** — grouped **by feature**
  (`legends/`, `map-controls/`, `poster/`), the Vue enterprise folder-by-feature
  convention. Chosen deliberately: feature folders make micro-frontend extraction
  easy — you can lift a whole feature out in one move — and extraction is exactly
  what this bundler does.
- **`library/composables/` vs `library/utils/`** — kept separate per Vue best
  practice: composables hold reactive Composition-API logic (`useMapData.js`,
  `useMapLayers.js`, …); utils hold pure functions with no reactivity
  (`geoUtils.js`, `ClusterHelpers.js`, …).
- **`library/stores/`** — Pinia stores (`mapStore.js`, `dataStore.js`,
  `uiStore.js`), the standard Vue state-management location.
- **`library/i18n/`** — the locale layer: `index.js` plus one folder per
  language under `locales/`.

---

## The `_`-prefix convention

Files starting with `_` are **engine** code — for example `library/colors/_registry.js`
and `library/api/_registry.js`. The auto-discovery glob mechanically skips any file
whose name starts with `_` (see the skip rule in `library/colors/_registry.js`), so
engine files can sit next to the content files they discover without discovering
themselves. Reading rule: **see `_`, don't edit.**

---

## The color model

One registry engine, two homes for color content:

- **Shared taxonomies** live in `library/colors/` — `religion.js`, `adoption.js`,
  `engagement.js`, `language-family.js`, `prayer-progress.js` — because two or more
  maps use them.
- **Single-map strategies** live in that map's `src/colors/` (e.g.
  `app-profiles/doxa-research-map/src/colors/doxa-region.js`). The registry merges
  each bundle's local files **over** the shared set at bundle init — that is why
  editing one map's colors can never break another map.

Two surfaces:

1. **Strategy `.js` files** — data plus a little logic. The contract (see
   `library/colors/religion.js` for the canonical shape): `name`, `propertyKey`,
   `palette`, `getColor`, `applyColor`, `buildColorExpression`.
2. **`colors.json`** — pure fixed values, no logic (e.g.
   `app-profiles/template-bundle/src/colors/colors.json`).

---

## The library root files

`library/` root holds exactly two files:

- **`index.js`** — the `@map` barrel: the library's public API surface. Kept thin
  on purpose (a fat barrel kills tree-shaking); subpath imports like
  `@map/composables/useMapData.js` are preferred.
- **`ProfileLoader.vue`** — the runtime profile loader: the only component that
  reads the `profile-config` prop, resolves the profile name, and dynamically
  loads that profile's `.vue` file.

Everything else in `library/` lives inside a named zone folder.

---

## Discovery

[`REFERENCE-library-index.md`](./REFERENCE-library-index.md) in this `docs/` folder is the **menu** of
reusable pieces. It is a generated file — `node internal/generate-library-index.mjs`
rebuilds it from the live tree — so it never drifts from what `library/` actually
contains. Browse the menu, import via `@map/…`, build your own code in your
app-profile's `src/`.

---

## Documentation map

Two kinds of docs, two homes:

- **Production docs** live in this repo and describe the **present** system — what
  things are, how they connect, how the build works. The production set:
  [README.md](../README.md), [AGENTS.md](../AGENTS.md), [CLAUDE.md](../CLAUDE.md),
  [HOWTO-build-a-map.md](./HOWTO-build-a-map.md) (do a task),
  [TUTORIAL-build-a-map.md](./TUTORIAL-build-a-map.md) (learn step-by-step),
  this doc (why), [REFERENCE-library-index.md](./REFERENCE-library-index.md) (generated menu),
  [EXPLANATION-architecture.md](./EXPLANATION-architecture.md),
  [REFERENCE-wiki.md](./REFERENCE-wiki.md),
  [CONTRIBUTING.md](../CONTRIBUTING.md), and the folder
  `README.md` files inside `library/`, `app-profiles/`, and `contributing/`.
- **Developmental docs** — agent working notes, dev specs, feature diaries — live
  **outside** the shipped tree (the `_qa-cycle` workspace or `_archive/docs/`), not
  in the production docs. Production docs explain what *is*; developmental notes
  record how it got built.
