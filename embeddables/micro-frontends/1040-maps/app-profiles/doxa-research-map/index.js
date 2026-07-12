/**
 * doxa-research-map / index.js — Bundle entry
 *
 * Vite multi-entry build target. Emits app/doxa-maps/doxa-research-map/doxa-research-map.js.
 *
 * Registers ONE custom-element tag that mounts ProfileLoader:
 *   - <doxa-research-map>   explicit tag matching the bundle name
 * The legacy <doxa-map> tag is owned by the doxa-simple-map bundle — this
 * bundle deliberately does not register it (see the registration comment below).
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
import { registerStrategies } from '@map/colors/_registry.js'

// ─── Bundle-private profile registry ─────────────────────────────────────────
// import.meta.glob is evaluated by Vite at build time relative to THIS file —
// so it captures only this bundle's profiles.
const profileModules = import.meta.glob('./*.vue')

// ─── Bundle-private color strategies ─────────────────────────────────────────
// Same seam as profileModules, for colors. Any `<name>.js` a contributor drops in
// this bundle's `src/colors/` folder is merged OVER the shared library set
// (same mode key = override; new key = profile-private). This bundle inlines its own
// copy of the registry (IIFE build), so registering here affects THIS bundle only.
// This bundle ships THREE research-only strategies: affinity-block.js,
// doxa-region.js, resource.js (shared modes like religion stay in the library).
registerStrategies(import.meta.glob('./src/colors/*.js', { eager: true }))

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
      // Install i18n AND hand the instance to ProfileLoader by reference. The
      // defineCustomElement root cannot use useI18n() (see ProfileLoader.vue);
      // it drives locale through this provided instance instead.
      const i18n = createAppI18n()
      app.use(i18n)
      app.provide('appI18n', i18n)
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
