<script setup>
/**
 * ProfileLoader.vue — Application Profile Loader
 *
 * The ONLY component that reads the profile-config prop.
 * Parses it → resolves the profile name → dynamically loads the profile .vue file.
 * Everything else in the app is prop-free at the web component boundary.
 *
 * WordPress sends:
 *   <doxa-map profile-config='{"profile":"doxa-simple-map","tk":"pk.eyJ...","dataSource":"pray-tools","instanceId":"prayer-map"}'></doxa-map>
 *
 * instanceId — optional. If omitted, a random ID is generated.
 * Used to isolate window events (pin click, legend open) so multiple
 * <doxa-map> embeds on the same page never interfere with each other.
 */

import { ref, computed, defineAsyncComponent, onMounted } from 'vue'
import { provide } from 'vue'
import { useUIStore }  from './stores/uiStore.js'
import { useMapStore } from './stores/mapStore.js'
import { useDataStore } from './stores/dataStore.js'

// ─── Props ───────────────────────────────────────────────────────────────────

const props = defineProps({
  /**
   * JSON string from WordPress block attribute.
   * Shape: { profile, tk, dataSource?, colorSet?, instanceId?, tabs? }
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
const dataSource   = computed(() => config.value?.dataSource || 'doxa-api')
const colorSet     = computed(() => config.value?.colorSet || 'default')

// ─── Instance ID ─────────────────────────────────────────────────────────────
// Optional in profile-config: { "instanceId": "prayer-map" }
// If not provided, a random ID is generated at mount time (stable for the element's lifetime).
// This ID scopes all window events so multiple <doxa-map> embeds never cross-talk.
const instanceId = computed(() =>
  config.value?.instanceId || ('doxa-map-' + Math.random().toString(36).slice(2, 9))
)

// ─── Profile Registry — auto-discovers src/app-profiles/*.vue ────────────────

const profileModules = import.meta.glob('./app-profiles/*.vue')

// ─── Async component — loads the resolved profile file ───────────────────────

const ProfileComponent = computed(() => {
  if (!profileName.value) return null
  const key = `./app-profiles/${profileName.value}.vue`
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

// ─── Instance-scoped Pinia stores ────────────────────────────────────────────
// ProfileLoader runs inside the correct Vue app (each <doxa-map> gets its own
// createPinia() via entry.js configureApp). Calling useXxxStore() HERE resolves
// to THIS app's Pinia instance. We provide the store instances so all descendants
// can inject them — no direct useXxxStore() calls in children, eliminating
// getActivePinia() cross-bleed when multiple <doxa-map> elements share a page.
const uiStore   = useUIStore()
const mapStore  = useMapStore()
const dataStore = useDataStore()
provide('uiStore',   uiStore)
provide('mapStore',  mapStore)
provide('dataStore', dataStore)
</script>

<template>
  <div class="profile-loader">
    <!-- Error: no profile-config prop -->
    <div v-if="!config" class="profile-error">
      <p>⚠️ <strong>doxa-map</strong>: missing or invalid <code>profile-config</code> prop.</p>
      <p>Example: <code>profile-config='{"profile":"simple-map","tk":"pk.eyJ..."}'</code></p>
    </div>

    <!-- Error: profile name not found in registry -->
    <div v-else-if="!ProfileComponent" class="profile-error">
      <p>⚠️ Profile <strong>"{{ profileName }}"</strong> not found.</p>
    </div>

    <!-- Render the matched profile -->
    <component :is="ProfileComponent" v-else />
  </div>
</template>

<!-- Non-scoped: :host must NOT be in a scoped block — Vue transforms scoped
     selectors to :host[data-v-xxx] which never matches the host element. -->
<style>
:host {
  display: block;
  position: absolute;
  inset: 0;
}
</style>

<style scoped>
.profile-loader {
  position: absolute;
  inset: 0;
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
