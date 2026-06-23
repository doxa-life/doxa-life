# Research — file-header metadata patterns for app-profile `.vue` files

**Question.** What established, *machine-readable + human-readable* patterns exist for
metadata/description headers at the top of Vue/JS files, used in popular open source,
and which should the 1040 maps template adopt for its `app-profiles/<bundle>/*.vue`
profile files?

**Method.** Five patterns researched independently with web search against primary docs.
Each is assessed for (1) machine-extractability, (2) human-readability, (3) real OSS
usage, with pros/cons for use **inside an app-profile `.vue` file** in this Vite
multi-bundle web-component build.

**TL;DR recommendation.** Adopt a **JSDoc `@file` block with a closed set of custom
`@`-tags** as the authored header in each profile `.vue`, extractable with a zero-dependency
one-line regex by `generate-index.sh` / `src/staging.js`. It matches the JSDoc style the
bundle `index.js` files already use, is IDE-surfaced as documentation, and needs no new
build tooling. If/when a profile needs *structured, build-load-bearing* config (arrays,
nesting, types), graduate that subset to a **CSF-style exported `meta` object** — the
strongest precedent because our target already lives in the JS/Vite/AST world. Full
rationale in [§ Recommendation](#recommendation).

---

## The five patterns

### 1. WordPress plugin/theme file header (`Key: Value` comment block)

A leading comment of newline-delimited `Field Name: value` lines (`Plugin Name:`,
`Version:`, `Description:`, `Author:`…) at the top of the main plugin file.

- **Machine-readable:** WordPress core's `get_file_data()` reads only the **first 8 KB**
  of the file and runs a per-key regex (`/^[ \t\/*#@]*Key:(.*)$/mi`) — a pure static
  parse, the file is never executed. The same regex tolerates `//`, `/* */`, `#`, and
  `@`-style comments, in both PHP and CSS.
- **Human-readable:** Excellent. Reads like a labeled form; full-word field names
  (`Requires at least`) are self-documenting.
- **OSS usage:** The universal convention for *every* WordPress plugin/theme — Yoast SEO,
  WooCommerce, all WordPress.org themes (in `style.css`), and the ClassicPress fork.
- **Pros:** battle-tested, copy-pasteable; trivial one-regex-per-field extraction in any
  language, no AST; forces metadata to the top of the file.
- **Cons:** flat key/value only (no nesting/arrays/types); values can't span lines; no
  schema — unknown keys and typos fail silently; the 8 KB cap is an invisible footgun.
- **Fit for our `.vue`:** Good **as the readability/convention model.** Maps cleanly onto
  an app-profile header and our existing `generate-index.sh` could regex it out without
  importing any Vue/JS. But flat `Key: Value` can't express structured profile config —
  use it for human identity, not as the sole machine source of truth.

### 2. JSDoc `@file` block (+ `@author`, `@version`, custom `@`-tags)

A `/** ... */` comment at the top of the file whose `@file` (synonyms `@fileoverview` /
`@overview`) describes the whole file, alongside line-oriented `@tag value` tags. Custom
tags (`@profile`, `@bundle`…) are first-class via a plugin `defineTags` dictionary or
`allowUnknownTags: true`.

- **Machine-readable:** Layered, pick your effort. Full JSDoc/TypeDoc doclets; dedicated
  AST parsers (`eslint/doctrine`, `syavorsky/comment-parser`); **Vue-aware** `@vuedoc/parser`
  reads JSDoc tags straight out of an SFC; or the lowest-effort one-line regex
  `/^\s*\*\s*@(\w+)\s+(.*)$/` for a build manifest. Custom tags can be validated
  (`mustHaveValue`, `onTagged`).
- **Human-readable:** Very high — recognizable `/** @file ... */` idiom, surfaced by VS Code
  on hover, doubles as documentation.
- **OSS usage:** Google Closure Library (`@fileoverview` pervasively), the JSDoc project
  itself, `eslint-plugin-jsdoc`'s `require-file-overview` rule (CI-enforceable),
  `@vuedoc/parser`, `comment-parser`.
- **Pros:** officially specified & vendor-neutral; triple-extractable (doclet / AST /
  regex); Vue-native path exists; custom metadata is first-class with validation;
  enforceable in CI; IDE-surfaced so it won't rot.
- **Cons:** `@file` itself is one free-text line — structure comes from custom tags; tags
  are string-typed (no enum validation without `onTagged`); synonym sprawl
  (`@file`/`@fileoverview`/`@overview`); it's a comment, so it can drift from real config.
- **Fit for our `.vue`:** **Strong.** A JSDoc header at the top of `<script setup>` is both
  hover-visible docs and a regex-/`comment-parser`-extractable manifest, and it matches the
  JSDoc headers our `index.js` files already carry.

### 3. Bundler comments — Rollup `banner`/`footer`, legal comments, webpack magic comments

A family where build metadata lives in comments the bundler is aware of: Rollup
`output.banner`/`footer` (emitted verbatim), **legal comments** (`/*! */`, `//!`,
`@license`, `@preserve`) preserved through minification, and webpack magic comments
(`/* webpackChunkName */`) read to steer chunk naming.

- **Machine-readable:** Split. webpack magic comments are *genuinely parsed* by webpack
  (key/value) — but are **webpack-only**; Vite/Rollup/esbuild don't honor them. Legal
  comments / banners are **preserve-verbatim** — esbuild's `legalComments` keeps them but
  never reads fields out; any extraction is your own regex/AST.
- **Human-readable:** High for a `/*! app v1.2.3 | MIT */` header at file top; magic
  comments read as per-`import()` annotations, not file-level metadata.
- **OSS usage:** webpack magic comments — Vue Router lazy-loading guide, Angular CLI; legal
  comments — esbuild/Vite/Terser/Rollup pipelines; `output.banner` — Rollup core,
  `vite-plugin-banner`.
- **Pros:** zero new format; the legal-comment convention guarantees a marked header
  **survives Vite minification** into the shipped bundle; `output.banner` is a sourcemap-safe
  "one header per chunk" stamp.
- **Cons:** the preserve-verbatim family is **not parsed** by the bundler (machine-readable
  is on you); webpack syntax doesn't transfer to Vite; non-legal comments can be stripped
  by upstream transforms; `output.banner` lives in `vite.config`, not the source `.vue`, so
  it can't carry per-profile metadata authored in the file.
- **Fit for our `.vue`:** **Moderate.** Don't author profile metadata via `output.banner`.
  The transferable idea: optionally emit a `/*! @preserve */` banner so metadata survives
  into `public/js/<bundle>.js` for runtime/forensic discovery. The idiomatic Vue home for
  *authored* structured metadata is an **SFC custom block** (e.g. `<profile lang="yaml">`,
  parsed via `@vue/compiler-sfc` `customBlocks` — the mechanism `vite-plugin-pages` uses for
  `<route>` blocks), not a comment.

### 4. Custom Elements Manifest (`custom-elements.json` from JSDoc tags)

A standardized JSON file (schemaVersion 2.1.0) describing a package's custom elements —
generated by `@custom-elements-manifest/analyzer` (`cem`), which runs source through the
**TypeScript compiler AST** and reads JSDoc tags (`@element`, `@attr`, `@prop`, `@csspart`,
`@slot`, `@fires`) above each component class.

- **Machine-readable:** Not a regex — AST + JSDoc node comments → analyzer's 4 phases
  (collect/analyze/module-link/package-link) → JSON-Schema-validated `custom-elements.json`,
  discoverable via the `package.json` `"customElements"` field.
- **Human-readable:** Very, in the source JSDoc (the generated JSON is verbose and not meant
  for hand-reading).
- **OSS usage:** Lit, Shoelace, Microsoft FAST, Adobe Spectrum, Stencil, Catalyst, Vaadin;
  governed by W3C/WICG `webcomponents/custom-elements-manifest`, analyzer under open-wc.
- **Pros:** co-locates contract with code; same source is docs + schema-validated JSON;
  industry-standard & versioned; drives IDE autocomplete, Storybook knobs, doc sites;
  AST-based (robust).
- **Cons:** the analyzer expects `customElements.define()` + a class — **it does not parse a
  `.vue` SFC** out of the box; its tags model an element's *public DOM API*, not app-profile
  concerns (bundle, mount, route, flags); needs a real build step/config.
- **Fit for our `.vue`:** **Borrow the shape, not the toolchain.** As a literal target it's a
  weak fit (won't read `.vue`, wrong semantics). The directly usable lesson is the
  architecture: *one co-located comment block → generated, JSON-Schema-validated manifest,
  discoverable via `package.json`* — but with app-profile tags and our own ~30-line
  extractor. (A real CEM only becomes valuable if we later compile each profile to a true
  custom element and generate it from the compiled output.)

### 5. Storybook CSF — the default-export `meta` object

Component Story Format: each `*.stories.*` file's **default export** is a real JS `meta`
object (`title`, `component`, `parameters`, `tags`, `argTypes`). Metadata-as-data, not a
comment — read at runtime *and* statically.

- **Machine-readable:** Genuinely, two ways. Runtime: the live object. Static: Storybook's
  indexer + `@storybook/csf-tools` (`babelParse`, `loadCsf`/`readCsf` → a `CsfFile`, and
  `writeCsf` back) parse the source with **Babel AST without executing it**, pulling
  `meta.title`/`tags`/story list and auto-deriving title from file path when omitted.
- **Human-readable:** Very — a typed object literal with autocomplete, type-checking
  (`satisfies Meta<…>`), and jump-to-definition. Reads as ordinary code.
- **OSS usage:** Storybook core + `@storybook/csf-tools`; `addon-svelte-csf`,
  `storybook-vue-addon` (write stories as `.stories.vue`, an indexer converts to CSF);
  story.to.design.
- **Pros:** real ES export — type-checked, refactor-safe, jump-to-definition (a comment
  can't do this); dual-consumable runtime + static AST; **round-trippable** (tools read *and
  write* it back — powers "Save from Controls"); extensible by nesting; reused across
  frameworks by transpiling to the same shape.
- **Cons:** static analysis can't resolve **dynamic/computed values** (verified pain points:
  `satisfies`, runtime-built meta); needs a real Babel/AST parser (heavier than a regex);
  assumes the default export is metadata (rename breaks it silently); the module has real
  imports that can fail to load.
- **Fit for our `.vue`:** **Strong — arguably the best-matched precedent**, because our
  target *is* a `.vue` in the JS/Vite/AST world CSF lives in. Mirror it: export a typed
  `appProfile`/`meta` object and read it statically with `@vue/compiler-sfc` +
  Babel/`es-module-lexer` to emit the multi-bundle manifest without executing the SFC. Heed
  the verified limitation: keep the object a **static literal** (no computed keys, no
  runtime values; auto-derive from filename like CSF does for `title`). Practical caveat: a
  pure object export from `<script setup>` is awkward — a sibling `<script>` block or a
  `name.profile.ts` co-located file is the cleaner home.

---

## Comparison

| Pattern | Machine-read | Human-read | Structured? | Vue-native | Zero-dep extract | OSS anchor |
|---|---|---|---|---|---|---|
| 1. WP `Key: Value` | regex (static) | ★★★ | flat only | n/a | ✅ one regex | WordPress/Yoast/Woo |
| 2. JSDoc `@file` + custom tags | doclet / AST / regex | ★★★ | flat-ish (tag lines) | via `@vuedoc/parser` | ✅ one regex | Closure, eslint-plugin-jsdoc |
| 3. Bundler/legal comments | webpack: yes; banner: **no** | ★★☆ | no | SFC custom block | ⚠️ DIY | Rollup/Vite/Vue Router |
| 4. Custom Elements Manifest | TS-compiler AST | ★★★ (source) | ✅ rich JSON | ✗ (not SFC) | ✗ needs analyzer | Lit, Shoelace, FAST |
| 5. CSF `meta` export | Babel AST + runtime | ★★★ | ✅ typed/nested | ✅ (JS/Vite world) | ⚠️ AST (light) | Storybook + Vue/Svelte addons |

**Reading of the field.** Two families: **comment-based** (1, 2, 3-legal) — language-agnostic,
regex-extractable, can't be type-checked, can drift; and **code-as-data** (4-source-tags→JSON,
5-export) — richer/validated, co-located, but needs an AST parser and a build step. Patterns
1, 2, and 5 are the realistic candidates for a `.vue` profile; 3 contributes the
*survive-minification* trick; 4 contributes the *generated-manifest* architecture.

