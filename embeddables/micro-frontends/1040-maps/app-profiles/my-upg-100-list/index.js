/**
 * my-upg-100-list / index.js — Bundle entry
 *
 * Vite multi-entry build target. Emits app/my-upg-100-list.js.
 *
 * Registers ONE custom element tag:
 *   - <my-upg-100-list-map>
 *
 * Profile registry (Q3 contract): import.meta.glob is evaluated by Vite at
 * build time relative to THIS file, so it captures only this bundle's profiles.
 *
 * Spec: Map-Framework/05-apps/DOXA-MAPS/my-upg-100-list/my-upg-100-list.md
 * Validated cluster math: app-profiles/my-upg-100-list/data/clusters.json
 * Deaf PG split: app-profiles/my-upg-100-list/data/deaf-pgs.json
 */

import { defineCustomElement } from 'vue'
import { createPinia } from 'pinia'
import ProfileLoader from '@map/ProfileLoader.vue'
import { createAppI18n } from '@map/i18n/index.js'

const profileModules = import.meta.glob('./*.vue')

if (typeof window !== 'undefined' && window.mapboxgl?.setRTLTextPlugin) {
  try {
    window.mapboxgl.setRTLTextPlugin(
      'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.3.0/mapbox-gl-rtl-text.js',
      null,
      true
    )
  } catch (_) { /* already set */ }
}

function buildElement() {
  return defineCustomElement(ProfileLoader, {
    configureApp(app) {
      app.use(createPinia())
      app.use(createAppI18n())
      app.provide('profileModules', profileModules)
    }
  })
}

const MyUpg100ListMapElement = buildElement()

if (typeof customElements !== 'undefined') {
  if (!customElements.get('my-upg-100-list-map')) {
    customElements.define('my-upg-100-list-map', MyUpg100ListMapElement)
  }
}

export default MyUpg100ListMapElement
