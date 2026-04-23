<script setup>
/**
 * ExportGeoJsonButton — triggers download of a GeoJSON FeatureCollection.
 * Uses useGeoJsonIO under the hood.
 */
import { ref } from 'vue';
import { useGeoJsonIO } from '../composables/useGeoJsonIO';

const props = defineProps({
  features: { type: Array, required: true },
  filename: { type: String, default: 'export.geojson' },
  metadata: { type: Object, default: () => ({}) },
  label:    { type: String, default: 'Export GeoJSON' },
});

const { exportGeoJson } = useGeoJsonIO();
const busy = ref(false);

async function handleClick() {
  if (busy.value) return;
  busy.value = true;
  try {
    await exportGeoJson(props.features, {
      filename: props.filename,
      metadata: props.metadata,
    });
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <button class="export-geojson" :disabled="busy || !features.length" @click="handleClick">
    <span>{{ busy ? 'Exporting…' : label }}</span>
  </button>
</template>

<style scoped>
.export-geojson {
  padding: .5rem 1rem; background: #fff; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;
}
.export-geojson[disabled] { opacity: .5; cursor: not-allowed; }
</style>
