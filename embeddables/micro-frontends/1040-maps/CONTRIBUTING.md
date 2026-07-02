# Contributing to 1040-maps — building, embedding, and shipping a map bundle

Maps sit on the edge of your ecosystem: built once, they migrate with you.
WordPress → Nuxt → whatever comes next, the maps come along unchanged. Embed them
anywhere with a single script tag.

> **TL;DR — the one rule that surprises everyone:**
> To see your map changes in the parent Nuxt app, run **`npm run build`** inside
> this folder — **NOT `npm run dev`**. The build is what copies your JS bundle
> into the parent app's static assets. There is no HMR across that boundary.
> `npm run dev` is the fast HMR loop for working on a map **in isolation**.

## The mental model

This `1040-maps` directory is a **standalone Vite project**. It is **not** part of
the parent Nuxt app's module graph. It compiles each map into a self-contained
`.js` bundle — an IIFE that registers a custom element — which any page can load
as a plain `<script src>` static asset.

That single fact is what gives the maps their reach: the same artifact runs three
ways without modification.

1. In **this project's** own dev server (isolated HMR staging).
2. In the **parent Nuxt host** (loaded from its `public/js/`).
3. On a **partner site** (loaded from a public CDN URL).

```
1040-maps/  (standalone Vite build)
   │
   │   npm run build
   │   ───────────────►   writes <bundle>.js into ──►   <parent-app>/public/js/
   │                                                        │
   │                                                        │ served as a static asset
   │                                                        ▼
   └──────────────────────────────────────────────►   parent Nuxt dev server
                                                        (page refresh picks it up)
```

Because the bundle is a **build artifact** in the parent's `public/` folder — not
a source import — the parent's dev server only sees a change **after you rebuild**.
Editing `.vue`/`.js` files here does nothing to the parent until the build runs.

---

## The 1040 maps template (what's shared, what's yours)

This project is built on **the 1040 maps template** — an **Apache-2.0**, open-source
base that anyone can use. The template is the **shared half** of the repo:

- `src/` (aliased `@map`) — the shared component library: legends, toolbars,
  composables, color strategies, i18n, the data-source engine.
- `vite.config.js` and the build tooling — the multi-bundle build pipeline.
- the **bundle pattern** itself — one folder per map under `app-profiles/`, each
  `.vue` a profile, each folder compiling to one self-contained `<script src>` bundle.

What you add on top — your folders under `app-profiles/<your-map>/` — is **yours**:
your color choices, your data connections, your i18n, your maps. The template is
common to everyone; your application profiles are private and uniquely yours.

> **This host ships a tree-shaken build of the template.** Each built bundle only
> includes the parts of the shared template a given map actually imports — so a
> simple map's `.js` is small and a feature-rich map's is larger. You consume the
> whole Apache template as source, but every output bundle is a lean slice of it.

When this guide says "the template," it means exactly this Apache-2.0 shared
library + build tooling + bundle pattern — nothing host-specific.

### The reuse rule (reusable → `src/`, unique → profile config)

The same rule governs **dashboards** (config-driven CMV kit) and **maps**:

- **Reusable across profiles → `src/` (`@map`).** Logic that more than one profile would
  copy lives in the library, declared ONCE. Examples: the dashboard panels and search
  header (`src/components/dashboards/`), the geocoder **kind-switch** (`src/composables/
  useGeocoderSearch.js` — `KIND_PROPERTY` + the filter-expression builder), the selection
  bus, the CSV exporter. If you are about to paste a `FACET_ACC` / kind→property map /
  filter loop into a 2nd file: **STOP** — that is the smell the library exists to kill.
- **Unique to one profile → config, not code.** A dashboard's facets / columns / charts /
  KPIs / data source / the 4 search-bar definitions live in its `dashboard.config.js`; a
  map's colors / data connection / i18n live in its `app-profiles/<map>/` folder.