---

## Recommendation

For the 1040 maps template, fit the tool to the authors and the existing plumbing:

- profiles are small, often agent-authored `.vue` files discovered by
  `import.meta.glob('./*.vue')` (the profile name = filename);
- the bundle `index.js` files **already** use rich JSDoc block headers;
- there is already a `generate-index.sh` and `src/staging.js` that enumerate profiles and
  could cheaply scrape a header — no heavy AST toolchain is in place.

### Primary: a JSDoc `@file` header with a closed set of custom `@`-tags

Author this block at the top of every profile `.vue`'s `<script setup>`. It is the
WordPress block's readability + the JSDoc ecosystem's extractability, and it is consistent
with the headers `index.js` already carries.

```vue
<script setup>
/**
 * @file          Engagement / prayer / adoption map screen.
 * @profile       doxa-simple-map     — must match this filename (the `profile` value)
 * @bundle        doxa-simple-map     — app-profiles/<bundle>/ → public/js/<bundle>.js
 * @element       doxa-map            — custom-element tag the host mounts
 * @title         Simple Map
 * @dataSource    rest-api            — csv | api | rest-api
 * @colorStrategy engagement
 * @version       0.1.0
 * @author        1040 maps template
 */
// ... component code ...
</script>
```

**Closed tag set** (validate against this list; warn on unknown tags so typos don't fail
silently — the one WordPress weakness worth fixing since we own both ends):
`@file` (required, free text) · `@profile` (required, = filename) · `@bundle` · `@element` ·
`@title` · `@dataSource` · `@colorStrategy` · `@version` · `@author`.

