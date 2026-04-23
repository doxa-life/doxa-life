<script setup>
/**
 * RgbToggleButton — toggles a host-defined RGB raster overlay.
 * Extracted from `vue-geo-steward/src/components/mapbox/rgb-button.js`.
 * The original wired Pinia stores; this version just emits a toggle
 * event and exposes its `active` state via v-model.
 *
 * v-model — boolean (`active`)
 */
import { computed, inject, ref } from 'vue';
import MapToolbarButton from './MapToolbarButton.vue';

const mapInstance = inject('mapInstance', ref(null));
const active = defineModel({ type: Boolean, default: false });

const canShow = computed(() => Boolean(mapInstance?.value));

function toggle() {
  if (!canShow.value) return;
  active.value = !active.value;
}
</script>

<template>
  <MapToolbarButton
    icon="🌈"
    label="RGB"
    title="Toggle RGB overlay"
    :active="active"
    :disabled="!canShow"
    variant="default"
    @click="toggle"
  />
</template>

<style scoped>
/* triple-stripe border that visually evokes the RGB channels */
:deep(.gs-tbtn.is-active) {
  border-color: transparent;
  background-image:
    linear-gradient(var(--gs-tbtn-active-bg, #0f172a), var(--gs-tbtn-active-bg, #0f172a)),
    linear-gradient(135deg, #ef4444 0% 33%, #22c55e 33% 66%, #3b82f6 66% 100%);
  background-origin: border-box;
  background-clip:   padding-box, border-box;
  border: 2px solid transparent;
}
</style>
