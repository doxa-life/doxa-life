---
id: far-fast-tools/FARFAST1-HOP-POP-PLOT/DOXA/doxa-website-nuxt/doxa-life/embeddables/micro-frontends/1040-maps/src/components/poster/README
audience: trinitarian-believers
audience-strict-66-book: true
framework: farfast-1
kingdom-kernel: false
parent: poster
path-tags:
- far-fast-tools
- FARFAST1-HOP-POP-PLOT
- DOXA
- doxa-website-nuxt
- doxa-life
- embeddables
- micro-frontends
- 1040-maps
- src
- components
- poster
size-class: short
svg-candidate: false
svg-candidate-reasons: []
svg-candidate-score: 0
svg-candidate-tagged-at: '2026-05-09T17:40:05.453429+00:00'
svg-candidate-version: '0.2'
tagged-at: '2026-05-09T05:49:40.231696+00:00'
tagged-by: lk10x-tagger-v0.1.0
tags:
- export-posterpreview-vue
- posterdialog-vue-modal
- composable-poster-slots
- config-postersizes-js
- drive-usemapposter-useposterlayout
- dialog-preview
voice-memo-shape: false
word-count: 161
---

# template/src/components/poster/

> **Poster export UI.** The dialog and preview surfaces that drive `useMapPoster` / `usePosterLayout`. Used by `research-map.vue` for printable posters.

| File / folder | Role |
|---|---|
| `PosterDialog.vue` | Modal that lets the user pick page size, orientation, and title; triggers the export. |
| `PosterPreview.vue` | Live preview of the assembled poster — updates as the user changes settings. |
| `slots/` | Composable poster slots — see subfolder README. |

## Wiring

- `PosterDialog` reads from `inject('uiStore')` for open/close state.
- The preview is fed by `useMapPoster()` (in `template/src/composables/useMapPoster.js`).
- Page sizes come from `template/src/config/posterSizes.js`.
- Defaults (font, padding, theme) come from `template/src/config/posterDefaults.js`.

## Cross-references

- Composables → `../../composables/useMapPoster.js`, `usePosterLayout.js`, `useStaticImage.js`
- Print/export pattern → [`/docs/print-export/`](../../../../docs/print-export/)
- Research-map archetype → [`/docs/research-maps/research-map-profile.md`](../../../../docs/research-maps/research-map-profile.md)
- Poster research → [`/intel/discovery-reports/02-poster-printing-research.md`](../../../../intel/discovery-reports/02-poster-printing-research.md)

## Next

If you add a new poster size, edit `config/posterSizes.js`. If you add a new slot type, drop a `.vue` into `./slots/` and document in that folder's README.