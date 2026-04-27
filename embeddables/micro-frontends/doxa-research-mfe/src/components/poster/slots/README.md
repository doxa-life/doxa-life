# template/src/components/poster/slots/

> **Pluggable poster slots.** Each slot is a small Vue component that fills one named region (title, legend, footer, etc.) of the assembled poster.

| File | Slot region |
|---|---|
| `TitleSlot.vue` | Top-of-poster title block (text + optional subtitle). |

## Conventions

- Each slot is self-contained; receives data via props, reads no stores.
- Slot dimensions come from the layout returned by `usePosterLayout()`.
- Styling stays inside the component; print CSS lives at the poster-document level (iframe), not in the slot.

## Cross-references

- Layout composable → `../../../composables/usePosterLayout.js`
- Composing composable → `../../../composables/useMapPoster.js`
- Print pipeline → [`/docs/print-export/`](../../../../../docs/print-export/)

## Next

To add a new slot (e.g., `LegendSlot.vue`, `FooterSlot.vue`): create the component here, register it in the layout config (`config/posterDefaults.js`), and update this README's file table.
