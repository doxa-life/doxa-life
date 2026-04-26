/**
 * entry.js — Web Component Registration
 *
 * This is the ONLY file that touches the browser's custom elements API.
 * Registers <doxa-map> and wires up per-instance Pinia + per-instance i18n.
 *
 * Locale detection: reads document.documentElement.lang (set by Polylang on the
 * WordPress host). Falls back to 'en'. See src/i18n/index.js.
 *
 * Mapbox RTL text plugin: registered ONCE at module init (before any map
 * constructs), lazy-loads when Arabic/Hebrew text appears on the basemap.
 *
 * WordPress usage (new pattern — v2):
 *   <script src="/wp-content/map-app.iife.js"></script>
 *   <doxa-map profile="doxa-simple-map" data-source="pray-tools">
 *     <doxa-map-tab id="prayer"></doxa-map-tab>
 *   </doxa-map>
 *
 * Legacy pattern (still supported by ProfileLoader):
 *   <doxa-map profile-config='{"profile":"simple-map","tk":"pk.eyJ..."}'></doxa-map>
 */

import { defineCustomElement } from 'vue'
import { createPinia } from 'pinia'
import ProfileLoader from './ProfileLoader.vue'
import { createAppI18n } from './i18n/index.js'

// ─── Mapbox RTL text plugin — load ONCE before any map instance ──────────────
// Required for proper rendering of Arabic text on the basemap.
// Lazy = plugin loads only when RTL text is first encountered.
if (typeof window !== 'undefined' && window.mapboxgl?.setRTLTextPlugin) {
  try {
    window.mapboxgl.setRTLTextPlugin(
      'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.3.0/mapbox-gl-rtl-text.js',
      null,
      true // lazy
    )
  } catch (e) {
    // Plugin already set in this session — ignore.
  }
}

let _instanceCounter = 0

const DoxaMapElement = defineCustomElement(ProfileLoader, {
  configureApp(app) {
    const instanceId = ++_instanceCounter
    app.use(createPinia())
    app.use(createAppI18n())
  }
})

customElements.define('doxa-map', DoxaMapElement)

export default DoxaMapElement
