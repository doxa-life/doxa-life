# Feature spec — Edge scroll-affordance ("scroll past the map")

> **Status:** shipped (2026-06-24). Lives in the shared template (`library/`), so every
> profile that includes the two edge strips gets it automatically.
> **Code:** `library/composables/useMapInstance.js` (the `Edge scroll-affordance strips`
> block, ~line 250) + `.map-scroll-edge` strips in each profile's template/CSS +
> `user-select:none` on `library/components/map-controls/MapControlButton.vue`.

---

## 1. The problem

A Mapbox map embedded **inline on a scrollable web page** is a scroll trap on touch
devices and a mild one on desktop:

- **Touch / mobile:** a one-finger drag that lands on the map **pans the map** instead
  of scrolling the page. The user's thumb is "stuck" on the map and the page won't move.
  End users literally report *"I can't scroll past the map."*
- The classic Mapbox fix — `cooperativeGestures` (one finger scrolls the page, two
  fingers pan, with a "use two fingers" toast) — was rejected here: the coder wants
  **one-finger interaction to work normally** (one finger pans the map), and the
  two-finger toast is intrusive.

So we need a way to let the user scroll the page past the map **without** removing
one-finger map panning, and **without words** — the affordance has to teach itself.

## 2. The solution (one sentence)

Thin **invisible hit-boxes down the left and right edges** of the map let you scroll the
page (touch `pan-y`, or mouse grab-drag), and a **contextual gray band** lights up on the
edge you reach for — so the way past the map is visible exactly when and where you need
it, and invisible otherwise.

It reads like a scrollbar that only appears when relevant. No instructions, no toast.

---

## 3. User-facing behavior matrix

`isDesktop()` = viewport width ≥ 1024px. "Primary side" = the edge with the most
whitespace next to the map: **right on desktop, left on mobile.**

