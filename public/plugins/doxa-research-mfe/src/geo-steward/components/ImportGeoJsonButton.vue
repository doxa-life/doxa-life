<script setup>
/**
 * ImportGeoJsonButton — file-picker that parses uploaded GeoJSON and
 * emits the parsed FeatureCollection.
 */
import { ref } from 'vue';
import { useGeoJsonIO } from '../composables/useGeoJsonIO';

const props = defineProps({
  label: { type: String, default: 'Import GeoJSON' },
});
const emit = defineEmits(['imported', 'error']);

const { parseGeoJson } = useGeoJsonIO();
const fileInput = ref(null);
const busy = ref(false);

function pick() { fileInput.value?.click(); }

async function onChange(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  busy.value = true;
  try {
    const text = await file.text();
    const parsed = parseGeoJson(text);
    emit('imported', parsed);
  } catch (err) {
    emit('error', err);
  } finally {
    busy.value = false;
    e.target.value = '';
  }
}
</script>

<template>
  <span>
    <button class="import-geojson" :disabled="busy" @click="pick">
      {{ busy ? 'Reading…' : label }}
    </button>
    <input ref="fileInput" type="file" accept=".geojson,.json,application/geo+json" hidden @change="onChange" />
  </span>
</template>

<style scoped>
.import-geojson {
  padding: .5rem 1rem; background: #fff; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer;
}
.import-geojson[disabled] { opacity: .5; cursor: not-allowed; }
</style>
