<script setup>
/**
 * ResearchMapFilterPanel.vue — Multi-field filter UI for the research-map.
 *
 * Writes to mapStore.filters. The research-map profile watches that object
 * (deep) and forwards changes to useMapLayers.applyFilters() and
 * useMapClustering.applyFilters() — this component never touches the map.
 *
 * Filter shape (mirrors what useMapLayers expects):
 *   {
 *     populationMin: number | null,
 *     populationMax: number | null,
 *     engagement:    'any' | 'engaged' | 'unengaged',
 *     adoption:      'any' | 'adopted' | 'unadopted',
 *     languages:     string[]   // empty = no language filter
 *     religions:     string[]   // empty = no religion filter
 *   }
 *
 * Languages + religions options come from dataStore.facets (computed by
 * useMapData when normalizing). If facets aren't ready yet, we render a
 * placeholder so the panel never blocks initial paint.
 */

import { inject, computed, watch, ref } from 'vue'
import { useShadowStyles } from '@/composables/useShadowStyles.js'

const mapStore  = inject('mapStore')
const dataStore = inject('dataStore')

// ─── Default filter state — initialized into mapStore on mount ───────────────
const DEFAULTS = {
  populationMin: null,
  populationMax: null,
  engagement:    'any',
  adoption:      'any',
  languages:     [],
  religions:     []
}

if (mapStore && !mapStore.filters) mapStore.filters = { ...DEFAULTS }

// ─── Local two-way bindings (write through to mapStore.filters) ──────────────
const popMin = computed({
  get: () => mapStore?.filters?.populationMin ?? '',
  set: (v) => { mapStore.filters.populationMin = v === '' ? null : Number(v) }
})
const popMax = computed({
  get: () => mapStore?.filters?.populationMax ?? '',
  set: (v) => { mapStore.filters.populationMax = v === '' ? null : Number(v) }
})
const engagement = computed({
  get: () => mapStore?.filters?.engagement ?? 'any',
  set: (v) => { mapStore.filters.engagement = v }
})
const adoption = computed({
  get: () => mapStore?.filters?.adoption ?? 'any',
  set: (v) => { mapStore.filters.adoption = v }
})

// ─── Multi-select chips for language + religion ──────────────────────────────
const facets = computed(() => dataStore?.facets ?? {})
const languageOptions = computed(() => facets.value?.languages ?? [])
const religionOptions = computed(() => facets.value?.religions ?? [])

function toggleLang(name) {
  const arr = mapStore.filters.languages ?? []
  const idx = arr.indexOf(name)
  if (idx === -1) arr.push(name)
  else arr.splice(idx, 1)
  mapStore.filters.languages = [...arr]
}
function toggleRel(name) {
  const arr = mapStore.filters.religions ?? []
  const idx = arr.indexOf(name)
  if (idx === -1) arr.push(name)
  else arr.splice(idx, 1)
  mapStore.filters.religions = [...arr]
}

const langSearch = ref('')
const relSearch  = ref('')
const filteredLangs = computed(() => {
  const q = langSearch.value.trim().toLowerCase()
  return q ? languageOptions.value.filter(l => l.toLowerCase().includes(q)) : languageOptions.value
})
const filteredRels = computed(() => {
  const q = relSearch.value.trim().toLowerCase()
  return q ? religionOptions.value.filter(r => r.toLowerCase().includes(q)) : religionOptions.value
})

function isLangActive(name) { return (mapStore?.filters?.languages ?? []).includes(name) }
function isRelActive(name)  { return (mapStore?.filters?.religions ?? []).includes(name) }

// ─── Reset all ───────────────────────────────────────────────────────────────
function resetAll() {
  if (!mapStore) return
  mapStore.filters = { ...DEFAULTS, languages: [], religions: [] }
}

// ─── Active-count summary (for footer chip) ──────────────────────────────────
const activeCount = computed(() => {
  const f = mapStore?.filters ?? {}
  let n = 0
  if (f.populationMin != null) n++
  if (f.populationMax != null) n++
  if (f.engagement && f.engagement !== 'any') n++
  if (f.adoption   && f.adoption   !== 'any') n++
  if (f.languages?.length) n++
  if (f.religions?.length) n++
  return n
})

