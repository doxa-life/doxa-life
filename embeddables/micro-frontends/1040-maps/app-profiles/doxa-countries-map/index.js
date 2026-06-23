/**
 * doxa-countries-map / index.js — Bundle entry
 *
 * Vite multi-entry build target. Emits app/doxa-countries-map.js.
 *
 * Clone of the doxa-research-map bundle (see app-profiles/doxa-research-map/).
 * Same ProfileLoader + framework; the only differences live in the
 * countries-map.vue profile: it defaults to the Countries (WAGF Regions) tab,
 * boots the legend on the Country tier, and surfaces the SemanticTreeLegend
 * Export scaffold only while that tab is active.
 *
 * Registers ONE custom-element tag that mounts the ProfileLoader:
 *   - <doxa-countries-map>   explicit tag matching the bundle name
 *
 * The profile-config attribute is parsed by ProfileLoader (in @map). `profile`
 * must match a .vue file in this bundle's profiles/ folder.
 *
 * Profile registry — Q3 contract from the migration plan: ProfileLoader lives
 * inside @map, so it cannot use import.meta.glob to reach into a bundle's
 * folder. The bundle evaluates import.meta.glob('./profiles/*.vue') HERE and
 * hands the result to the loader via app.provide('profileModules').
 */

import { defineCustomElement } from 'vue'
import { createPinia } from 'pinia'
import ProfileLoader from '@map/ProfileLoader.vue'
import { createAppI18n } from '@map/i18n/index.js'

// ─── Bundle-private profile registry ─────────────────────────────────────────
// import.meta.glob is evaluated by Vite at build time relative to THIS file —
// so it captures only this bundle's profiles.
const profileModules = import.meta.glob('./profiles/*.vue')

// ─── Mapbox RTL text plugin — load ONCE before any map instance ──────────────
if (typeof window !== 'undefined' && window.mapboxgl?.setRTLTextPlugin) {
  try {
    window.mapboxgl.setRTLTextPlugin(
      'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.3.0/mapbox-gl-rtl-text.js',
      null,
      true // lazy
    )
  } catch (_) {
    // Already set in this session — ignore.
  }
}

/**
 * Build a fresh defineCustomElement-wrapped class. Each instance gets its own
 * Pinia + i18n so multiple embeds on the same page don't bleed state.
 */
function buildDoxaCountriesMapElement() {
  return defineCustomElement(ProfileLoader, {
    configureApp(app) {
      app.use(createPinia())
      app.use(createAppI18n())
      app.provide('profileModules', profileModules)
    }
  })
}

const DoxaCountriesMapElement = buildDoxaCountriesMapElement()

// ─── Register ONE tag — <doxa-countries-map> ─────────────────────────────────
// IMPORTANT: this bundle deliberately does NOT register <doxa-map> (owned by
// doxa-simple-map) or <doxa-research-map> (owned by the doxa-research-map
// bundle). customElements.define() is one-shot per tag per page session — each
// bundle must keep its tag disjoint so an SPA that mounts more than one map
// bundle doesn't get a tag bound to the wrong bundle's profileModules. The new
// tag is fed the 'countries-map' profile via the profile-config attribute.
if (typeof customElements !== 'undefined') {
  if (!customElements.get('doxa-countries-map')) {
    customElements.define('doxa-countries-map', DoxaCountriesMapElement)
  }
}

export default DoxaCountriesMapElement