| Input | Desktop (≥1024) | Mobile (<1024) |
|---|---|---|
| Scroll the **map** (mouse wheel / trackpad 2-finger) | gray flashes on the **right** (primary), 250 ms sliding hide | n/a (wheel rarely fires on touch) |
| **Scroll the parent page** (scrollbar / wheel outside the map / keys / momentum) | gray flashes on the **right** (primary) | gray flashes on the **left** (primary) |
| One-finger **drag on the map** | nothing (that's a Mapbox **pan**) | gray flashes on the **left** (primary); page scrolls via `pan-y` if the drag is on a strip |
| Two-finger gesture | n/a | **pinch-zoom** the map → **no** gray |
| **Hover** an edge strip | gray shows on **that** strip and stays **pinned** — never hides, even while scrolling, until you leave it | n/a |
| **Touch** an edge strip | n/a | gray shows on **that** strip (so the right edge can light up too) |
| **Grab** a strip (mouse down) + drag | **removed** — desktop is a hover indicator only (no grab-scroll) | page scrolls natively via `touch-action: pan-y` on the touch-drag |
| Tap (no drag) on a strip / pin / search / button | **no** gray (a tap is not a scroll) | **no** gray |

Key intent: **the indicator appears where there is room for it** (one side, not two →
half the visual noise) but the **hit-box exists on both sides** (you can always escape on
either edge — it just isn't drawn on the cramped side).

---

## 4. Implementation layers & nuances

Each of these is load-bearing; they were discovered one at a time during live testing.

### 4.1 The strips (DOM + CSS) — *per profile*
```css
.map-scroll-edge       { position:absolute; top:0; bottom:0; width:40px; z-index:2;
                         touch-action:pan-y; pointer-events:auto; background:transparent; }
.map-scroll-edge--left  { left:0; }
.map-scroll-edge--right { right:0; }
```
```html
<div class="rm-map-area">
  <div ref="mapContainer" class="rm-map-canvas" />   <!-- Mapbox mounts here -->
  <div class="map-scroll-edge map-scroll-edge--left" />
  <div class="map-scroll-edge map-scroll-edge--right" />
</div>
```
- **40 px wide** = a comfortable touch target / mouse-grab target. This is the *hit-box*,
  not the visible gray (see 4.2).
- `touch-action: pan-y` is what lets a touch-drag on the strip scroll the page natively
  on mobile — the browser does the scrolling; we don't.
- `pointer-events: auto` + `z-index: 2` puts the strip above the WebGL canvas so it
  intercepts edge drags; the map controls sit at `z-index: 10` so they still win in
  their small overlap region.
- Strips are siblings of the canvas div, **children of the map-area wrapper**. The JS
  finds them via `containerRef.value.parentElement.querySelectorAll('.map-scroll-edge')`.

### 4.2 Visible gray ≠ hit-box width (the gradient)
The hit-box is 40 px, but a 40 px solid gray bar reads as "too wide" and overlaps the
controls/search bar at the corners. So the **visible** gray is a **gradient band only at
the outer edge**:
```js
const GRAY = 'rgba(120,128,134,0.28)'
const GRAY_W = '36px'   // visible band width; < the 40px hit-box
e.style.background = `linear-gradient(${isLeft ? 'to right' : 'to left'}, ${GRAY} ${GRAY_W}, transparent ${GRAY_W})`
```
This decouples "how grabbable" (40 px) from "how wide it looks" (tunable `GRAY_W`).

### 4.3 Fade, not swap (kills the flash)
Earlier we toggled `background` on/off — it **hard-flashed** on rapid touch events. Now
the gradient is painted **once** and we toggle **opacity** with a transition:
```js
e.style.opacity = '0'; e.style.transition = 'opacity 0.16s ease'
const show = e => { e.style.opacity = '1' }
const hide = e => { e.style.opacity = '0' }
```
Opacity does not affect `pointer-events`/`touch-action`, so the hit-box stays live while
invisible.

### 4.4 One-sided "primary" on map-scroll
```js
const primaryStrip = () => edges.find(e => (isDesktop() ? !isLeftStrip(e) : isLeftStrip(e)))
```
`flashPrimary()` shows the primary strip and sets a **250 ms sliding-debounce** hide
(every scroll event resets it, so a continuous scroll keeps it solid and it vanishes
~instantly after the last event — earlier a fixed 50 ms timer flickered on slow wheels).

Triggers:
- `wheel` on the wrapper, gated `if (isDesktop())` — a wheel on a **mobile** viewport is a
  pinch-zoom, not a page scroll, so it must NOT light the bar there.
- one-finger `touchmove` on the wrapper — but **skipped if the touch started on a strip**
  (that strip's own `touchstart` lights *that* side instead of the primary), so dragging
  the right edge on mobile lights the right, not the left.

### 4.4b Parent-page scroll also flashes it (the reinforcement loop)
The bundle lives in a shadow-DOM custom element, but `window` is shared with the host
page — so we can listen to the **host page's** scroll and flash the indicator too:
```js
const onPageScroll = () => { if (!touchingStrip) flashPrimary() }
window.addEventListener('scroll', onPageScroll, { passive: true })
```
Now the bar appears **every time the user scrolls the page** (scrollbar, wheel outside
the map, keyboard, momentum) — not only when they touch the map. Each scroll teaches "the
map's edge is a scroll handle," so by the time they hit the map they already know how to
get past it. `touchingStrip` gates it so a mobile strip-drag (which itself scrolls the
page via `pan-y`) doesn't double-light the other side. Relies on the page scrolling
`window`; a host that scrolls an inner element would listen on that element instead.

### 4.5 Per-strip hover / touch — and the hover PIN
For each strip:
- `mouseenter` → add to a `hovered` set + `show(e)`; `mouseleave` → remove + `hide(e)`.
- `touchstart` → `show(e)`, `touchend` → `hide(e)` (mobile: touch the right edge → right lights).

**The hover pin (important):** `hideIdle()` hides every strip **except those in the
`hovered` set**. Without this, scrolling while hovered fired the map-scroll 250 ms hide
timer and hid the very strip under the cursor — you had to leave and re-enter to get it
back. A hovered strip must stay lit until the pointer actually leaves it:
```js
const hovered = new Set()
const hideIdle = () => { for (const e of edges) if (!hovered.has(e)) hide(e) }
```

### 4.6 No grab-to-scroll on desktop; no text selection
- **Desktop grab/click+drag-to-scroll was tried and then removed** (coder 2026-06-24):
  on desktop the strip is a **hover indicator only**, not a control. (Desktop users
  scroll the page with the wheel/scrollbar; the wheel over the map zooms, as expected.)
- **Mobile** still scrolls the page by dragging the strip — natively, via
  `touch-action: pan-y`. No JS scrolling.
- **The text-selection guard:** without it, a drag near the right edge **selects the
  control buttons' glyphs (the emoji) to copy**, because the buttons overlap the strip.
  The guard is `user-select:none` on both the strips and the `.mcb` buttons (kept even
  though there is no desktop grab handler, so a stray drag never selects anything).

### 4.7 The predecessor: `cooperativeGestures` removed
This feature replaces Mapbox `cooperativeGestures`. The map is created with one-finger
pan/zoom normal (`dragRotate:false`, `touchPitch:false`, rotation disabled) and **no**
`cooperativeGestures`, so one finger always pans the map; the edges are the escape hatch.

---

## 5. Design rationale / evolution (why it looks like this)

It took real iteration; the dead-ends are worth recording so they aren't re-tried:

1. **Both sides, 40 px solid gray** → "too wide", overlaps controls/search bar.
2. **Inset the gray 10 px** to align with the controls → broke the mobile layout
   ("not flush, glitched"). Reverted.
3. **Thin 8 px gray** → "too slim, users won't know what it's for."
4. **36 px gradient band, flush** → "the size is good." ✔ (current `GRAY_W`)
5. **Two symmetric bars** → reads as chrome. → **One contextual bar** (primary side) →
   reads as "scroll here." ✔
6. **Map-scroll only** → then added **hover (desktop) / touch (mobile)** to summon either
   side.
7. **Desktop grab-to-scroll** was added, then **removed** — it felt unnecessary on
   desktop (wheel/scrollbar already scroll the page). Desktop is now hover-indicator
   only. The **hover pin** was added at the same time: a hovered strip must never vanish
   on scroll.

The throughline: make the escape **discoverable without words** and **quiet when idle**.

---

## 6. Tuning knobs

| Want to change | Where | Current |
|---|---|---|
| Visible gray band width | `useMapInstance.js` → `GRAY_W` | `36px` |
| Gray color/opacity | `useMapInstance.js` → `GRAY` | `rgba(120,128,134,0.28)` |
| Hit-box / touch-zone width | profile CSS `.map-scroll-edge { width }` | `40px` |
| Fade speed | `useMapInstance.js` strip `transition` | `0.16s` |
| Idle-hide delay after map-scroll | `useMapInstance.js` `setTimeout(..., 250)` | `250ms` |
| Mobile/desktop split point | `useMapInstance.js` `isDesktop()` | `innerWidth >= 1024` |

---

## 7. How to add it to a NEW map profile

1. In your profile template, wrap the map canvas and add the two strips as **siblings**
   of the canvas inside the **map-area wrapper** (see 4.1).
2. Add the `.map-scroll-edge` / `--left` / `--right` CSS to your profile's shadow styles.
3. That's it — `useMapInstance` finds the strips via the wrapper and wires everything.
   No per-map JS. (Profiles without the strips simply no-op.)

---

## 8. Known limitations / future

- **Desktop is hover-indicator only.** There is no desktop grab-to-scroll (removed by
  request). Desktop users scroll the page via the wheel/scrollbar; the wheel over the
  map zooms it, as expected. If a desktop grab-scroll is ever wanted back, it lived in a
  per-strip `mousedown` handler that did `window.scrollTo` (watch out for hosts that
  scroll an inner container rather than the window).
- **Optional arrow glyph.** A thin chevron/scroll icon centered in the band could make
  the affordance even more explicit; deferred until the bare band proves insufficient.
- **Legend-resize drag** also flashes the bar (the resize handle fires the same touch
  signal). Considered acceptable ("dragging showcases it"); can be excluded by ignoring
  drags whose target is the legend resize handle.