**Zero-dependency extraction** (drop into `generate-index.sh` or `src/staging.js`) — read
the first ~4 KB, regex each `@tag value` line:

```js
// node: extract the header tags from a profile .vue
const src = fs.readFileSync(file, 'utf8').slice(0, 4096);
const meta = {};
for (const m of src.matchAll(/^\s*\*\s*@([\w-]+)\s+(.+?)\s*$/gm)) meta[m[1]] = m[2];
// → { file, profile, bundle, element, title, dataSource, colorStrategy, version, author }
```

Why this and not the others, concretely:

- **vs. WordPress `Key: Value`:** same readability and one-regex extraction, but JSDoc is
  the *JS-native* idiom, IDE-surfaced on hover, CI-enforceable via
  `eslint-plugin-jsdoc require-file-overview`, and matches our `index.js` headers.
- **vs. CSF export object:** CSF is the strongest *structured* precedent, but a pure object
  export is awkward in `<script setup>` and needs an AST parser. For a handful of scalar
  identity fields the comment header is lighter and friendlier to agent authors.
- **vs. CEM / bundler comments:** CEM's analyzer won't read `.vue`; bundler banners live in
  `vite.config`, not the file. We borrow CEM's *generated-manifest* architecture (below) and
  optionally borrow the legal-comment *survival* trick (below).

