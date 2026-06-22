# Contributing to 1040-maps — embedding in a parent Nuxt host

> **TL;DR — the one rule that surprises everyone:**
> To see your map changes in the parent Nuxt app, run **`pnpm run build`** inside
> this folder — **NOT `pnpm run dev`**. The build is what copies your JS bundle
> into the parent app. There is no HMR across the boundary.

## The mental model

This `1040-maps` directory is a **standalone Vite project**. It is **not** part of
the parent Nuxt app's module graph. It compiles to plain `.js` bundles (IIFE
custom-element files) that the parent app loads as static assets.

```
1040-maps/  (standalone Vite build)
   │
   │   pnpm run build
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

## Why this is counter-intuitive

If you're used to a single app with Hot Module Replacement, you expect "save file →
see change instantly." That does **not** happen here, because two separate build
systems are involved:

| You're used to (single app) | What actually happens here (MFE → host) |
|---|---|
| Save `.vue` → HMR → instant | Save `.vue` → **nothing** until you build |
| One dev server watches your source | The parent dev server watches `public/js/*.js` **outputs**, not this source |
| `dev` is the working command | **`build`** is the working command for cross-boundary changes |

## The golden workflow

From **this** folder (`embeddables/micro-frontends/1040-maps`):

```bash
pnpm install        # first time only
pnpm run build      # ◄── do THIS to see changes in the parent app
```

Then in your browser on the parent Nuxt dev server: **refresh the page** (or let
its watcher reload). Your updated bundle is now live.

Repeat `pnpm run build` after every change you want to see in the parent.

> `npm run build` works identically if you prefer npm — the scripts are the same.

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
  or symlink is needed; the build writes straight to where the host reads.
- `emptyOutDir: false` means a build of **one** bundle leaves the **other**
  bundles untouched. You can rebuild a single map without breaking the rest.

Each folder under `app-profiles/<bundle>/` produces exactly one file:
`<parent-app>/public/js/<bundle>.js`. `pnpm run build` loops over every
`app-profiles/*/` folder and builds them all.

### Build just one bundle (faster iteration)

`pnpm run build` rebuilds every bundle. To rebuild only the one you're editing:

```bash
BUNDLE=<bundle-name> pnpm run build:bundle
# e.g. BUNDLE=my-map pnpm run build:bundle  →  ../../../public/js/my-map.js
```

(`<bundle-name>` is the folder name under `app-profiles/`.)

## What `pnpm run dev` is for (and what it is NOT for)

```bash
pnpm run dev        # local Vite dev server for THIS MFE in isolation
```

`dev` serves the bundles at their own staging HTML pages **inside this project**,
with HMR — useful for fast iteration on a map **on its own**, away from the host.

**`dev` does NOT touch the parent app.** It writes nothing to
`<parent-app>/public/js/`. If you run only `dev`, the parent Nuxt app will keep
showing the **old** bundle. To update the parent, you must `build`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Changed a `.vue`, parent shows old map | You ran `dev`, or didn't rebuild | Run `pnpm run build`, then refresh the parent page |
| Build error: `Set BUNDLE=<name> for build` | Ran `vite build` directly with no bundle selected | Use `pnpm run build` (loops all) or `BUNDLE=<name> pnpm run build:bundle` |
| New bundle doesn't appear in parent | Missing `index.html` or `index.js` in the `app-profiles/<bundle>/` folder | Vite auto-discovers a bundle only when both files exist |
| Old bundle still loads after a hard build | Browser cached the static `.js` | Hard-refresh / disable cache in devtools |

## One-line recap

**Edit here → `pnpm run build` → refresh the parent page.** The build *is* the
bridge to the host; `dev` only runs this MFE in isolation.
