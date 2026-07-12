<script setup>
/**
 * ProfileLoader.vue — Application Profile Loader
 *
 * The ONLY component that reads the profile-config prop.
 * Parses it → resolves the profile name → dynamically loads the profile .vue file.
 * Everything else in the app is prop-free at the web component boundary.
 *
 * Usage:
 *   <doxa-map profile-config='{"profile":"example-map","tk":"pk.eyJ...","instanceId":"my-map"}'></doxa-map>
 *
 * instanceId — optional. If omitted, a random ID is generated.
 * Used to isolate window events so multiple <doxa-map> embeds on the same page
 * never interfere with each other.
 */

import { computed, defineAsyncComponent, provide, inject, watchEffect } from 'vue'
import { SUPPORTED_LOCALES } from './i18n/index.js'
import { useUIStore }   from './stores/uiStore.js'
import { useMapStore }  from './stores/mapStore.js'
import { useDataStore } from './stores/dataStore.js'
import sourcesConfig from './api/sources.json'

// ─── Props ───────────────────────────────────────────────────────────────────

const props = defineProps({
  /**
   * JSON string passed as an HTML attribute.
   * Shape: { profile, tk, instanceId?, dataSource?, tabs?, colorSet? }
   */
  profileConfig: {
    type: String,
    default: ''
  }
})

// ─── Parse profile-config ─────────────────────────────────────────────────────

const config = computed(() => {
  if (!props.profileConfig) return null
  try {
    return JSON.parse(props.profileConfig)
  } catch (e) {
    console.error('[ProfileLoader] Invalid profile-config JSON:', props.profileConfig)
    return null
  }
})

const profileName  = computed(() => config.value?.profile || null)
const mapboxToken  = computed(() => config.value?.tk || '')
// Default to the CONFIGURED active source from sources.json (e.g. 'pray-tools', the live API)
// — NOT a hardcoded 'doxa-csv'. A host/gem-frame that embeds the bundle without an explicit
// profile-config.dataSource (the platform case) was silently falling back to 'doxa-csv', whose
// RELATIVE CSV path 404s off the CDN origin → the map loaded but NO data fetch fired (looked
// like an "API access" problem; the API is actually CORS-open). Honoring sources.json's
// activeSource makes the bundle render live data by default on any host, while still letting a
// host override via profile-config.dataSource. (doxa-csv stays the final offline fallback.)
const dataSource   = computed(() => config.value?.dataSource || sourcesConfig.activeSource || 'doxa-csv')
const colorSet     = computed(() => config.value?.colorSet || 'default')

// ─── Per-map language override (single keystone for ALL profiles) ─────────────
// `profile-config.locale` is the established contract — the host Nuxt page passes
// its @nuxtjs/i18n locale this way (see research-map.vue), used for both UI chrome
// and API `lang`. `lang` is accepted as an alias (the loc-002 card's wording).
// Setting it HERE activates every existing t() string per-map — geocoder, tabs,
// legend, search — for every profile, not just research-map. Validated against the
// shipped catalogs; an unknown/absent value leaves the i18n-detected default
// (document.documentElement.lang → 'en') untouched.
const lang = computed(() => {
  const raw = (config.value?.locale || config.value?.lang || '').split('-')[0].toLowerCase()
  return SUPPORTED_LOCALES.includes(raw) ? raw : ''
})
// CRITICAL: this component is the ROOT of a defineCustomElement. vue-i18n's
// useI18n() CANNOT resolve its injection at the custom-element root — it throws
// "Need to install with `provide` function" and the entire map fails to mount
// (blank gem frames on staging). This is true even though plain inject() works
// at the root (profileModules below resolves fine). So instead of useI18n(), we
// take the i18n INSTANCE the bundle entry installed — handed to us by reference
// via provide('appI18n') — and drive its global locale directly. Descendant
// components (geocoder, legend, tabs, LanguageSelector) are NOT the CE root, so
// they keep using useI18n() normally. See docs/DIAGNOSIS-emergency-staging-fix.md.
const appI18n = inject('appI18n', null)
watchEffect(() => { if (lang.value && appI18n) appI18n.global.locale.value = lang.value })
// Effective locale for non-i18n descendants (the geocoder reads useI18n directly).
const effectiveLocale = computed(() => lang.value || appI18n?.global?.locale?.value || 'en')