The headline proof: a dashboard's 4 search bars reuse the SAME `useGeocoderSearch`
composable the map profiles use, swapping only the **sink** (a `busAdapter` that lands the
result on the dashboard's `selectionBus`) — the kind-switch is never re-implemented. See
`src/components/dashboards/README.md` for how a new dashboard reuses the kit.

---

## Two patterns for multiple maps from one bundle

A single bundle can present **several different maps**. There are **two ways** to
do it, and they solve different problems. Neither is "more correct" — pick the one
that matches *why* your maps differ.

> **Vocabulary.** A **bundle** is one folder under `app-profiles/<name>/` → one
> `<name>.js` script. A **profile** is a `.vue` file at that folder's root,
> discovered by `import.meta.glob('./*.vue')` in the bundle's `index.js`. The host
> picks which profile to mount with the `profile` field of `profile-config`; the
> rest of `profile-config` (token, data source, colors, instanceId…) are
> **parameters** passed to that profile.

### Pattern A — Parameterized element (one profile, many instances)

**Use when:** the maps are *the same map* differing only by **configuration** —
data source, color set, starting tab, labels.

One bundle, **one** `.vue` profile. You mount the element as many times as you
like, each with a different `profile-config` — same `profile`, different
parameters. The bundle's script loads **once**; each element instance is
independent (its own Pinia + i18n).

**Example — `doxa-simple-map`:** a single `doxa-simple-map.vue` profile drives
three maps (Engagement / Prayer / Adoption). All three slots use
`profile: 'doxa-simple-map'`; only the surrounding config differs.

```html
<script src="/js/doxa-simple-map.js"></script>
<doxa-map profile-config='{"profile":"doxa-simple-map","tk":"pk…","dataSource":"engagement"}'></doxa-map>
<doxa-map profile-config='{"profile":"doxa-simple-map","tk":"pk…","dataSource":"prayer"}'></doxa-map>
```

### Pattern B — Multi-profile bundle (several profiles, selected by name)

**Use when:** the maps are **genuinely different map types** (different `.vue`
logic/layout), but you want them to **share one build** because they import the
same slice of the template.

One bundle, **multiple** `.vue` profiles at the folder root. The host chooses which
profile to mount via the `profile` field — `ProfileLoader` resolves it against the
bundle's `import.meta.glob('./*.vue')` registry (key `./<profile>.vue`). Still
**one script tag**; you select the map per element with `profile`.

**Example — `my-upg-100-list`:** two profiles in one bundle —
`upg-100-list.vue` and `research-map-clone.vue` — both served by the single
`my-upg-100-list-map` element.

```html
<script src="/js/my-upg-100-list.js"></script>
<my-upg-100-list-map profile-config='{"profile":"upg-100-list","tk":"pk…"}'></my-upg-100-list-map>
<my-upg-100-list-map profile-config='{"profile":"research-map-clone","tk":"pk…"}'></my-upg-100-list-map>
```

> **Note — profiles are selected by `profile`, not by separate script tags.** A
> bundle ships exactly one `<name>.js`. Whether it has one profile (Pattern A) or
> many (Pattern B), you load that one script and pick the profile per element via
> `profile-config`. (A bundle *may* additionally register more than one element
> **tag** — e.g. `doxa-simple-map` registers both `<doxa-map>` and
> `<doxa-simple-map>` for back-compat — but that's a tag-aliasing concern, separate
> from how many maps the bundle offers.)

### Which to pick

| | Pattern A — parameterized | Pattern B — multi-profile |
|---|---|---|
| `.vue` profiles in the bundle | one | several |
| Maps differ by | config **parameters** | distinct `.vue` **logic** |
| Select a map with | different `profile-config` (same `profile`) | the `profile` field |
| Script tags | one | one |
| Example | `doxa-simple-map` (3 instances) | `my-upg-100-list` (2 profiles) |

---

## Where this comes from — the migration story

These maps were built **modular-first**, as standalone embeddable widgets, while
the host site still ran on **WordPress**. Each map was a `<script src>` + a custom
element you could drop onto any page — never tied to WordPress internals, themes,
or plugins. It was just a self-contained bundle that booted itself.

When the host site **migrated from WordPress to Nuxt**, the maps came across
**unchanged**. Nothing in this project had to be ported, rewritten, or adapted to
the new framework. The Nuxt host simply loads the same IIFE bundle as a static
asset the same way the WordPress page did — `<script src>` then the custom
element. The build target moved from one site's static directory to another's;
the bundles themselves did not change a line.

That is the payoff of the modular-first design: **the maps are framework-agnostic
build outputs, not framework components.** A future migration to yet another host
would be the same story — re-point the build output, embed the script tag, done.

---

## The two CDN modes

A built bundle is delivered to the page by exactly one of two mechanisms. They are
not configured anywhere in this project — they are simply *where the page loads the
`<script src>` from*. The bundle code is identical in both.

### Internal CDN mode (the parent host serves it)

`npm run build` writes the bundle into the **parent Nuxt host's own static
directory** (`../../../public/js/`). The host then serves it from its own domain,
e.g. `/js/<bundle>.js`. The host *is* the CDN — same origin, no third party.

```html
<!-- a page inside the parent host -->
<script src="/js/<bundle>.js"></script>
<doxa-map profile-config='{ ... }'></doxa-map>
```

This is the default for any page that lives **on the parent site itself**. The
build writes straight to where the host reads, so there is no copy step, symlink,
or upload — see "Where the bundles go" below.

### External CDN mode (a third party serves it)

The exact same built `<bundle>.js` can be published to a **public CDN** and loaded
from an absolute URL by a page on **any other site**. Nothing about the bundle
changes — it is self-contained, registers its own custom element, and pulls the
Mapbox peer from Mapbox's own CDN.

```html
<!-- a page on a completely separate site -->
<script src="https://cdn.example.org/1040-maps/<bundle>.js"></script>
<doxa-map profile-config='{ ... }'></doxa-map>
```

The choice between modes is purely **the `src` URL on the page** — relative
(`/js/...`, internal) vs absolute (`https://cdn.../...`, external). The build
itself only ever produces one thing: a portable IIFE.

### Partner-site embedding

A **partner site** is any external site that wants to show one of these maps. It
uses **external CDN mode**: it loads the Mapbox peer scripts, then the bundle from
a CDN URL, then drops in the custom element with its own `profile-config`. No
framework, no build step, and no access to this repo is required on their end.

```html
<!-- everything a partner page needs -->
<link  href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
<script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
<script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js"></script>

<script src="https://cdn.example.org/1040-maps/<bundle>.js"></script>
<doxa-map profile-config='{"profile":"<bundle>","tk":"pk.eyJ..."}'></doxa-map>
```

Because the bundle is the same artifact in every mode, a map you tested in
isolation here, and that runs in the parent host, will run on a partner site too —
the only difference is the URL the partner points their script tag at.

---

## The two build steps

There are two commands, and they do **different jobs**. Knowing which is which is
the whole game.

### `npm run dev` — HMR staging (work on a map in isolation)

```bash
npm run dev        # Vite dev server for THIS project, with HMR
```

`dev` serves every bundle at its own staging page **inside this project**, with
hot module replacement — save a `.vue`, see it instantly. This is the fast loop
for building and styling a map **on its own**, away from the host.

**`dev` does NOT touch the parent app.** It writes nothing to
`../../../public/js/`. If you only ever run `dev`, the parent host keeps showing
the **old** bundle.

### `npm run build` — bundle to `../../../public/js/`

```bash
npm run build      # build every bundle → ../../../public/js/<name>.js
```

`build` compiles each bundle and writes it into the parent host's static
directory. **This is the only command that updates what the parent (or a CDN)
serves.** After a build, refresh the parent page to see the change.

| | `npm run dev` | `npm run build` |
|---|---|---|
| Purpose | iterate on a map in isolation | publish the bundle for hosts/CDNs |
| HMR | yes — instant on save | n/a (one-shot compile) |
| Writes to `../../../public/js/` | **no** | **yes** |
| Updates the parent app | **no** | **yes** (after a page refresh) |
| Updates a partner/CDN copy | no | yes (it produces the file to publish) |

> Both `npm` and `pnpm` work — the scripts are identical. Use whichever the rest
> of your environment uses.

---

## The two-terminal dev workflow

For day-to-day work you want **two terminal tabs** open at once:

**Tab 1 — this project (the map source).** Pick one:

```bash
# in embeddables/micro-frontends/1040-maps
npm run dev          # HMR staging: iterate on the map in isolation
#   — or, when you want the parent to update on every save —
npm run build:watch  # rebuild into ../../../public/js/ on every change
```

**Tab 2 — the parent Nuxt host.** Run the host's own dev server (from the host
root), and keep its page open in the browser:

```bash
# in the parent app root
npm run dev          # the host dev server; open the page that embeds the map
```

The split is deliberate:

- **Tab 1 with `npm run dev`** is for *building the map* — fast HMR, no host
  involved. When it looks right, run `npm run build` once to push it across.
- **Tab 1 with `npm run build:watch`** is for *integration work* — every save
  rebuilds into the host's `public/js/`, and the **Tab 2** host page picks up the
  new bundle on refresh. This is the closest you get to a live loop across the
  boundary.

You do not need both at once. Use `dev` while shaping a map, switch to
`build`/`build:watch` when you want to see it inside the host.

---

## Where the bundles go (and why it just works)

`vite.config.js` sets the output directory **three levels up**, into the parent
app's public assets:

```js
build: {
  outDir: resolve(__dirname, '../../../public/js'),  // ← parent app's public/js
  emptyOutDir: false,                                // ← never wipes sibling bundles
}
```

- `../../../public/js` resolves to **`<parent-app>/public/js/`** — a folder the
  parent Nuxt dev server already serves statically. That's why no extra copy step
  or symlink is needed; the build writes straight to where the host reads. (To
  serve a bundle from an **external CDN**, publish that same file to the CDN.)
- `emptyOutDir: false` means a build of **one** bundle leaves the **other**
  bundles untouched. You can rebuild a single map without breaking the rest.

Each folder under `app-profiles/<bundle>/` produces exactly one file:
`<parent-app>/public/js/<bundle>.js`. `npm run build` loops over every
`app-profiles/*/` folder and builds them all.

### Build just one bundle (faster iteration)

`npm run build` rebuilds every bundle. To rebuild only the one you're editing:

```bash
BUNDLE=<bundle-name> npm run build:bundle
# e.g. BUNDLE=my-map npm run build:bundle  →  ../../../public/js/my-map.js
```

(`<bundle-name>` is the folder name under `app-profiles/`.)

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Changed a `.vue`, parent shows old map | You ran `dev`, or didn't rebuild | Run `npm run build`, then refresh the parent page |
| Build error: `Set BUNDLE=<name> for build` | Ran `vite build` directly with no bundle selected | Use `npm run build` (loops all) or `BUNDLE=<name> npm run build:bundle` |
| New bundle doesn't appear in parent | Missing `index.html` or `index.js` in the `app-profiles/<bundle>/` folder | Vite auto-discovers a bundle only when both files exist |
| Old bundle still loads after a hard build | Browser cached the static `.js` | Hard-refresh / disable cache in devtools |
| Partner/CDN copy is stale | The CDN still serves the old file | Re-publish the freshly built `<bundle>.js` to the CDN (and bust its cache) |
| Map is blank on a partner page | Mapbox peer scripts not loaded, or no token | Load `mapbox-gl.js` + geocoder **before** the bundle; pass a valid `tk` in `profile-config` |

---

## One-line recap

**Edit here → `npm run dev` to shape it → `npm run build` to ship it.** The build
*is* the bridge: it writes the same portable bundle that the parent host serves
(internal CDN) and that partner sites load from a CDN URL (external CDN). `dev`
only runs this project in isolation.
