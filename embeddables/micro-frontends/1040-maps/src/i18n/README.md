# i18n — modular seam

> One of the three customization seams (`color-strategies/`, `api-connections/`, **`i18n/`**).
> The Apache template ships 11 proven locales; **you add your OWN language by dropping in a
> locale folder — never by editing the engine (`index.js`).**

This seam owns every user-facing string in the map. Translations are **folder-per-locale, one
JSON file per area**, composed at build time into a Vue I18n instance — one instance per
`<doxa-map>` element so multiple embeds on a page don't bleed state.

## Layout

```
i18n/
  index.js              ← engine (don't edit to add a locale): glob-loads locales, builds createAppI18n()
  locales/
    en/                 ← one folder per locale (the fallback)
      buttons.json  legend.json  detail.json  options.json
      search.json   messages.json  aria.json  prayerLaps.json
    es/  ar/  zh/  …     ← same 8 area files, same key structure
```

| Export (`index.js`) | What it is |
|---|---|
| `createAppI18n()` | Builds a fresh Vue I18n instance. Called once per `<doxa-map>` (`app.use(createAppI18n())`). |
| `SUPPORTED_LOCALES` | `['ar','de','en','es','fr','hi','it','pt','ro','ru','zh']` — the 11 shipped locales. |
| `RTL_LOCALES` | `Set(['ar'])` — locales that render right-to-left. |
| `detectLocale()` | Reads `document.documentElement.lang` (set by Polylang on WordPress); falls back to `en`. |

## The locale contract

- **8 area files per locale**, identical names across locales: `buttons`, `legend`, `detail`,
  `options`, `search`, `messages`, `aria`, `prayerLaps`. The filename (minus `.json`) becomes the
  top-level message namespace — `buttons.json` → `$t('buttons.prayForThem')`.
- **`en/` is the source of truth and the fallback.** Mirror its key structure exactly; keys may
  nest (`buttons.speedOption.slow`). Missing keys fall back to English silently
  (`fallbackWarn`/`missingWarn` are off in the IIFE bundle).
- All catalogs are **eager-globbed and inlined** (`import.meta.glob('./locales/*/*.json', { eager:true })`)
  — required because Vite can't code-split an IIFE bundle. Don't convert to lazy/dynamic import:
  the 2026-04-26 experiment GREW the bundle ~22 KB (see the note at the top of `index.js`).

## Add a custom locale (full checklist)

1. **Copy `locales/en/` to `locales/<code>/`** (ISO-639-1, e.g. `sw`). Keep all 8 area files.
2. **Translate the values**, leaving every key in place. Don't rename or drop keys — a missing key
   reverts that one string to English; a renamed key is dead.
3. **Add `<code>` to `SUPPORTED_LOCALES`** in `index.js` (and to `RTL_LOCALES` if it reads
   right-to-left). This is the only `index.js` edit a new locale needs.
4. **Verify** the glob picked it up and keys resolve:
   ```js
   import { createAppI18n, SUPPORTED_LOCALES } from '@map/i18n/index.js'
   const i18n = createAppI18n()
   console.log(SUPPORTED_LOCALES.includes('<code>'))                 // true
   console.log(i18n.global.t('buttons.prayForThem', 1, { locale: '<code>' }))  // your translation
   ```

## How it integrates with the component library

The app-profile entry (`app-profiles/<name>/index.js`) does `app.use(createAppI18n())` alongside
`createPinia()`, so every component reaches strings through the standard `$t('area.key')` /
`useI18n()`. Initial locale comes from `detectLocale()` (the host page's `<html lang>`); the
fallback chain is `<detected> → en`. Because area files are namespaced by filename, a component
only needs the namespace it uses — e.g. a button reads `buttons.*`, the legend reads `legend.*`.
