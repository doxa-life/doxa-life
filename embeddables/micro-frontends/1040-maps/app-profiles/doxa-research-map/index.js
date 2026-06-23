/**
 * doxa-research-map / index.js — Bundle entry
 *
 * Vite multi-entry build target. Emits app/doxa-research-map.js.
 *
 * Registers TWO custom-element tag names that mount the SAME ProfileLoader
 * (separate defineCustomElement calls — Vue's defineCustomElement returns a
 * class that registers with customElements.define exactly once per tag, so
 * reusing one class across two tags throws NotSupportedError):
 *   - <doxa-map>            legacy production tag (Q1 back-compat)
 *   - <doxa-research-map>   new explicit tag matching the bundle name
 *
 * The profile-config attribute is parsed by ProfileLoader (in @map). `profile`
 * must match a .vue file in this bundle's folder.
 *
 * Profile registry — Q3 contract from the migration plan: ProfileLoader lives
 * inside @map, so it cannot use import.meta.glob to reach into a bundle's
 * folder. The bundle evaluates import.meta.glob('./*.vue') HERE and
 * hands the result to the loader via app.provide('profileModules').
 */

import { defineCustomElement } from 'vue'
import { createPinia } from 'pinia'
import ProfileLoader from '@map/ProfileLoader.vue'
import { createAppI18n } from '@map/i18n/index.js'

// ─── Bundle-private profile registry ─────────────────────────────────────────
// import.meta.glob is evaluated by Vite at build time relative to THIS file —
// so it captures only this bundle's profiles.
const profileModules = import.meta.glob('./*.vue')

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
function buildDoxaResearchMapElement() {
  return defineCustomElement(ProfileLoader, {
    configureApp(app) {
      app.use(createPinia())
      app.use(createAppI18n())
      app.provide('profileModules', profileModules)
    }
  })
}

const DoxaResearchMapElement = buildDoxaResearchMapElement()

// ─── Register ONE tag — <doxa-research-map> ──────────────────────────────────
// IMPORTANT: this bundle deliberately does NOT register <doxa-map>. The legacy
// <doxa-map> tag is owned exclusively by the doxa-simple-map bundle. Why:
// customElements.define() is one-shot per tag per page session; if BOTH bundles
// registered <doxa-map>, an SPA user who visited /research first would have the
// research bundle's profileModules stuck on <doxa-map>, then any subsequent
// /home / /pray / /adopt navigation would render <doxa-map> with the research
// bundle's profile registry — which has 'research-map' but not 'doxa-simple-map',
// producing the "Profile not found" error. DoxaMapSlot already uses distinct
// tags per bundle (<doxa-map> vs <doxa-research-map>) — keep them disjoint here.
if (typeof customElements !== 'undefined') {
  if (!customElements.get('doxa-research-map')) {
    customElements.define('doxa-research-map', DoxaResearchMapElement)
  }
}

export default DoxaResearchMapElement
