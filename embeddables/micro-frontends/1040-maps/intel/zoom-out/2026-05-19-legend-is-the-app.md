# Zoom-Out: The legend IS the app

**Date:** 2026-05-19
**Session:** 85e9db765e8dccad (coordinator, 1040-maps)
**Reframing question answered:** Why does every build wave end with legend fixes?

---

## Core tension

The 1040-maps legend is not a sidebar UI element — it is the primary interaction surface of every map, and it is being treated as a secondary concern that gets patched after each feature wave.

## What the local work keeps doing about it

Every build wave follows the same arc: land a major feature (research map port, modern styling, prayer ripple, geo-steward migration), then spend 5-15 iterative commits fixing legend behavior — height, collapse state, mobile parity, tab memory, caret alignment, scroll overflow, pill styling. The commit history on `maps` tells the story: "Research map iter-1" through "iter-21" are overwhelmingly legend fixes. The current session immediately surfaced three more legend issues from a single tablet test. The predecessor session's geo-steward migration landed 65 files in one night, but the *next* session's first QA pass is... legend height on tablet.

## The reframe

The legend is not a component that accompanies the map. It is the app's primary navigation, selection, filtering, and detail-display surface. On mobile/tablet it occupies 30-90% of viewport. It has a tri-state height machine, a mode switcher (prayer/detail), per-tab tier memory, collapsed-pill mode, semantic tree rendering, flat-row rendering, and a detail panel that swaps in-place. It is, by complexity and interaction surface area, a larger application than the Mapbox canvas it sits beside.

Treating it as "the legend" — a secondary annotation layer — causes two downstream failures:

1. **No acceptance criteria before build.** Features land without specifying legend behavior, so legend bugs are discovered post-hoc via QA rather than prevented by spec.
2. **No tablet/mobile-first design.** The legend is designed desktop-first and then reactively patched for smaller viewports, despite mobile/tablet being the primary consumption context for maps serving disciples in high-security countries.

## What changes if we accept the reframe

- **Legend behavior becomes a first-class section in every feature spec.** Before any builder spawns, the card must answer: what does the legend do when this feature activates? What height state? What mode? What happens on mobile?
- **Tablet is the reference viewport, not desktop.** The Driver just tested on tablet and found it "works pretty good" — that's the target device. Desktop is the secondary viewport. Design legend from tablet up, not desktop down.
- **The legend gets its own QA checklist.** A standing 5-item gate: (1) content-fit height, (2) no bottom underlap, (3) detail-mode collapses legend, (4) touch targets >= 44px, (5) collapsed pill accessible on all tabs.
- **The geo-steward migration (sitting unpushed in Map-Framework) must include legend integration spec before merging.** 65 files of backend + components without a legend spec = another round of post-hoc legend fixes.
- **Consider extracting legend into its own composable with explicit viewport contracts** rather than patching CSS per-map. The current approach (SemanticTreeLegend.vue at 838 lines + uiStore legend state machine) is one component doing too many jobs across too many viewport assumptions.

## Reframing question for the next session

If the legend is the app, should it have its own store, its own viewport-contract tests, and its own QA gate — or is the current "patch after each wave" cost acceptable given the shipping velocity it enables?
