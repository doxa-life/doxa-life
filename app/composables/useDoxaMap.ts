// Loads the <doxa-map> web-component bundle for any page that embeds it. CSS
// is injected via useHead (order doesn't matter). JS is chained through
// onMounted so that mapbox-gl + geocoder are guaranteed to define
// window.mapboxgl / window.MapboxGeocoder BEFORE map-app.iife.js runs
// customElements.define('doxa-map', …) — otherwise the custom-element upgrade's
// connectedCallback calls `new mapboxgl.Map(…)` before the global exists.
// The <feedback-widget> bundle is loaded globally via nuxt.config.ts.

const MAPBOX_JS = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js'
const MAPBOX_GEOCODER_JS = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js'

// Map of bundle keys → /public/js URLs. The IIFE bundles all register the
// same `<doxa-map>` custom element, so only one bundle should load per page.
const BUNDLES = {
  'simple-map':    '/js/doxa-simple-map.js',
  'research-map':  '/js/doxa-research-map.js',
  'countries-map': '/js/doxa-countries-map.js'
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

  useHead({
    link: [
      { rel: 'stylesheet', href: 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css' },
      { rel: 'stylesheet', href: 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css' }
    ]
  })

  const MAP_APP_JS = BUNDLES[bundle]

  onMounted(async () => {
    try {
      // Tell the map bundle which prayer API to fetch from. Must be set before
      // the IIFE loads so getApiBaseUrl() picks it up instead of the build-time
      // fallback baked into the bundle.
      if (config.public.prayBaseUrl) {
        window.MAP_APP_API_URL = config.public.prayBaseUrl as string
      }
      await loadScript(MAPBOX_JS)
      await loadScript(MAPBOX_GEOCODER_JS)
      await loadScript(MAP_APP_JS)
    } catch (err) {
      console.error('[useDoxaMap] script load failed', err)
    }
  })
}