useShadowStyles(`
  .rm-filter { display:flex;flex-direction:column;gap:14px;font:12px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e7ebf0; }
  .rm-filter .row { display:flex;align-items:center;gap:8px; }
  .rm-filter label { font-size:11px;color:#a8b2bd;letter-spacing:.04em;text-transform:uppercase;font-weight:600; }
  .rm-filter .field { display:flex;flex-direction:column;gap:4px; }
  .rm-filter input[type=number],
  .rm-filter select,
  .rm-filter input[type=search] { background:#0f1216;border:1px solid #2c343f;color:#e7ebf0;padding:6px 8px;border-radius:5px;font-size:12px;min-width:0;flex:1; }
  .rm-filter input:focus,
  .rm-filter select:focus { outline:none;border-color:#7c8cf8; }
  .rm-pop-row { display:grid;grid-template-columns:1fr 1fr;gap:8px; }
  .rm-chips { display:flex;flex-wrap:wrap;gap:5px;max-height:140px;overflow-y:auto;padding:4px 2px;border:1px solid #232a33;border-radius:5px;background:#0f1216; }
  .rm-chip { background:#232a33;border:1px solid #2c343f;color:#e7ebf0;padding:3px 8px;border-radius:11px;cursor:pointer;font-size:11px;line-height:1.4; }
  .rm-chip:hover { background:#2c343f; }
  .rm-chip.active { background:rgba(124,140,248,0.18);border-color:#7c8cf8;color:#a8b8ff; }
  .rm-empty { padding:8px;color:#a8b2bd;font-size:11px;text-align:center; }
  .rm-filter-footer { display:flex;align-items:center;justify-content:space-between;margin-top:6px; }
  .rm-pill { background:rgba(124,140,248,0.12);color:#a8b8ff;padding:2px 8px;border-radius:11px;font-size:11px;font-weight:600; }
  .rm-link-btn { background:none;border:none;color:#7c8cf8;cursor:pointer;font-size:11px;padding:0; }
  .rm-link-btn:hover { text-decoration:underline; }
`, 'research-map-filter-panel')
</script>

<template>
  <div class="rm-filter">
    <!-- Population range ──────────────────────────────────────────────── -->
    <div class="field">
      <label>Population</label>
      <div class="rm-pop-row">
        <input type="number" min="0" placeholder="min" :value="popMin" @input="popMin = $event.target.value" />
        <input type="number" min="0" placeholder="max" :value="popMax" @input="popMax = $event.target.value" />
      </div>
    </div>

    <!-- Engagement / adoption status ──────────────────────────────────── -->
    <div class="field">
      <label>Engagement</label>
      <select :value="engagement" @change="engagement = $event.target.value">
        <option value="any">Any</option>
        <option value="engaged">Engaged</option>
        <option value="unengaged">Unengaged</option>
      </select>
    </div>
    <div class="field">
      <label>Adoption</label>
      <select :value="adoption" @change="adoption = $event.target.value">
        <option value="any">Any</option>
        <option value="adopted">Adopted</option>
        <option value="unadopted">Unadopted</option>
      </select>
    </div>

    <!-- Language multi-select ─────────────────────────────────────────── -->
    <div class="field">
      <label>Language</label>
      <input type="search" v-model="langSearch" placeholder="Search languages…" />
      <div class="rm-chips">
        <span v-if="!filteredLangs.length" class="rm-empty">No languages loaded yet</span>
        <button
          v-for="lang in filteredLangs"
          :key="lang"
          class="rm-chip"
          :class="{ active: isLangActive(lang) }"
          @click="toggleLang(lang)"
        >{{ lang }}</button>
      </div>
    </div>

    <!-- Religion multi-select ─────────────────────────────────────────── -->
    <div class="field">
      <label>Religion</label>
      <input type="search" v-model="relSearch" placeholder="Search religions…" />
      <div class="rm-chips">
        <span v-if="!filteredRels.length" class="rm-empty">No religions loaded yet</span>
        <button
          v-for="rel in filteredRels"
          :key="rel"
          class="rm-chip"
          :class="{ active: isRelActive(rel) }"
          @click="toggleRel(rel)"
        >{{ rel }}</button>
      </div>
    </div>

    <!-- Footer: active count + reset link ─────────────────────────────── -->
    <div class="rm-filter-footer">
      <span class="rm-pill">{{ activeCount }} active</span>
      <button class="rm-link-btn" @click="resetAll">Reset all</button>
    </div>
  </div>
</template>