### Secondary (graduate when needed): a CSF-style exported `meta` object

When a profile needs **structured, build-load-bearing** config (arrays, nested tabs, typed
flags) rather than scalar identity, mirror CSF: export a static literal and read it
statically with `@vue/compiler-sfc` + `es-module-lexer` — never executing the SFC. Keep it a
**static literal** (no computed keys / runtime values; auto-derive from filename like CSF
derives `title`), in a sibling `<script>` block or a co-located `<name>.profile.ts`:

```ts
export const appProfile = {
  profile: 'doxa-simple-map',
  bundle: 'doxa-simple-map',
  element: 'doxa-map',
  tabs: [{ id: 'engagement', colorStrategy: 'engagement' }],
} /* satisfies AppProfile — omit `satisfies` if the indexer is regex-naive */;
```

### Two architectural borrowings

- **From CEM:** treat the per-profile header as the source for a **generated, schema-validated
  manifest** — `generate-index.sh` emits `public/js/manifest.json` (or similar) of all
  profiles, discoverable like CEM's `package.json "customElements"` field. Validate extracted
  headers against a tiny JSON Schema (closed tag set, required `@profile`/`@file`).
- **From legal comments:** if profile metadata should **survive minification** into
  `public/js/<bundle>.js` for runtime/forensic discovery, emit it (or a digest) as a
  `/*! @preserve */` banner — esbuild's default `legalComments` keeps it through Vite's build.

### One-line guidance

> **Author** a closed-tag JSDoc `@file` header in each profile `.vue` (human + regex). **Generate**
> a validated `manifest.json` from those headers (CEM-style). **Graduate** to a static
> CSF-style exported `meta` object only when a profile needs structured/typed config.

---

## Sources (primary docs verified during research)

- WordPress: developer.wordpress.org *Header Requirements* / *Main Stylesheet*; core
  `get_file_data()`, `get_plugin_data()`.
- JSDoc: jsdoc.app `@file`/plugins; `eslint/doctrine`; `syavorsky/comment-parser`;
  `@vuedoc/parser`; `gajus/eslint-plugin-jsdoc` `require-file-overview`; Google Closure.
- Bundlers: rollupjs.org `output.banner`; esbuild.github.io `legalComments`; vite.dev build
  options; webpack magic comments (Vue Router / Angular CLI); `vite-plugin-banner`;
  `@vue/compiler-sfc` custom blocks (`vite-plugin-pages`).
- Custom Elements Manifest: custom-elements-manifest.open-wc.org analyzer; W3C/WICG
  `webcomponents/custom-elements-manifest` (schemaVersion 2.1.0); Lit, Shoelace, FAST, Spectrum.
- Storybook CSF: storybook.js.org CSF/CSF3, indexers API, `@storybook/csf-tools`
  (`loadCsf`/`readCsf`/`writeCsf`); `addon-svelte-csf`, `storybook-vue-addon`.
