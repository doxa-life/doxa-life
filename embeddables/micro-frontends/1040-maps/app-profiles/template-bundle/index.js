/**
 * app-profiles/template-bundle/index.js
 *
 * Bundle entry — the minimal, copy-me reference for a MULTI-PROFILE bundle.
 *
 * Folder name = bundle name. This folder builds to exactly one output file:
 *   ../../../public/js/template-bundle.js
 *
 * Both profiles in this bundle live as FLAT .vue files DIRECTLY in this folder
 * (template-map-a.vue, template-map-b.vue) — there is NO profiles/ subfolder.
 * That is the whole convention: one folder = one bundle, each `*.vue` in it = one
 * profile, all compiled into the single template-bundle.js.
 *
 * Usage from a host page:
 *   <script src="/js/template-bundle.js"></script>
 *   <template-bundle profile-config='{"profile":"template-map-a"}'></template-bundle>
 *   <template-bundle profile-config='{"profile":"template-map-b"}'></template-bundle>
 *
 * `profile` must match a .vue filename in THIS folder (without the .vue).
 */

import { defineCustomElement } from 'vue'
import { createPinia } from 'pinia'
import ProfileLoader from '@map/ProfileLoader.vue'
import { createAppI18n } from '@map/i18n/index.js'

// ─── Bundle-private profile registry ─────────────────────────────────────────
// import.meta.glob is evaluated by Vite at build time relative to THIS file, so
// it captures only THIS bundle's profiles. The glob is './*.vue' (flat) — it
// matches template-map-a.vue and template-map-b.vue sitting right here. A
// profiles/ subfolder would NOT be picked up by this glob; the design is flat.
// ProfileLoader (in @map) cannot run this glob itself — it lives in a different
// folder — so the bundle hands the result over via app.provide('profileModules').
const profileModules = import.meta.glob('./*.vue')

// ─── Register the custom element ─────────────────────────────────────────────
// One tag per bundle, named after the bundle. The guard prevents an
// "already registered" error if the IIFE is ever loaded twice on one page.
const TemplateBundleElement = defineCustomElement(ProfileLoader, {
  configureApp(app) {
    app.use(createPinia())
    app.use(createAppI18n())
    app.provide('profileModules', profileModules)
  }
})

if (typeof customElements !== 'undefined' && !customElements.get('template-bundle')) {
  customElements.define('template-bundle', TemplateBundleElement)
}

export default TemplateBundleElement
