<script setup>
/**
 * template-map-a.vue — example profile "A"
 *
 * @description Minimal example profile A — a colored placeholder, no Mapbox or data.
 * @profile     template-map-a
 * @bundle      template-bundle
 * @element     template-bundle
 *
 * This file sits DIRECTLY in the bundle folder (app-profiles/template-bundle/),
 * NOT in a nested profiles/ subfolder. Its filename without `.vue` —
 * `template-map-a` — is the profile name you request from the host page:
 *
 *   <template-bundle profile-config='{"profile":"template-map-a"}'></template-bundle>
 *
 * A profile is a normal Vue component. It can read the host's profile-config via
 * inject('profileConfig') — the same channel the real map profiles use — without
 * any prop-drilling across the web-component boundary.
 *
 * It also shows the sandbox import boundary: this profile pulls its accent color
 * from src/colors/colors.json via a RELATIVE path (./src/...). Your own sandbox
 * code is always a relative import; the @map/... alias is only for the shared
 * library. Edit the hex values in that JSON and rebuild to recolor — no code.
 */
import { inject, computed } from 'vue'
import colors from './src/colors/colors.json'

const config = inject('profileConfig', null)
const note = computed(() => config?.value?.note || '(no note passed in profile-config)')
const accent = colors.pins.selected
</script>

<template>
  <div class="tpl tpl--a">
    <h2>Profile A</h2>
    <p>Served from <code>template-map-a.vue</code> in the <code>template-bundle</code> bundle.</p>
    <p class="note">note: {{ note }}</p>
    <p class="swatch">
      accent from <code>src/colors/colors.json</code>:
      <span class="dot" :style="{ background: accent }"></span> {{ accent }}
    </p>
  </div>
</template>

<style scoped>
.tpl {
  width: 100%; height: 100%;
  display: flex; flex-direction: column; gap: 6px;
  align-items: center; justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  text-align: center;
}
.tpl--a { background: #0b1f2a; color: #7dd3fc; }
.tpl h2 { font-size: 22px; font-weight: 700; }
.tpl code { background: rgba(255, 255, 255, 0.08); padding: 1px 6px; border-radius: 4px; }
.tpl .note { font-size: 12px; opacity: 0.7; }
.tpl .swatch { font-size: 12px; opacity: 0.85; display: flex; align-items: center; gap: 6px; }
.tpl .dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; }
</style>
