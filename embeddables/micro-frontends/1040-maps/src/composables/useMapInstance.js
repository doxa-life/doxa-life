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

const MAPBOX_CSS_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css'

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

export function useMapInstance({
  containerRef,
  accessToken,
  style,
  center   = [20, 10],
  zoom     = 2,
  minZoom  = 0.5,
  maxZoom  = 18,
  pitch    = 0,
  bearing  = 0
}) {
  const map        = ref(null)
  const isMapReady = ref(false)

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

    map.value = new mapboxgl.Map({
      accessToken: token,              // BP #1 from W1A — per-instance token; avoids last-writer-wins on multi-embed pages
      container: containerRef.value,   // real DOM element — never a string ID in shadow DOM
      style,
      center,
      zoom,
      minZoom,
      maxZoom,
      pitch,
      bearing,
      attributionControl: false
    })

    map.value.on('style.load', () => {
      // Resize after style.load in a rAF: container layout may not have settled yet,
      // especially when the panel was hidden (display:none) at startup.
      requestAnimationFrame(() => {
        map.value?.resize()
        isMapReady.value = true
      })
    })
  }

  function destroy() {
    if (map.value) {
      map.value.remove()
      map.value = null
      isMapReady.value = false
    }
  }

  return { map, isMapReady, initializeMap, destroy }
}
