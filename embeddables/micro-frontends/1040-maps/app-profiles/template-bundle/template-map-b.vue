<script setup>
/**
 * template-map-b.vue — example profile "B"
 *
 * @description Minimal example profile B — a second profile in the same bundle.
 * @profile     template-map-b
 * @bundle      template-bundle
 * @element     template-bundle
 *
 * A SECOND profile living in the SAME bundle folder, alongside
 * template-map-a.vue (both flat, no profiles/ subfolder). Both compile into the
 * single output file public/js/template-bundle.js — one bundle, two profiles.
 * The host chooses which one to show with the `profile` field:
 *
 *   <template-bundle profile-config='{"profile":"template-map-b"}'></template-bundle>
 */
import { inject, computed } from 'vue'

const config = inject('profileConfig', null)
const note = computed(() => config?.value?.note || '(no note passed in profile-config)')
</script>

<template>
  <div class="tpl tpl--b">
    <h2>Profile B</h2>
    <p>Served from <code>template-map-b.vue</code> in the <code>template-bundle</code> bundle.</p>
    <p class="note">note: {{ note }}</p>
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
.tpl--b { background: #1f0b2a; color: #d8b4fe; }
.tpl h2 { font-size: 22px; font-weight: 700; }
.tpl code { background: rgba(255, 255, 255, 0.08); padding: 1px 6px; border-radius: 4px; }
.tpl .note { font-size: 12px; opacity: 0.7; }
</style>
