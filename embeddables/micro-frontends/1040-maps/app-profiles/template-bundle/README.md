# template-bundle — a minimal multi-profile bundle (flat design)

A copy-me example of the **one folder = one bundle, many profiles** pattern. It is
intentionally tiny: two trivial profiles that render a colored box, no Mapbox, no
data. Use it as the skeleton when you start a new map bundle.

## What's in this folder

```
app-profiles/template-bundle/
├── index.js              ← bundle entry: registers <template-bundle>, globs ./*.vue
├── index.html            ← dev staging page (required for the build to discover the bundle)
├── template-map-a.vue    ← profile "template-map-a"   ← FLAT, directly in the folder
└── template-map-b.vue    ← profile "template-map-b"   ← FLAT, directly in the folder
```

It builds into **one** file:

```
../../../public/js/template-bundle.js
```

## The flat design (no `profiles/` subfolder)

The `.vue` profile files sit **directly in the bundle folder**, side by side with
`index.js`. There is **no nested `profiles/` subfolder**.

```
template-bundle/
   index.js
   template-map-a.vue      ✅ flat — discovered
   template-map-b.vue      ✅ flat — discovered

   profiles/
      template-map-c.vue   ❌ would NOT be discovered
```

This is because the bundle entry discovers profiles with a **flat glob**:

```js
// index.js
const profileModules = import.meta.glob('./*.vue')   // ← './*.vue', not './profiles/*.vue'
```

`./*.vue` matches files in this folder only. A `profiles/` subfolder would need
`./profiles/*.vue`, which the entry does **not** use — so keep your profiles flat.

## How the pieces map together

| Thing | Value here | Rule |
|---|---|---|
| Folder name | `template-bundle` | = the bundle name |
| Output file | `../../../public/js/template-bundle.js` | `<folder>.js` |
| Custom element tag | `<template-bundle>` | registered in `index.js` |
| Profile files | `template-map-a.vue`, `template-map-b.vue` | each `*.vue` = one profile |
| Profile name | `template-map-a` / `template-map-b` | the filename without `.vue` |

One bundle, two profiles. The page picks which profile to render with the
`profile` field of `profile-config` — both profiles share the single
`template-bundle.js`.

## Embed it

```html
<script src="/js/template-bundle.js"></script>

<!-- profile A -->
<template-bundle profile-config='{"profile":"template-map-a"}'></template-bundle>

<!-- profile B — same bundle, different profile -->
<template-bundle profile-config='{"profile":"template-map-b"}'></template-bundle>
```

(`profile` must match a `.vue` filename in this folder, without the `.vue`.)

## Build / preview

```bash
# build just this bundle → ../../../public/js/template-bundle.js
BUNDLE=template-bundle npm run build:bundle

# or build every bundle
npm run build

# preview in isolation (HMR) — open the staging page for this bundle
npm run dev
```

## Add a third profile

Drop another flat `.vue` next to the others — no config to edit:

```bash
#   app-profiles/template-bundle/template-map-c.vue
npm run build      # → still one file, template-bundle.js, now with 3 profiles
```

Then request it: `<template-bundle profile-config='{"profile":"template-map-c"}'></template-bundle>`.

## See also

- `../README.md` — the app-profiles authoring guide (bundle pattern, embed template, `@map` blocks)
- `../../CONTRIBUTING.md` — build vs dev, the two CDN modes, partner-site embedding
- `../doxa-simple-map/index.js` — a fuller, real-map reference bundle entry
