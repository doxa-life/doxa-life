<script setup>
/**
 * MapGeocoder — Mapbox geocoding search overlay with debounce + keyboard
 * navigation. Ported from `vue-geo-steward/src/components/mapbox/map-geocoder.js`.
 *
 * Pulls `mapInstance` / `isMapReady` from a parent `<MapboxCanvas>`
 * via inject. The Mapbox API key is now a prop (was `useSettingsStore`).
 *
 * Props:
 *   apiKey      (String, required)
 *   placeholder (String)
 *   debounceMs  (Number)
 *   limit       (Number)         — max results
 *   types       (String)         — mapbox geocoder `types` param
 *
 * Emits:
 *   select      — feature object the user picked
 *   error       — request error
 */
import { ref, computed, inject, watch } from 'vue';

const props = defineProps({
  apiKey:      { type: String, required: true },
  placeholder: { type: String, default: 'Search a place…' },
  debounceMs:  { type: Number, default: 250 },
  limit:       { type: Number, default: 5 },
  types:       { type: String, default: 'place,locality,neighborhood,address,poi' },
});
const emit = defineEmits(['select', 'error']);

const mapInstance = inject('mapInstance', ref(null));
const isMapReady  = inject('isMapReady',  ref(false));

const query = ref('');
const results = ref([]);
const isLoading = ref(false);
const showResults = ref(false);
const selectedIndex = ref(-1);

const canSearch = computed(() =>
  Boolean(props.apiKey && props.apiKey.trim()) && isMapReady.value);

let timer = null;
watch(query, (q) => {
  clearTimeout(timer);
  if (!q || q.trim().length < 2) {
    results.value = []; showResults.value = false; return;
  }
  timer = setTimeout(() => search(q.trim()), props.debounceMs);
});

async function search(q) {
  if (!canSearch.value) return;
  isLoading.value = true;
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
      + `?access_token=${props.apiKey}&limit=${props.limit}&types=${props.types}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Geocoding API ${r.status}`);
    const data = await r.json();
    results.value = data.features || [];
    showResults.value = results.value.length > 0;
    selectedIndex.value = -1;
  } catch (err) {
    emit('error', err);
    results.value = [];
    showResults.value = false;
  } finally {
    isLoading.value = false;
  }
}

function pick(feature) {
  showResults.value = false;
  query.value = feature.place_name || feature.text || '';
  if (mapInstance.value && Array.isArray(feature.center)) {
    mapInstance.value.flyTo({ center: feature.center, zoom: 12 });
  }
  emit('select', feature);
}

function onKey(e) {
  if (!showResults.value || results.value.length === 0) return;
  if (e.key === 'ArrowDown') { selectedIndex.value = (selectedIndex.value + 1) % results.value.length; e.preventDefault(); }
  else if (e.key === 'ArrowUp') { selectedIndex.value = (selectedIndex.value - 1 + results.value.length) % results.value.length; e.preventDefault(); }
  else if (e.key === 'Enter' && selectedIndex.value >= 0) { pick(results.value[selectedIndex.value]); e.preventDefault(); }
  else if (e.key === 'Escape') { showResults.value = false; }
}
</script>

<template>
  <div class="gs-geocoder">
    <input
      v-model="query"
      type="search"
      :placeholder="placeholder"
      :disabled="!canSearch"
      class="gs-geocoder__input"
      @keydown="onKey"
      @focus="showResults = results.length > 0"
    />
    <span v-if="isLoading" class="gs-geocoder__spinner">…</span>
    <ul v-if="showResults" class="gs-geocoder__results" role="listbox">
      <li
        v-for="(f, i) in results"
        :key="f.id || i"
        class="gs-geocoder__result"
        :class="{ 'is-active': i === selectedIndex }"
        role="option"
        @mousedown.prevent="pick(f)"
      >{{ f.place_name }}</li>
    </ul>
  </div>
</template>

<style scoped>
.gs-geocoder {
  position: relative;
  width: 320px;
  max-width: 100%;
}
.gs-geocoder__input {
  width: 100%;
  padding: .45rem .6rem;
  border: 1px solid var(--gs-input-border, #d1d5db);
  border-radius: 6px;
  background: var(--gs-input-bg, #ffffff);
  color:      var(--gs-input-fg, #111827);
  font-size: .9rem;
}
.gs-geocoder__input:disabled { background: var(--gs-input-disabled, #f3f4f6); }
.gs-geocoder__spinner { position: absolute; right: 8px; top: 8px; color: var(--gs-muted, #6b7280); }
.gs-geocoder__results {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  list-style: none; margin: 0; padding: 4px 0;
  background: var(--gs-menu-bg, #ffffff);
  border: 1px solid var(--gs-menu-border, #e5e7eb);
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0,0,0,.12);
  z-index: 1100;
  max-height: 300px;
  overflow: auto;
}
.gs-geocoder__result { padding: .35rem .6rem; cursor: pointer; font-size: .85rem; }
.gs-geocoder__result:hover, .gs-geocoder__result.is-active {
  background: var(--gs-result-hover, #e0f2fe);
}
</style>
