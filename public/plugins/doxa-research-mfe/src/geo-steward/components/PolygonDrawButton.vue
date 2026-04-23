<script setup>
/**
 * PolygonDrawButton — toggles MapboxDraw polygon-draw mode.
 * Ported from `vue-geo-steward/src/components/mapbox/polygon-draw-button.js`.
 *
 * Reads `drawInstance` + `isDrawReady` via `inject()` from a parent
 * `<MapboxCanvas>`. No store coupling.
 *
 * Emits:
 *   change — true when entering draw mode, false when exiting
 */
import { ref, computed, inject, watch, onBeforeUnmount } from 'vue';
import MapToolbarButton from './MapToolbarButton.vue';

const drawInstance = inject('drawInstance', ref(null));
const isDrawReady  = inject('isDrawReady',  ref(false));

const emit = defineEmits(['change']);

const isDrawing = ref(false);

const canDraw = computed(() => Boolean(drawInstance?.value) && isDrawReady.value);

function toggle() {
  const draw = drawInstance?.value;
  if (!draw) return;
  if (isDrawing.value) {
    draw.changeMode('simple_select');
    isDrawing.value = false;
  } else {
    draw.changeMode('draw_polygon');
    isDrawing.value = true;
  }
  emit('change', isDrawing.value);
}

// reset when draw becomes unavailable
watch(canDraw, (v) => { if (!v) isDrawing.value = false; });
onBeforeUnmount(() => {
  if (isDrawing.value && drawInstance?.value) {
    try { drawInstance.value.changeMode('simple_select'); } catch (_) {}
  }
});
</script>

<template>
  <MapToolbarButton
    :icon="isDrawing ? '✕' : '▱'"
    :label="isDrawing ? 'Cancel' : 'Draw'"
    :title="isDrawing ? 'Cancel drawing' : 'Draw polygon'"
    :active="isDrawing"
    :disabled="!canDraw"
    variant="info"
    @click="toggle"
  />
</template>
