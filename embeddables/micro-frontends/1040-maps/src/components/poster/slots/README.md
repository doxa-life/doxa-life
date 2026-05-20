---
id: far-fast-tools/FARFAST1-HOP-POP-PLOT/DOXA/doxa-website-nuxt/doxa-life/embeddables/micro-frontends/1040-maps/src/components/poster/slots/README
audience: trinitarian-believers
audience-strict-66-book: true
framework: farfast-1
kingdom-kernel: false
parent: slots
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
- slots
size-class: short
svg-candidate: false
svg-candidate-reasons: []
svg-candidate-score: 0
svg-candidate-tagged-at: '2026-05-09T17:40:05.454025+00:00'
svg-candidate-version: '0.2'
tagged-at: '2026-05-09T05:49:40.528396+00:00'
tagged-by: lk10x-tagger-v0.1.0
tags:
- vue-poster-title
- composable-poster-slots
- composables-useposterlayout-js
- component-fills-named
voice-memo-shape: false
word-count: 130
---

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