// ─── Instance ID ─────────────────────────────────────────────────────────────
// Optional in profile-config: { "instanceId": "my-map" }
// If not provided, a random ID is generated (stable for the element's lifetime).
// This ID scopes all cross-instance events so multiple <doxa-map> embeds never cross-talk.
const instanceId = computed(() =>
  config.value?.instanceId || ('doxa-map-' + Math.random().toString(36).slice(2, 9))
)

// ─── Profile Registry — provided by bundle entry ────────────────────────────
// The bundle entry (app-profiles/<bundle>/index.js) MUST run
//   app.provide('profileModules', import.meta.glob('./*.vue'))
// because import.meta.glob cannot cross package boundaries — it must be
// evaluated by the bundle that owns the profile .vue files.

const profileModules = inject('profileModules', null)
if (!profileModules) {
  throw new Error('[ProfileLoader] No profileModules provided. Bundle entry must `app.provide("profileModules", import.meta.glob("./*.vue"))`')
}

// ─── Async component — loads the resolved profile file ───────────────────────

const ProfileComponent = computed(() => {
  if (!profileName.value) return null
  const key = `./${profileName.value}.vue`
  if (!profileModules[key]) {
    console.error(`[ProfileLoader] Profile not found: "${profileName.value}". Available:`, Object.keys(profileModules))
    return null
  }
  return defineAsyncComponent(profileModules[key])
})

// ─── Provide parsed config to all descendants ────────────────────────────────
// Profile components and composables read these via inject() — no prop-drilling

provide('mapboxToken',   mapboxToken)
provide('dataSource',    dataSource)
provide('colorSet',      colorSet)
provide('profileConfig', config)
provide('instanceId',    instanceId)
provide('lang',          effectiveLocale)

// ─── Instance-scoped Pinia stores ────────────────────────────────────────────
// ProfileLoader runs inside the correct Vue app (each <doxa-map> gets its own
// createPinia() via entry.js configureApp). Calling useXxxStore() HERE resolves
// to THIS app's Pinia instance. We provide the store instances so all descendants
// can inject them — no direct useXxxStore() calls in children, eliminating
// getActivePinia() cross-bleed when multiple <doxa-map> elements share a page.
const uiStore   = useUIStore()
const mapStore  = useMapStore()
const dataStore = useDataStore()

// Restore the persisted theme HERE — synchronously in setup, before any profile
// renders or creates its map. This is the SHARED boot so every profile is fixed
// at once (not each remembering to call uiStore.init() in onMounted). Without it,
// a profile that doesn't call init() (e.g. doxa-simple-map) renders LIGHT while
// the map's bootStyle() reads localStorage 'dark' directly → UI/map theme desync
// on reload. Doing it pre-render also kills the brief light→dark flash on the
// profiles that DO hydrate later in onMounted. init() (onMounted) still runs for
// the ResizeObserver / matchMedia listeners; setTheme is idempotent so the re-apply
// is harmless. (staging bug, coder 2026-06-25: dark selected + reload → map dark, UI light.)
if (typeof localStorage !== 'undefined') {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) uiStore.setTheme?.(savedTheme)
}

provide('uiStore',   uiStore)
provide('mapStore',  mapStore)
provide('dataStore', dataStore)
</script>

<template>
  <div class="profile-loader">
    <!-- Error: no profile-config prop -->
    <div v-if="!config" class="profile-error">
      <p>⚠️ <strong>doxa-map</strong>: missing or invalid <code>profile-config</code> prop.</p>
      <p>Example: <code>profile-config='{"profile":"example-map","tk":"pk.eyJ..."}'</code></p>
    </div>

    <!-- Error: profile name not found in registry -->
    <div v-else-if="!ProfileComponent" class="profile-error">
      <p>⚠️ Profile <strong>"{{ profileName }}"</strong> not found.</p>
    </div>

    <!-- Render the matched profile -->
    <component :is="ProfileComponent" v-else />
  </div>
</template>

<style scoped>
.profile-loader {
  width: 100%;
  height: 100%;
  position: relative;
}

.profile-error {
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
}
</style>
