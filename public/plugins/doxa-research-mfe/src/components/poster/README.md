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
