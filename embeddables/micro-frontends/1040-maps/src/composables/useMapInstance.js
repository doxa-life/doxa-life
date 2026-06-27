/**
 * useMapInstance.js — Map Initialization Composable
 *
 * Manages a single Mapbox GL map instance lifecycle.
 * Scoped by mapId — safe to use multiple times on the same page.
 *
 * SHADOW DOM NOTES:
 *
 * 1. Container ID: Mapbox's `new mapboxgl.Map({ container: 'id' })` uses
 *    document.getElementById() which CANNOT cross shadow boundaries.
 *    Always pass the actual DOM element via a Vue template ref.
 *
 * 2. CSS timing: The Mapbox GL CSS <link> loads asynchronously. If Mapbox
 *    initializes before the CSS is applied, _detectMissingCSS fires and the
 *    canvas is sized to 0. This composable injects the CSS into the shadow
 *    root and waits for it to load before creating the Map instance.
 *
 * 3. Canvas resize: Even with correct CSS, the canvas may init at the wrong
 *    size if the container layout settles after initialization. map.resize()
 *    is called on the load event to correct this.
 *
 * Usage:
 *   const containerRef = ref(null)
 *   const { map, isMapReady, initializeMap, destroy } = useMapInstance({ containerRef, accessToken, ... })
 *   onMounted(() => initializeMap())
 */

import { ref } from 'vue'

const MAPBOX_CSS_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.24.0/mapbox-gl.css'

/**
 * Injects the Mapbox GL CSS into the shadow root that contains the given
 * element, then waits for it to finish loading.
 *
 * - Skips if the element is in the regular document (no shadow root).
 * - Skips if the CSS link is already present and loaded (idempotent).
 * - Always resolves — never hangs (2 s timeout fallback).
 */
async function ensureMapboxCSS(element) {
  const root = element.getRootNode()
  if (!(root instanceof ShadowRoot)) return   // light DOM — wrapper <link> is enough

  const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  // Already present — check if loaded via `sheet` or wait for event
  const existing = root.querySelector(`link[href="${MAPBOX_CSS_URL}"]`)
  if (existing) {
    // `sheet` is set synchronously once the stylesheet is parsed — reliable check
    if (existing.sheet) return
    // Attach listeners BEFORE checking again to avoid a race where load fires
    // between our check and adding the listener
    await Promise.race([
      new Promise(resolve => {
        existing.addEventListener('load',  resolve, { once: true })
        existing.addEventListener('error', resolve, { once: true })
      }),
      timeout(2000)
    ])
    return
  }

  // Create link element and attach listeners BEFORE inserting into DOM,
  // so we cannot miss the load event even if the browser resolves it synchronously
  const link = document.createElement('link')
  link.rel  = 'stylesheet'
  link.href = MAPBOX_CSS_URL

  await Promise.race([
    new Promise(resolve => {
      link.addEventListener('load',  resolve, { once: true })
      link.addEventListener('error', resolve, { once: true })
      root.prepend(link)   // insert AFTER attaching listeners
    }),
    timeout(2000)
  ])
}

// ─── Aspect-aware zoom-out floor (Feedback #2+#4 REDO) ───────────────────────
// We KEEP renderWorldCopies:true (infinite horizontal scroll) and instead cap
// zoom-out with a DYNAMIC minZoom floor computed from the viewport. The floor
// guarantees one world always at least fills the container WIDTH, so the user
// can never zoom out far enough to see a repeated world copy — no maxBounds, no
// disabling of world copies. Ported from FORGE 1040-maps computeWorldMinZoom.
const MERCATOR_NORTH       = 85.0511   // Web-Mercator north pole limit (±85.0511°)
const MIN_ZOOM_FLOOR       = -2        // Mapbox allows negative minZoom since v1.6.1 (PR #9028)
const FALLBACK_MIN_ZOOM    = 0         // used only when W/H not ready (corrected on first resize)
const DEFAULT_SOUTH_CUTOFF = -60       // Antarctica crop line (FLOOR-CALC INPUT ONLY)

/**
 * Web-Mercator normalized Y fraction: 0 at +85.0511° (north), 1 at -85.0511°.
 * Measures how tall a latitude band is in the projected (square) world.
 */
