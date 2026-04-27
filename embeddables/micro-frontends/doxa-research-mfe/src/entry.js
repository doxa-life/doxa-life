/**
 * entry.js — Web Component Registration
 *
 * This is the ONLY file that touches the browser's custom elements API.
 * Registers <doxa-map> and wires up per-instance Pinia.
 *
 * Usage (any host — WordPress, plain HTML, React, Nuxt, etc.):
 *   <script src="map-app.iife.js"></script>
 *   <doxa-map profile-config='{"profile":"example-map","tk":"pk.eyJ..."}'></doxa-map>
 *
 * Each <doxa-map> element gets its own Shadow DOM and its own Pinia instance.
 * Two maps on the same page never share state.
 */

import { defineCustomElement } from 'vue'
import { createPinia } from 'pinia'
import ProfileLoader from './ProfileLoader.vue'
import { createAppI18n } from './i18n/index.js'

let _instanceCounter = 0

const DoxaMapElement = defineCustomElement(ProfileLoader, {
  configureApp(app) {
    // Each <doxa-map> instance gets its own Pinia + i18n — no state/locale bleed between instances
    ++_instanceCounter
    app.use(createPinia())
    app.use(createAppI18n())
  }
})

// Custom element name MUST differ from doxa-simple-map-mfe's `<doxa-map>`.
// Both bundles can be loaded by the same Nuxt host (different pages), and
// customElements.define() is one-shot — whichever IIFE wins the race is
// the only registry the host can reach. Using a distinct tag here lets the
// two bundles coexist on the same SPA.
customElements.define('doxa-research-map', DoxaMapElement)

export default DoxaMapElement
