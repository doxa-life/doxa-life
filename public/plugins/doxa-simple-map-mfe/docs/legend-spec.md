# Legend alignment spec — `LegendRows.vue`

Single source of truth for how the desktop legend (`LegendRows.vue`) aligns column headers with data rows, how badges get their gutters, and how the legend responds when content grows or shrinks.

## Goal

- Column headers (e.g. `UPGS`, `POPULATION`) and data rows (the badge values) must share exactly one set of column widths.
- Changing a header string (translation, longer label) must automatically resize the column. Zero per-element padding math. Zero JS width-measuring.
- Changing a badge value (e.g. a 10-digit population) must also resize the column, and the header re-centers above the wider column.
- Badges must have visible gutters between each other AND between the last badge and the right edge of the colored pill.
- The item-name column must absorb leftover space when the legend is wide, and must compress (with ellipsis) when badge columns grow.
- The legend panel itself must not grow without bound — it stays out of the way of the map.

## Mechanism — CSS Grid + Subgrid chain

One grid template is declared on `.lrg-items`. That element is the ONLY grid container AND the scroll container. Every descendant row (`.lrg-header`, `.lrg-row`, `.lrg-item`, `.lrg-item-inner`, `.lrg-footer`) opts into that same template via `grid-template-columns: subgrid`. As a result, header, data rows, and the colored pill all share one set of column lines.

**Why `.lrg-items` and not `.legend-row-group` as the grid root:** subgrid interacts badly with scroll containers in practice. Previously the root grid was on `.legend-row-group` and `.lrg-items` was both a subgrid AND `overflow-y: auto` — the browser did not propagate track sizing through that scroll container, so headers and rows drifted out of alignment. Putting the grid AND scroll on the same element (`.lrg-items`) avoids that conflict. Header and footer use `position: sticky` (top/bottom) to stay visible during scroll.

## Grid template

```
grid-template-columns: 16px minmax(80px, 1fr) repeat(N, auto) 10px;
```

Built dynamically from the `columns` prop. Breakdown:

| Track | Value | Purpose |
|---|---|---|
| 1 | `16px` | Caret / spacer column (fixed, matches `.legend-toggle-icon` width) |
| 2 | `minmax(80px, 1fr)` | Item-name column. Floor of 80px, absorbs leftover space, compresses to floor with `text-overflow: ellipsis` |
| 3 … 2+N | `auto` each | One per badge column. Each track auto-sizes to the widest content across **all** rows (header cell or any data badge, whichever is widest) |
| last | `10px` | Dead trailing track. Gives the colored pill a visible right margin past the last badge. Header row has nothing in it, so it's invisible there. |

`column-gap: 12px` — single uniform gutter between every column. Replaces the per-badge padding used previously.

## Column placements

| Element | `grid-column` |
|---|---|
| `.lrg-caret`, `.lrg-header-spacer` | `1` |
| `.lrg-name`, `.lrg-header-label` | `2` |
| `.lrg-badge`, `.lrg-header-col` | auto-placed into tracks `3 … 2+N` |
| `.lrg-item` (row wrapper, clickable) | `2 / -1` (spans from name column to end, skipping caret) |
| `.lrg-item-inner` (colored pill) | fills `.lrg-item` via `grid-column: 1 / -1` on its own subgrid |
| `.lrg-footer-label`, `.lrg-footer-value` | placed into same tracks as header/rows |

The colored pill (`.lrg-item-inner`) does NOT include the caret column (track 1), which is why `.lrg-item` starts at track 2.

## Policy: item-name column compresses; legend panel stays bounded

When content grows:

1. Badge columns expand first (they're `auto` — widest content wins).
2. The item-name column (`minmax(80px, 1fr)`) gives up space to badges as needed, down to 80px. Below 80px, the name truncates with `text-overflow: ellipsis`.
3. The legend panel itself has bounded width (recommended: `min-width: 280px; max-width: 420px`). It does NOT grow wider to accommodate long headers — the item-name column compresses instead.

Rationale: a floating map legend must be visually predictable. Users don't want the panel to expand and cover the map when a translation string is longer.

## Badge styling

- Background: `color-mix(in srgb, var(--lrg-item-color, #888), currentColor 22%)` — derived from the item's cell color mixed with 22% of the row's text color. Always visible on any item color; no hardcoded black/white overlay.
- The `--lrg-item-color` CSS var is set on `.lrg-item-inner` alongside `background-color`, so descendants can reference it.

## What this replaces

Previous implementation used `display: flex` at every level with `width: 72px` hardcodes on both `.lrg-header-col` and `.lrg-badge`, plus `padding-left: 10px; padding-right: 26px` on `.lrg-row`. That produced matching widths but broke whenever header text or badge text changed length — the two layouts drifted because they did not share column tracks.

## Browser support

CSS subgrid is supported in all major browsers (Chrome 117+, Safari 16+, Firefox 71+). No fallback needed as of 2026.

## Critical architectural rule — do NOT render column headers in LegendDesktop

Historically, LegendDesktop.vue rendered its OWN `<span class="legend-header-col">` labels in its `.legend-header` (a flex row with hardcoded `width: 72px` per label). That row was a SIBLING of `.legend-content` — which contains `LegendRows`. The column header (from LegendDesktop) and the data rows (from LegendRows) lived in two entirely different layout systems (flex with fixed widths vs. grid/subgrid with auto widths) and therefore **could not share column positions by construction**. Every attempt to align them via subgrid inside LegendRows was doomed because the headers were not inside the subgrid chain.

**Rule:** only LegendRows renders column-header labels. LegendDesktop's `.legend-header` row is title-only (and caret + close button). Pass `:hideColumnHeader="false"` to LegendRows on desktop. This puts the header inside the same `.lrg-items` subgrid as the data rows — pixel-perfect alignment by construction.

## What NOT to do

- Do NOT hardcode badge column widths (`72px` etc.). Let `auto` handle it.
- Do NOT set `padding` on any subgrid container — it shifts tracks inside that container and breaks alignment with the parent grid. Use `column-gap` for gutters; use the trailing `10px` dead track for the colored-pill right margin.
- Do NOT compute widths in JavaScript. The grid does it.
- Do NOT grow the legend panel to fit content. The item-name column is the release valve.

## Related files

- [src/components/LegendRows.vue](../src/components/LegendRows.vue) — implementation
- [src/components/LegendMobile.vue](../src/components/LegendMobile.vue) — mobile variant; currently uses its own grid (already partly subgrid-aware per inline comment at line 25). Not covered by this spec.