function mercatorY(lat) {
  return (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)) / Math.PI) / 2
}

/**
 * Computes the ASPECT-AWARE zoom-out floor (worldPx(z) = 512·2^z, tileSize 512):
 *
 *   zWidth  = log2(W / 512)              — zoom where one world fills the WIDTH.
 *       For any zoom >= zWidth the world is at least as wide as the viewport, so
 *       a second copy can never appear. Allowed to go NEGATIVE (legal since
 *       Mapbox v1.6.1) so narrow phones can still zoom out to one full world.
 *   zHeight = log2(H / (512 · bandFrac)) — zoom where the latitude-CROPPED world
 *       (north +85.0511°, south `southCutoff`) fills the HEIGHT. Cropping the
 *       empty Antarctic band (bandFrac < 1) lets portrait phones zoom out to see
 *       the populated world without the dead space forcing over-zoom-out. The
 *       crop is a FLOOR-CALC INPUT ONLY — no maxBounds, no visual clip.
 *
 * FLOOR = max(zWidth, zHeight): the less-zoomed-out (higher) of the two binds.
 * Because the result is always >= zWidth, the map can never reveal duplicate
 * worlds. Clamped to [-2, maxZoom-1]; returns a sane fallback when W/H not ready.
 */
function computeWorldMinZoom(W, H, maxZoom, southCutoff) {
  if (!W || W <= 0 || !H || H <= 0) return FALLBACK_MIN_ZOOM   // size not ready yet
  const zWidth   = Math.log2(W / 512)
  const bandFrac = mercatorY(southCutoff) - mercatorY(MERCATOR_NORTH)   // south=-60 → ~0.71
  const zHeight  = Math.log2(H / (512 * bandFrac))
  const floor    = Math.max(zWidth, zHeight)
  // Allow NEGATIVE (do NOT Math.max(0,…)); never within 1 zoom of maxZoom.
  return Math.max(MIN_ZOOM_FLOOR, Math.min(floor, (maxZoom ?? 18) - 1))
}

