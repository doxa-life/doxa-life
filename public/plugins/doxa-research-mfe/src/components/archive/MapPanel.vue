<script setup>
/**
 * MapPanel.vue — Single map panel for use inside TabLayout
 *
 * Accepts center, zoom, style as props so each tab can configure its own view.
 * Uses the shadow DOM-safe element ref pattern (no string container ID).
 */

import { inject, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useMapInstance } from '../../composables/useMapInstance.js'

const props = defineProps({
  mapStyle: { type: String, default: 'mapbox://styles/mapbox/light-v11' },
  center:   { type: Array,  default: () => [20, 10] },
  zoom:     { type: Number, default: 2 },
  /**
   * markers: Array of { lng, lat, color?, label? }
   * Pins are placed once the map `load` event fires.
   * Click a pin to open its label popup.
   */
  markers:  { type: Array,  default: () => [] }
})

const mapboxToken  = inject('mapboxToken')
const mapContainer = ref(null)

const { map, isMapReady, initializeMap, destroy } = useMapInstance({
  containerRef: mapContainer,
  accessToken:  mapboxToken.value,
  style:        props.mapStyle,
  center:       props.center,
  zoom:         props.zoom
})

// Drop pins once the map tile-load is complete
watch(isMapReady, (ready) => {
  if (!ready || !map.value) return
  props.markers.forEach((m) => {
    const pin = new mapboxgl.Marker({ color: m.color ?? '#ef4444' })
      .setLngLat([m.lng, m.lat])
    if (m.label) {
      pin.setPopup(
        new mapboxgl.Popup({ offset: 25, closeButton: false }).setText(m.label)
      )
    }
    pin.addTo(map.value)
  })
})

onMounted(()       => initializeMap())
onBeforeUnmount(() => destroy())
</script>

<template>
  <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" />
  <div class="map-panel">
    <div v-if="!isMapReady" class="map-loading">Loading…</div>
    <div ref="mapContainer" class="map-canvas" />
  </div>
</template>

<style scoped>
.map-panel {
  width: 100%;
  height: 100%;
  position: relative;
}
.map-canvas {
  width: 100%;
  height: 100%;
}
.map-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1f2937;
  color: #6b7280;
  font-size: 13px;
  font-family: sans-serif;
  z-index: 1;
}
</style>
