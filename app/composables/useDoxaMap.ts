// Loads the <doxa-map> web-component bundle for any page that embeds it. CSS
// is injected via useHead (order doesn't matter). JS is chained through
// onMounted so that mapbox-gl + geocoder are guaranteed to define
// window.mapboxgl / window.MapboxGeocoder BEFORE map-app.iife.js runs
// customElements.define('doxa-map', …) — otherwise the custom-element upgrade's
// connectedCallback calls `new mapboxgl.Map(…)` before the global exists.
// The <feedback-widget> bundle is loaded globally via nuxt.config.ts.

const MAPBOX_JS = 'https://api.mapbox.com/mapbox-gl-js/v3.24.0/mapbox-gl.js'
const MAPBOX_GEOCODER_JS = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js'

// Map of bundle keys → /public/js URLs. The IIFE bundles all register the
// same `<doxa-map>` custom element, so only one bundle should load per page.
const BUNDLES = {
  'simple-map':   '/js/doxa-simple-map.js',
  'research-map': '/js/doxa-research-map.js'
} as const
type BundleKey = keyof typeof BUNDLES

declare global {
  interface Window {
    // Set by the host before the IIFE bundle loads so the maps fetch from the
    // configured prayer API instead of the build-time baked fallback. Read by
    // getApiBaseUrl() inside the bundle. See embeddables/.../utils/apiBaseUrl.js.
    MAP_APP_API_URL?: string
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-doxa-map="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === '1') return resolve()
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true })
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.dataset.doxaMap = src
    s.onload = () => { s.dataset.loaded = '1'; resolve() }
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

/**
 * Load the Mapbox stack + a doxa-map IIFE bundle.
 *
 * @param bundle - Which IIFE to load. Defaults to 'simple-map' so existing
 *                 callers (home, pray, adopt, contact-us) don't break. The
 *                 research/index.vue page passes 'research-map' to load the
 *                 5-tab research bundle.
 */
export function useDoxaMap(bundle: BundleKey = 'simple-map') {
  const config = useRuntimeConfig()

  const MAP_APP_JS = BUNDLES[bundle]

  useHead({
    link: [
      // Warm the Mapbox CDN connection (DNS + TLS) before the script/tile requests.
      { rel: 'preconnect', href: 'https://api.mapbox.com', crossorigin: '' },
      { rel: 'stylesheet', href: 'https://api.mapbox.com/mapbox-gl-js/v3.24.0/mapbox-gl.css' },
      { rel: 'stylesheet', href: 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css' },
      // Preload the heavy scripts so the browser starts downloading them DURING
      // page parse (in parallel), instead of waiting for onMounted to request them
      // one-by-one. Execution order is still controlled by the onMounted chain.
      { rel: 'preload', as: 'script', href: MAPBOX_JS, crossorigin: '' },
      { rel: 'preload', as: 'script', href: MAP_APP_JS }
    ]
  })

  onMounted(async () => {
    try {
      // Tell the map bundle which prayer API to fetch from. Must be set before
      // the IIFE loads so getApiBaseUrl() picks it up instead of the build-time
      // fallback baked into the bundle.
      if (config.public.prayBaseUrl) {
        window.MAP_APP_API_URL = config.public.prayBaseUrl as string
      }
      // mapbox-gl and the geocoder are INDEPENDENT — load them concurrently
      // (was sequential). The map bundle needs BOTH globals defined before it
      // runs, so it still loads after both resolve. With the preload hints above
      // these are already in/near the HTTP cache, so this is mostly instant.
      await Promise.all([loadScript(MAPBOX_JS), loadScript(MAPBOX_GEOCODER_JS)])
      await loadScript(MAP_APP_JS)
    } catch (err) {
      console.error('[useDoxaMap] script load failed', err)
    }
  })
}