export function useMapInstance({
  containerRef,
  accessToken,
  style,
  center           = [20, 10],
  zoom             = 2,
  // minZoom: a profile may PIN a value (e.g. 0.5). It is treated as a LOWER
  // bound only — the composable raises it to the aspect-aware floor whenever the
  // viewport is wide enough that the pinned value would reveal a duplicate world.
  // A pinned value is therefore never lowered, only raised. Leave it undefined to
  // get the pure dynamic floor.
  minZoom          = undefined,
  maxZoom          = 18,
  pitch            = 0,
  bearing          = 0,
  renderWorldCopies = true,         // KEEP infinite worlds — zoom-out is capped by the dynamic floor
  // southCutoff: south latitude (deg) used ONLY to size the cropped world band
  // for the HEIGHT term of the floor. FLOOR-CALC INPUT ONLY — never maxBounds.
  southCutoff       = DEFAULT_SOUTH_CUTOFF,
  // maxBounds: NO default, NO derivation — the map pans infinitely. A profile may
  // still pass an explicit [[w,s],[e,n]] to cap a specific map.
  maxBounds         = undefined
}) {
  const map        = ref(null)
  const isMapReady = ref(false)
  // Holds the dynamic-minZoom resize handler so destroy() can remove it.
  let _onResize    = null
  // Holds the gray side-edge touch handlers so destroy() can remove them.
  let _detachEdgeBorders = null

  async function initializeMap() {
    if (typeof mapboxgl === 'undefined') {
      console.error('mapboxgl is not available. Add the Mapbox GL JS script to your page.')
      return
    }
    if (!containerRef.value) {
      console.error('containerRef.value is null — call initializeMap() inside onMounted()')
      return
    }

    // ─── API Key validation ──────────────────────────────────────────
    if (!accessToken) {
      console.error('No Mapbox access token provided. Pass "tk" in profile-config JSON.')
      return
    }
    if (!accessToken.startsWith('pk.')) {
      console.error('Mapbox token looks invalid (expected "pk." prefix). Got:', accessToken.slice(0, 10) + '...')
      return
    }

    // Wait for Mapbox CSS inside the shadow root before creating the Map.
    // Without this, _detectMissingCSS fires and the canvas initializes at 0px.
    await ensureMapboxCSS(containerRef.value)

    // Wait one animation frame so the browser has laid out the container.
    // Mapbox reads clientWidth/clientHeight at init — if layout hasn't settled
    // yet the canvas initializes at 0×0 and nothing renders.
    await new Promise(resolve => requestAnimationFrame(resolve))

    // ─── Dimension diagnostics ───────────────────────────────────────
    const el = containerRef.value
    const w = el.clientWidth
    const h = el.clientHeight
    if (w === 0 || h === 0) {
      console.error(`[useMapInstance] Container has ZERO dimensions (${w}×${h}). Map will be invisible. Check that parent elements have CSS sizing.`)
      // Log parent chain for debugging
      let parent = el.parentElement
      let depth = 0
      while (parent && depth < 5) {
        parent = parent.parentElement
        depth++
      }
    }

    // TODO(INT-future): Mapbox's create-web-app uses VITE_MAPBOX_ACCESS_TOKEN.
    // See intel/discovery-reports/W1A-mapbox-create-web-app-bp.md for rationale.
    // Rename deferred: MFEs reference the current name; needs a coordinated update.
    const token = accessToken
    mapboxgl.accessToken = token

    // ─── Effective zoom-out floor ────────────────────────────────────
    // floor = the aspect-aware no-duplicate-world minZoom. A profile-pinned
    // `minZoom` is honored only as a LOWER bound (raised to the floor when the
    // viewport is wide enough that the pinned value would show a second world);
    // it is never lowered. With no pin we use the pure floor. The not-ready
    // fallback is corrected by style.load + the first resize event.
    // DESKTOP-ONLY restriction (coder directive 2026-06-22): the no-duplicate-
    // world floor is a desktop concern. Mobile/tablet (< 1024px) are free to zoom
    // out as far as Mapbox allows (down to MIN_ZOOM_FLOOR), so on those viewports
    // floorFor releases the floor entirely. Centralized here so _onResize picks it
    // up automatically on an orientation/breakpoint flip into mobile.
    const isDesktop = () => typeof window !== 'undefined' && window.innerWidth >= 1024
    const floorFor = (W, H) => {
      if (!isDesktop()) return MIN_ZOOM_FLOOR   // mobile/tablet — no floor
      const f = computeWorldMinZoom(W, H, maxZoom, southCutoff)
      return (typeof minZoom === 'number') ? Math.max(minZoom, f) : f
    }
    const initialMinZoom = floorFor(el.clientWidth, el.clientHeight)

    map.value = new mapboxgl.Map({
      accessToken: token,              // BP #1 from W1A — per-instance token; avoids last-writer-wins on multi-embed pages
      container: containerRef.value,   // real DOM element — never a string ID in shadow DOM
      style,
      center,
      zoom,
      minZoom: initialMinZoom,
      maxZoom,
      pitch,
      bearing,
      dragRotate: false,           // disorienting north-drift: no right-click+drag bearing change (desktop)
      touchPitch: false,           // no two-finger pitch on touch devices
      renderWorldCopies,           // true → infinite worlds; zoom-out capped by the dynamic floor
      // NOTE: cooperativeGestures (the two-finger-to-zoom requirement) was REMOVED
      // per coder directive 2026-06-24 — one-finger interaction must work normally.
      // The single-finger page-scroll escape is now the gray side-edge affordance
      // wired below (showEdgeBorders): the .map-scroll-edge gutters flash gray while
      // touching the map and are scrollable to move the page past the map.
      ...(maxBounds ? { maxBounds } : {}),  // only if a profile explicitly supplied bounds
      attributionControl: false
    })

    // Belt-and-suspenders to dragRotate:false — kills the two-finger twist→rotate
    // handler so the north bearing can never drift on any input method.
    map.value.touchZoomRotate.disableRotation()

    // ─── Edge scroll-affordance strips (custom page-scroll "scrollbar") ─────────
    // The .map-scroll-edge strips (left + right, every profile: pointer-events auto,
    // touch-action pan-y) are always-present INVISIBLE hit-boxes. The gray indicator
    // (a 36px gradient at the very page edge) appears when:
    //   • you SCROLL the map — on the PRIMARY side only (RIGHT on desktop via wheel,
    //     LEFT on mobile via a one-finger drag): the side with the most whitespace;
    //   • you HOVER a strip (desktop) or TOUCH a strip (mobile) — on THAT strip, so
    //     either edge can be summoned where you reach for it. A HOVERED strip is
    //     pinned: it never auto-hides (even while you scroll) until you leave it.
    // MOBILE scrolls the page natively via the strip's touch-action: pan-y. DESKTOP
    // has NO grab/click+drag-to-scroll (removed per coder 2026-06-24) — the strip is a
    // hover indicator only; user-select:none on strips+buttons still blocks any stray
    // text selection. Desktop map click+drag (Mapbox pan) never lights it.
    // Visibility toggles via OPACITY (not a background swap) so it fades, never hard-
    // flashes, and the hit-box stays live the whole time. (coder 2026-06-24)
    {
      const wrapper = containerRef.value?.parentElement || null
      const edges = wrapper ? Array.from(wrapper.querySelectorAll('.map-scroll-edge')) : []
      if (edges.length) {
        const GRAY = 'rgba(120, 128, 134, 0.28)'
        const GRAY_W = '36px'
        const isLeftStrip = (e) => e.classList.contains('map-scroll-edge--left')
        // Pre-paint each strip's gradient once; show/hide via opacity (faded).
        for (const e of edges) {
          e.style.background = `linear-gradient(${isLeftStrip(e) ? 'to right' : 'to left'}, ${GRAY} ${GRAY_W}, transparent ${GRAY_W})`
          e.style.opacity = '0'
          e.style.transition = 'opacity 0.16s ease'
          e.style.userSelect = 'none'
          e.style.webkitUserSelect = 'none'
        }
        const show = (e) => { e.style.opacity = '1' }
        const hide = (e) => { e.style.opacity = '0' }
        // Primary side: RIGHT on desktop, LEFT on mobile.
        const primaryStrip = () => edges.find(e => (isDesktop() ? !isLeftStrip(e) : isLeftStrip(e))) || null
        const hovered = new Set()    // strips under the cursor — NEVER auto-hidden
        let touchingStrip = false    // a strip is being touched (mobile) — page-scroll flash defers to it
        let hideTimer = null
        // Hide every strip EXCEPT ones the mouse is over. A hovered strip must never
        // vanish — coder 2026-06-24: scrolling while hovered used to hide it, and you
        // had to leave and re-enter to get it back.
        const hideIdle = () => { for (const e of edges) if (!hovered.has(e)) hide(e) }
        // Map-scroll flash on the PRIMARY side, 250ms sliding hide.
        const flashPrimary = () => {
          const p = primaryStrip(); if (!p) return
          show(p)
          if (hideTimer) clearTimeout(hideTimer)
          hideTimer = setTimeout(hideIdle, 250)
        }
        const onWheel = () => { if (isDesktop()) flashPrimary() }                              // desktop scroll → right
        const onWrapTouchMove = (ev) => {
          // A one-finger drag on the MAP flashes the primary side (left on mobile). A
          // drag that STARTS on an edge strip is handled by that strip's own touchstart
          // (lights that side, not the primary) — so skip it here.
          if (!(ev.touches && ev.touches.length === 1)) return
          const t = ev.target
          if (t && t.classList && t.classList.contains('map-scroll-edge')) return
          flashPrimary()
        }
        const onWrapTouchEnd = () => { if (hideTimer) clearTimeout(hideTimer); hideIdle() }
        wrapper.addEventListener('wheel', onWheel, { passive: true })
        wrapper.addEventListener('touchmove', onWrapTouchMove, { passive: true })
        wrapper.addEventListener('touchend', onWrapTouchEnd, { passive: true })
        wrapper.addEventListener('touchcancel', onWrapTouchEnd, { passive: true })
        // PARENT-PAGE scroll also flashes the indicator, so the affordance appears whenever
        // the user scrolls the HOST page — not only when interacting with the map — teaching
        // that the edges ARE scroll handles. Skipped while a strip is being touched (that
        // strip's own touchstart already lit it, and the touch-drag is what scrolled the
        // page). Note: relies on the page scrolling `window`; hosts that scroll an inner
        // container would need that element instead. (coder 2026-06-25)
        const onPageScroll = () => { if (!touchingStrip) flashPrimary() }
        if (typeof window !== 'undefined') window.addEventListener('scroll', onPageScroll, { passive: true })
        // Per-strip: HOVER (desktop) pins+lights that strip until you leave it; TOUCH
        // (mobile) lights it while pressed. (Desktop click+drag-to-scroll was removed
        // per coder 2026-06-24 — the strip is hover-indicator only on desktop; mobile
        // still scrolls the page natively via the strip's touch-action: pan-y.)
        const stripCleanups = []
        for (const e of edges) {
          const onEnter = () => { hovered.add(e); show(e) }
          const onLeave = () => { hovered.delete(e); hide(e) }
          const onTStart = () => { touchingStrip = true; show(e) }
          const onTEnd = () => { touchingStrip = false; hide(e) }
          e.addEventListener('mouseenter', onEnter)
          e.addEventListener('mouseleave', onLeave)
          e.addEventListener('touchstart', onTStart, { passive: true })
          e.addEventListener('touchend', onTEnd, { passive: true })
          stripCleanups.push(() => {
            e.removeEventListener('mouseenter', onEnter)
            e.removeEventListener('mouseleave', onLeave)
            e.removeEventListener('touchstart', onTStart)
            e.removeEventListener('touchend', onTEnd)
          })
        }
        _detachEdgeBorders = () => {
          if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
          wrapper.removeEventListener('wheel', onWheel)
          wrapper.removeEventListener('touchmove', onWrapTouchMove)
          wrapper.removeEventListener('touchend', onWrapTouchEnd)
          wrapper.removeEventListener('touchcancel', onWrapTouchEnd)
          if (typeof window !== 'undefined') window.removeEventListener('scroll', onPageScroll)
          for (const c of stripCleanups) c()
          for (const e of edges) hide(e)
        }
      }
    }

    // ─── Keep the aspect-aware floor in sync on resize / orientation flip ──
    // Recompute from the live container W AND H and setMinZoom so the floor
    // always tracks max(one-world-fills-width, cropped-world-fills-height) — never
    // two worlds at once, but low enough on tall/portrait phones to see the whole
    // world. Portrait↔landscape flips which term binds; if the new floor is above
    // the current zoom, snap up so the camera stays within the floor.
    _onResize = () => {
      const m = map.value
      if (!m) return
      const floor = floorFor(el.clientWidth, el.clientHeight)
      m.setMinZoom(floor)
      if (m.getZoom() < floor) m.setZoom(floor)
    }
    // Mapbox fires 'resize' after map.resize(); also listen to window resize +
    // orientationchange so panel toggles / breakpoints / device rotation recompute.
    map.value.on('resize', _onResize)
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', _onResize)
      window.addEventListener('orientationchange', _onResize)
    }

    map.value.on('style.load', () => {
      // Resize after style.load in a rAF: container layout may not have settled yet,
      // especially when the panel was hidden (display:none) at startup.
      requestAnimationFrame(() => {
        map.value?.resize()
        // Recompute the floor now the container has a real width/height (init may
        // have used the not-ready fallback).
        if (map.value) map.value.setMinZoom(floorFor(el.clientWidth, el.clientHeight))
        isMapReady.value = true
      })
    })
  }

  function destroy() {
    if (map.value) {
      // Tear down the dynamic-minZoom handlers (mirrors registration above).
      if (_onResize) {
        map.value.off('resize', _onResize)
        if (typeof window !== 'undefined') {
          window.removeEventListener('resize', _onResize)
          window.removeEventListener('orientationchange', _onResize)
        }
        _onResize = null
      }
      // Tear down the gray side-edge touch handlers (mirrors registration above).
      if (_detachEdgeBorders) { _detachEdgeBorders(); _detachEdgeBorders = null }
      map.value.remove()
      map.value = null
      isMapReady.value = false
    }
  }

  return { map, isMapReady, initializeMap, destroy }
}
