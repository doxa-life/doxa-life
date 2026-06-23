# Research: auto-registering Vue custom elements from `.vue` files in Vite (no per-bundle `index.js`)

> **Card:** `ebfbcf91` (web-search research). Feeds the arch-decision in
> `docs/BUNDLE-ENTRY-AUTOGEN-SPEC.md` (card `378e4156`). Goal: the lowest-config
> way for a developer to add a `.vue` profile and have its bundle/custom element
> register itself, working with the IIFE build.

## TL;DR recommendation

**Option 3 — a Vite plugin that generates each bundle's entry as a virtual
module (globbing the folder's `.vue` files), driven by one central tag manifest.**
It is the most "out of the box" for the developer (drop a `.vue` in the folder —
nothing else), works with the IIFE format, and is the only option that preserves
this project's **legacy tag-alias contract** (`<doxa-map>` etc.). This is exactly
the design already written in `BUNDLE-ENTRY-AUTOGEN-SPEC.md` — the research
**confirms** it.

Key upstream fact that shapes everything: **Vue requires an explicit
`customElements.define()` call — there is no built-in auto-registration.** "Auto"
always means *we* generate/loop the `define()` calls; the only question is where
that code lives. ([Vue: Web Components](https://vuejs.org/guide/extras/web-components))

---

## The four options, evaluated for THIS project

This project's constraints: one self-contained **IIFE** per bundle folder
(partner-site embeddable, Vue bundled in, not externalized); a `ProfileLoader`
selects which `.vue` to mount via `profile-config.profile`; the custom-element
**tag name is not always the folder name** (legacy `<doxa-map>`, `<my-upg-100-list-map>`).

### Option 1 — single central `register.js` that globs all `.vue`
- **Mechanism:** `import.meta.glob('/app-profiles/**/*.vue', { eager: true })`,
  loop, `defineCustomElement` + `customElements.define` per file.
  ([Zero To Mastery](https://zerotomastery.io/blog/how-to-auto-register-components-for-vue-with-vite/),
  [DEV: auto-registering](https://dev.to/jakedohm_34/auto-registering-all-your-components-in-vue-3-with-vite-4884))
- **Verdict:** Good *runtime* technique, but a **single** central entry fights this
  project's "one IIFE per folder" build (each bundle must tree-shake to only its
  own profiles). A single register would bundle every profile into every output.
  The right shape is "central technique, applied **per folder**" → Option 3.

### Option 2 — each `.vue` self-registers via an in-SFC `<script>` `customElements.define`
- **Mechanism:** the SFC defines + registers itself on import.
- **Verdict:** **Anti-pattern here.** It hard-couples a component to one tag name,
  so it cannot serve the alias contract (`<doxa-map>` **and** `<doxa-simple-map>`
  from one profile), breaks the `ProfileLoader` indirection (the element wraps the
  *loader*, not a profile directly), and still needs something to *import* every
  SFC so the side effect runs. Highest hidden coupling, not "out of the box."

### Option 3 — Vite plugin auto-generates the registration (build-time virtual entry) ✅
- **Mechanism:** a plugin resolves `virtual:bundle-entry/<folder>` to generated
  source: glob that folder's `*.vue`, build the `ProfileLoader`-wrapped element,
  and emit `customElements.define(tag, …)` for each tag from a central manifest.
  The community pattern of **programmatically generating the entry file** is the
  established way to do this. ([Máximo Mussini](https://maximomussini.com/posts/vue-custom-elements),
  [vue-custom-element-example](https://github.com/ElMassimo/vue-custom-element-example))
- **Verdict:** **Best fit.** Developer adds a `.vue` → done (zero per-bundle infra).
  Works with `format: 'iife'` + `inlineDynamicImports`. Tag names/aliases live in
  one central `bundles.config.js`, preserving the production contract. This is the
  `BUNDLE-ENTRY-AUTOGEN-SPEC.md` design.

### Option 4 — `.ce.vue` "custom element mode" / compiler-options plugin
- **Mechanism:** naming a file `*.ce.vue` makes `@vitejs/plugin-vue` inline
  `<style>` as strings for **shadow-DOM** injection by `defineCustomElement`.
  ([Vue: Web Components](https://vuejs.org/guide/extras/web-components))
- **Verdict:** **Orthogonal to registration** — it solves *styling under shadow
  DOM*, not "which tags get defined." **Do NOT adopt it here:** this project
  deliberately uses light DOM + `vite-plugin-css-injected-by-js`, not shadow DOM.
  Switching to `.ce.vue` would move styles into a shadow root and break the
  existing global-CSS model. Keep plain `.vue`.

---

## Decision matrix

| Criterion | 1 central register | 2 self-register | **3 plugin/virtual entry** | 4 `.ce.vue` mode |
|---|---|---|---|---|
| Dev effort to add a profile | low | low | **lowest (drop a `.vue`)** | n/a (styling only) |
| One lean IIFE per folder | ✗ (bundles all) | ~ | **✓** | n/a |
| Preserves tag aliases (`<doxa-map>`) | ~ (needs map) | ✗ | **✓ (central manifest)** | n/a |
| Works with `ProfileLoader` indirection | ✓ | ✗ | **✓** | n/a |
| Config burden | central file | none-but-coupled | **one central manifest + plugin** | plugin opt-in |
| Registration is real / supported | ✓ | ✓ | **✓** | (not about registration) |

## Practical notes for implementation (carry into the spec)

- **No built-in auto-define.** Generated code must still emit explicit
  `customElements.define()` calls — guard each with `customElements.get(tag)` (the
  bundles already do this) so double-loads don't throw.
  ([Vue: Web Components](https://vuejs.org/guide/extras/web-components))
- **Eager vs lazy glob:** registration only needs the *element* (which wraps
  `ProfileLoader`), so the folder glob feeding `provide('profileModules', …)` can
  stay **lazy** (`import.meta.glob('./*.vue')`, no `{eager:true}`) — matching
  today's `ProfileLoader` `defineAsyncComponent` behavior.
- **Keep Vue bundled (don't externalize).** The cited library guides externalize
  `vue` via `rollupOptions.external`; this project must NOT — the IIFE has to run
  on partner sites with no Vue present. Self-contained IIFE stays.
- **Stay on plain `.vue`** (not `.ce.vue`) to preserve the light-DOM +
  css-injected-by-js styling model.

## Sources
- [Vue.js — Vue and Web Components](https://vuejs.org/guide/extras/web-components)
- [Vue.js — Custom Elements API](https://vuejs.org/api/custom-elements)
- [Máximo Mussini — Vue Components as Custom Elements](https://maximomussini.com/posts/vue-custom-elements)
- [ElMassimo/vue-custom-element-example](https://github.com/ElMassimo/vue-custom-element-example)
- [Zero To Mastery — Auto-Register Components for Vue with Vite](https://zerotomastery.io/blog/how-to-auto-register-components-for-vue-with-vite/)
- [DEV — Auto-registering all your components in Vue 3 with Vite](https://dev.to/jakedohm_34/auto-registering-all-your-components-in-vue-3-with-vite-4884)
