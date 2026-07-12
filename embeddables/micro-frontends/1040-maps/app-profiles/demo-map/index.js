/**
 * app-profiles/demo-map/index.js
 *
 * Bundle entry — registers the <demo-map> web component.
 * Adapted from app-profiles/template-bundle/index.js (the copy-me reference).
 *
 * Folder name = bundle name. This folder builds to exactly one output file:
 *   app/doxa-maps/demo-map/demo-map.js
 *
 * Profiles live as FLAT .vue files DIRECTLY in this folder (demo-map.vue) —
 * no profiles/ subfolder. Each `*.vue` here = one profile.
 *
 * Usage from a host page:
 *   <script src=".../demo-map/demo-map.js"></script>
 *   <demo-map profile-config='{"profile":"demo-map","tk":"pk.eyJ..."}'></demo-map>
 */

import { defineCustomElement } from 'vue'
import { createPinia } from 'pinia'
import ProfileLoader from '@map/ProfileLoader.vue'
import { createAppI18n } from '@map/i18n/index.js'
import { registerStrategies } from '@map/colors/_registry.js'

// ─── Bundle-private profile registry ─────────────────────────────────────────
// import.meta.glob is evaluated by Vite at build time relative to THIS file, so
// it captures only THIS bundle's profiles. ProfileLoader (in @map) cannot run
// this glob itself, so the bundle hands the result over via app.provide().
const profileModules = import.meta.glob('./*.vue')

// ─── Bundle-private color strategies ─────────────────────────────────────────
// Merges ./src/colors/*.js OVER the shared library set for THIS bundle
// only. demo-map ships `single-color.js` → mode `singleColor` — the strategy
// its "Purple" tab uses. The shared `religion` strategy stays untouched. The
// glob is `*.js`, so `src/colors/colors.json` (plain values) is ignored by design.
registerStrategies(import.meta.glob('./src/colors/*.js', { eager: true }))

// ─── Register the custom element ─────────────────────────────────────────────
// One tag per bundle, named after the bundle. The guard prevents an
// "already registered" error if the IIFE is ever loaded twice on one page.
const DemoMapElement = defineCustomElement(ProfileLoader, {
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

if (typeof customElements !== 'undefined' && !customElements.get('demo-map')) {
  customElements.define('demo-map', DemoMapElement)
}

export default DemoMapElement
