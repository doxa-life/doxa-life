<script setup>
/**
 * MapboxCanvas — Mapbox GL container that exposes `mapInstance`,
 * `drawInstance`, `isMapReady`, `isDrawReady` to descendants via
 * `provide()`. Extracted from
 * `vue-geo-steward/src/components/mapbox/mapbox-map.js` (~1900 lines)
 * with all stores, services and tileset-plotter wiring removed.
 *
 * The actual `mapboxgl` and `MapboxDraw` constructors are passed in
 * as props so the host can lazy-load them however they like — the
 * library itself stays peer-dependency-free.
 *
 * Props:
 *   mapboxgl     (Function|Object) — `mapboxgl` library
 *   MapboxDraw   (Function|null)   — optional draw library constructor
 *   accessToken  (String)          — mapbox access token
 *   center       ([lng, lat])
 *   zoom         (Number)
 *   style        (String)          — mapbox style URL
 *   drawOptions  (Object)          — passed straight to MapboxDraw
 *
 * Emits:
 *   ready          — { map, draw } once both are loaded
 *   map-load       — once `map.on('load')` fires
 *   draw-create    — proxied draw event
 *   draw-update    — proxied draw event
 *   draw-delete    — proxied draw event
 *
 * Slots:
 *   default        — overlay buttons / panels (have access to injected map)
 */
import { ref, shallowRef, onMounted, onBeforeUnmount, provide } from 'vue';

const props = defineProps({
  mapboxgl:    { type: [Function, Object], required: true },
  MapboxDraw:  { type: Function, default: null },
  accessToken: { type: String, required: true },
  center:      { type: Array,  default: () => [-98.5, 39.5] },
  zoom:        { type: Number, default: 4 },
  style:       { type: String, default: 'mapbox://styles/mapbox/streets-v12' },
  drawOptions: { type: Object, default: () => ({ displayControlsDefault: false }) },
});
const emit = defineEmits(['ready', 'map-load', 'draw-create', 'draw-update', 'draw-delete']);

const mapContainer = ref(null);
const mapInstance  = shallowRef(null);
const drawInstance = shallowRef(null);
const isMapReady   = ref(false);
const isDrawReady  = ref(false);

provide('mapInstance',  mapInstance);
provide('drawInstance', drawInstance);
provide('isMapReady',   isMapReady);
provide('isDrawReady',  isDrawReady);

onMounted(() => {
  const gl = props.mapboxgl?.default || props.mapboxgl;
  gl.accessToken = props.accessToken;

  const map = new gl.Map({
    container: mapContainer.value,
    style:     props.style,
    center:    props.center,
    zoom:      props.zoom,
  });
  mapInstance.value = map;

  map.on('load', () => {
    isMapReady.value = true;
    emit('map-load', map);

    if (props.MapboxDraw) {
      const Draw = props.MapboxDraw.default || props.MapboxDraw;
      const draw = new Draw(props.drawOptions);
      map.addControl(draw);
      drawInstance.value = draw;
      isDrawReady.value = true;
      map.on('draw.create', (e) => emit('draw-create', e));
      map.on('draw.update', (e) => emit('draw-update', e));
      map.on('draw.delete', (e) => emit('draw-delete', e));
    }
    emit('ready', { map, draw: drawInstance.value });
  });
});

onBeforeUnmount(() => {
  try { mapInstance.value?.remove(); } catch (_) { /* ignore */ }
  mapInstance.value = null;
  drawInstance.value = null;
});

defineExpose({ mapInstance, drawInstance, isMapReady, isDrawReady });
</script>

<template>
  <div class="gs-mapbox-canvas">
    <div ref="mapContainer" class="gs-mapbox-canvas__map" />
    <div class="gs-mapbox-canvas__overlay">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.gs-mapbox-canvas { position: relative; width: 100%; height: 100%; }
.gs-mapbox-canvas__map { position: absolute; inset: 0; }
.gs-mapbox-canvas__overlay {
  position: absolute; inset: 0;
  pointer-events: none;
}
.gs-mapbox-canvas__overlay > * { pointer-events: auto; }
</style>
