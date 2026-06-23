<script setup>
/**
 * upg-100-list.vue — Application Profile: My UPG 100 List
 *
 * Two tabs:
 *   1. My UPG 100 List — 13 geographic + 2 deaf + 12 Asia (India/China
 *      admin-1) prayer lists rendered
 *      via the framework's SemanticTreeLegend so sort-by-count and
 *      sort-by-population work out of the box. Each list expands to show its
 *      member countries (also sortable).
 *   2. Regions — LITERAL CLONE of doxa-research-map's "Regions" tab, mounted
 *      via the sibling profile file `research-map-clone.vue`.
 *
 * Isolation: this file does NOT import from any other app-profiles bundle.
 * research-map-clone.vue is a byte-identical clone owned by this bundle.
 */

import { inject, provide, ref, computed, onMounted, onBeforeUnmount, watch, defineAsyncComponent } from 'vue'
import { useShadowStyles } from '@map/composables/useShadowStyles.js'
import { useMapInstance } from '@map/composables/useMapInstance.js'
import { useMapData } from '@map/composables/useMapData.js'
import { createPplrInstance, provideInstance } from '@map/composables/usePplrInstance.js'
import SemanticTreeLegend from '@map/components/SemanticTreeLegend.vue'

import clustersJson from '../data/clusters.json'

const ResearchMapClone = defineAsyncComponent(() => import('./research-map-clone.vue'))

// ─── Inject from ProfileLoader ────────────────────────────────────────────────
const mapboxToken = inject('mapboxToken', '')
const dataSource  = inject('dataSource',  'pray-tools')
const instanceId  = inject('instanceId',  'my-upg-100-list-default')

// ─── PPLR instance — required by SemanticTreeLegend mediator pattern ─────────
const pplrInstance = createPplrInstance(`upg-100-list-${instanceId}`)
provideInstance(pplrInstance)

// ─── Tab state ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'upg-100-list', label: 'My UPG 100 List' },
  { id: 'regions',      label: 'Regions' },
]
const activeTabId = ref('upg-100-list')

// ─── Map container ────────────────────────────────────────────────────────────
const mapContainer = ref(null)

// ─── List colors ──────────────────────────────────────────────────────────────
const LIST_COLORS = {
  'west-africa':                  '#d97706',
  'sudan':                        '#b45309',
  'brazil':                       '#16a34a',
  'east-africa':                  '#ea580c',
  'laos':                         '#0d9488',
  'middle-east-core':             '#9333ea',
  'andean-caribbean':             '#65a30d',
  'central-africa':               '#a16207',
  'europe':                       '#2563eb',
  'oceania-indonesia':            '#0891b2',
  'mainland-se-asia-philippines': '#4338ca',
  'maghreb-egypt':                '#dc2626',
  'southern-africa-islands':      '#7c2d12',
  'deaf-old-world':               '#7e22ce',
  'deaf-new-world-asia-pacific':  '#be185d',
  // Asia — India admin-1 buckets (saffron/teal family)
  'asia-india-gujarat':           '#f97316',
  'asia-india-maharashtra':       '#fb923c',
  'asia-india-kerala':            '#14b8a6',
  'asia-india-karnataka':         '#0ea5e9',
  'asia-india-rajasthan':         '#eab308',
  'asia-india-tamil-nadu':        '#22c55e',
  'asia-india-madhya-pradesh':    '#84cc16',
  'asia-india-andhra-pradesh':    '#06b6d4',
  'asia-india-chhattisgarh':      '#a855f7',
  'asia-india-bihar':             '#ec4899',
  // Asia — China admin-1 buckets (red family)
  'asia-china-xinjiang-uyghur-autonomous-region': '#ef4444',
  'asia-china-guizhou-province':  '#dc2626',
}
function colorOf(id) { return LIST_COLORS[id] || '#6b7280' }

// ─── Selector evaluator ──────────────────────────────────────────────────────
function buildPredicate(selector) {
  const t = selector.type
  if (t === 'country_code')  return p => getCountry(p) === selector.value
  if (t === 'country_codes') {
    const set = new Set(selector.values)
    return p => set.has(getCountry(p))
  }
  if (t === 'wagf_block')    return p => getBlock(p)   === selector.value
  if (t === 'wagf_region')   return p => getRegion(p)  === selector.value
  if (t === 'pg_slugs') {
    // Asia lists (India/China admin-1 buckets) — matched by unique slug.
    // Slug is the only collision-free people-group key: people-group `name`
    // is duplicated across countries, so a name-set predicate over-matches
    // (e.g. an India name also present on a PAK/LAO row). Slug is 1:1.
    const set = new Set(selector.values)
    return p => set.has(getSlug(p))
  }
  if (t === 'union') {
    const preds = selector.selectors.map(buildPredicate)
    return p => preds.some(fn => fn(p))
  }
  if (t === 'deaf_predicate') {
    const set = new Set(selector.regions)
    return p => isDeaf(p) && set.has(getRegion(p))
  }
  return () => false
}
function getRegion(p)  { const r = p?.wagf_region;  return typeof r === 'object' && r ? r.value : r }
function getRegionLabel(p) { const r = p?.wagf_region; return typeof r === 'object' && r ? r.label : r }
function getBlock(p)   { const b = p?.wagf_block;   return typeof b === 'object' && b ? b.value : b }
function getCountry(p) { const c = p?.country_code; return typeof c === 'object' && c ? c.value : c }
function getCountryLabel(p) { const c = p?.country_code; return typeof c === 'object' && c ? c.label : c }
function getSlug(p)    { return p?.slug || '' }
function isDeaf(p)     { return (p?.slug || '').toLowerCase().includes('deaf') }
function popOf(p)      { const n = parseInt(p?.population) || 0; return n }

// ─── Map setup ────────────────────────────────────────────────────────────────
const { map, isMapReady, initializeMap, destroy } = useMapInstance({
  containerRef: mapContainer,
  accessToken: mapboxToken || (typeof window !== 'undefined' && window.MAP_APP_MAPBOX_TOKEN) || '',
  mapId: `my-upg-100-list-${instanceId}`,
  initialCenter: [20, 10],
  initialZoom: 1.6,
  initialStyle: 'mapbox://styles/mapbox/dark-v11',
})

const { peopleGroups, loadData } = useMapData({ dataSourceId: dataSource, mapboxToken })

// ─── Build the SemanticTreeLegend node tree from clusters + Doxa data ────────
//
// Top level (depth 0, "Lists" tab) — one node per regional/deaf list, with:
//   - count: UPG count matching the selector
//   - pop:   summed population across those UPGs
//   - children: drill-down to the constituent countries (also with count + pop)
//
// SemanticTreeLegend auto-builds tabs from tree depth — we give it two tabs:
// "Lists" and "Countries" so the user can pivot between the rolled-up and the
// drilled-down view (both sortable by count + pop).

const listNodes = computed(() => {
  const rows = peopleGroups.value || []
  const nodes = []

  // 13 geographic + 2 deaf + 12 Asia admin-1 lists from clusters.json
  const sources = [
    ...clustersJson.lists.map(l => ({ ...l, kind: 'geographic' })),
    ...clustersJson.deaf_lists.map(l => ({ ...l, kind: 'deaf' })),
    ...(clustersJson.asia_lists || []).map(l => ({ ...l, kind: 'asia' })),
  ]

  for (const l of sources) {
    const pred = buildPredicate(l.selector)
    const matching = rows.filter(pred)

    // Per-country roll-up inside the list
    const byCountry = new Map()
    for (const r of matching) {
      const cc = getCountry(r) || 'NULL'
      const cl = getCountryLabel(r) || cc
      const cur = byCountry.get(cc) || { iso: cc, label: cl, count: 0, pop: 0 }
      cur.count += 1
      cur.pop   += popOf(r)
      byCountry.set(cc, cur)
    }
    const children = [...byCountry.values()]
      .map(c => ({
        id: `${l.id}__${c.iso}`,
        label: c.label,
        color: colorOf(l.id),
        count: c.count,
        pop: c.pop,
        filter: { type: 'country_code', value: c.iso }, // not used by Mapbox here, kept for hand-off
      }))
      .sort((a, b) => (b.pop ?? 0) - (a.pop ?? 0))

    nodes.push({
      id: l.id,
      label: l.label,
      color: colorOf(l.id),
      count: matching.length,
      pop: matching.reduce((s, r) => s + popOf(r), 0),
      filter: l.selector,
      children,
    })
  }

  // Asia is now SOLVED — the 12 India/China admin-1 lists above (kind:'asia')
  // replace the former "Asia — UNSOLVED" placeholder. Counts + pop roll up
  // live from the matched people-groups exactly like every other list.

  return nodes
})

// ─── Pin GeoJSON ──────────────────────────────────────────────────────────────
const pinFeatures = computed(() => {
  const rows = peopleGroups.value || []
  return rows
    .filter(r => typeof r.latitude === 'number' && typeof r.longitude === 'number')
    .map(r => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
      properties: {
        slug: r.slug,
        name: r.name,
        wagf_region: r.wagf_region,
        wagf_block: r.wagf_block,
        country_code: r.country_code,
      },
    }))
})

// ─── Mapbox layers ────────────────────────────────────────────────────────────
const SOURCE_ID = 'upg-pins'
const LAYER_PINS = 'upg-pins-layer'
const LAYER_HIGHLIGHT = 'upg-pins-highlight'

function refreshLayers() {
  const m = map.value
  if (!m || !isMapReady.value) return
  const fc = { type: 'FeatureCollection', features: pinFeatures.value }
  if (!m.getSource(SOURCE_ID)) m.addSource(SOURCE_ID, { type: 'geojson', data: fc })
  else m.getSource(SOURCE_ID).setData(fc)

  if (!m.getLayer(LAYER_PINS)) {
    m.addLayer({
      id: LAYER_PINS, type: 'circle', source: SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 2.5, 6, 5],
        'circle-color': '#9ca3af',
        'circle-stroke-width': 0.5, 'circle-stroke-color': '#0b0f14',
        'circle-opacity': 0.85,
      },
    })
  }
  if (!m.getLayer(LAYER_HIGHLIGHT)) {
    m.addLayer({
      id: LAYER_HIGHLIGHT, type: 'circle', source: SOURCE_ID,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 4, 6, 8],
        'circle-color': '#f59e0b',
        'circle-stroke-width': 1.5, 'circle-stroke-color': '#fff',
        'circle-opacity': 1,
      },
      filter: ['in', ['get', 'slug'], ['literal', []]],
    })
  }
  applySelectionFromInstance()
}

// SemanticTreeLegend writes the selected node into pplrInstance.selection.
// We watch that and update Mapbox filters accordingly.
function applySelectionFromInstance() {
  const m = map.value
  if (!m || !m.getLayer(LAYER_HIGHLIGHT)) return
  const node = pplrInstance.selection.value
  if (!node) {
    m.setPaintProperty(LAYER_PINS, 'circle-opacity', 0.85)
    m.setFilter(LAYER_HIGHLIGHT, ['in', ['get', 'slug'], ['literal', []]])
    return
  }
  let pred
  if (node.filter && typeof node.filter === 'object') {
    pred = buildPredicate(node.filter)
  } else {
    pred = () => false
  }
  const rows = peopleGroups.value || []
  const matchingSlugs = rows.filter(pred).map(r => r.slug)
  m.setFilter(LAYER_HIGHLIGHT, ['in', ['get', 'slug'], ['literal', matchingSlugs]])
  m.setPaintProperty(LAYER_PINS, 'circle-opacity', 0.18)
}

watch(() => pplrInstance.selection.value, applySelectionFromInstance)
watch(pinFeatures, refreshLayers)
watch(isMapReady, (ready) => { if (ready) refreshLayers() })

// ─── Lifecycle — lazy-init Tab 1 map ─────────────────────────────────────────
let tab1Initialized = false
async function ensureTab1Map() {
  if (tab1Initialized) return
  tab1Initialized = true
  try { await initializeMap() } catch (e) { console.warn('[upg-100-list] initializeMap failed:', e) }
  try { await loadData() }      catch (e) { console.warn('[upg-100-list] loadData failed:', e) }
}
onMounted(() => { if (activeTabId.value === 'upg-100-list') ensureTab1Map() })
watch(activeTabId, (id) => { if (id === 'upg-100-list') ensureTab1Map() })
onBeforeUnmount(() => { try { destroy() } catch (_) {} })

// ─── Selection summary (header text) ─────────────────────────────────────────
const selectedListLabel = computed(() => pplrInstance.selection.value?.label || null)
const selectedUpgCount  = computed(() => pplrInstance.selection.value?.count ?? null)
const selectedPop       = computed(() => pplrInstance.selection.value?.pop ?? null)

// ─── Tools button ─────────────────────────────────────────────────────────────
const toolsOpen = ref(false)

function flyToSelection() {
  const m = map.value
  if (!m) return
  const node = pplrInstance.selection.value
  if (!node) return
  const pred = buildPredicate(node.filter)
  const rows = (peopleGroups.value || []).filter(pred)
    .filter(r => typeof r.latitude === 'number' && typeof r.longitude === 'number')
  if (!rows.length) return
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const r of rows) {
    if (r.longitude < minLng) minLng = r.longitude
    if (r.longitude > maxLng) maxLng = r.longitude
    if (r.latitude  < minLat) minLat = r.latitude
    if (r.latitude  > maxLat) maxLat = r.latitude
  }
  m.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, maxZoom: 8, duration: 800 })
  toolsOpen.value = false
}

function exportSelection() {
  const node = pplrInstance.selection.value
  const rows = peopleGroups.value || []
  const selected = node ? rows.filter(buildPredicate(node.filter)) : rows
  const data = JSON.stringify({ list: node?.label || 'all', count: selected.length, items: selected }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `${(node?.id || 'all-upgs').replace(/[^a-z0-9-]/gi, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
  toolsOpen.value = false
}

function clearSelection() {
  pplrInstance.selection.value = null
  toolsOpen.value = false
}

// ─── Legend nodes — wrap into a single "Lists" tab tree ──────────────────────
const legendNodes = computed(() => listNodes.value)
const legendTabs  = computed(() => ([
  { id: 'lists',     label: 'Lists' },     // depth 0 — 27 lists (13 geo + 2 deaf + 12 Asia)
  { id: 'countries', label: 'Countries' }, // depth 1 — drilled into a list, show its countries
]))

useShadowStyles(`
  .upg-root { position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;background:#0b0f14;color:#e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
  .upg-tab-bar { flex:0 0 auto;display:flex;align-items:center;background:#111827;border-bottom:1px solid #1f2937;height:42px;padding:0 10px;gap:2px;z-index:30; }
  .upg-tab { background:none;border:none;padding:0 18px;height:100%;font-size:13px;font-weight:500;color:#9ca3af;cursor:pointer;border-bottom:2px solid transparent;transition:color .15s,border-color .15s; }
  .upg-tab:hover { color:#e5e7eb; }
  .upg-tab.active { color:#93c5fd;border-bottom-color:#60a5fa; }
  .upg-body { flex:1;position:relative;min-height:0; }
  .upg-tab-pane { position:absolute;inset:0;display:flex;flex-direction:column; }
  .upg-tab-pane[hidden] { display:none !important; }
  .upg-map { position:absolute;inset:0; }

  /* Position the framework SemanticTreeLegend inside our shadow root */
  .upg-legend-host { position:absolute;top:12px;right:12px;width:380px;max-width:calc(100% - 24px);max-height:calc(100% - 24px);z-index:20; }
  .upg-tools-bar { position:absolute;top:12px;right:404px;z-index:21;display:flex;flex-direction:column;align-items:flex-end; }
  .upg-tools-btn { background:#1f2937;border:1px solid #374151;border-radius:6px;padding:5px 12px;font-size:12px;font-weight:600;color:#e5e7eb;cursor:pointer;letter-spacing:.04em;white-space:nowrap; }
  .upg-tools-btn:hover { background:#374151; }
  .upg-tools-menu { margin-top:4px;background:#111827;border:1px solid #374151;border-radius:8px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.6);min-width:200px; }
  .upg-tools-item { display:block;width:100%;text-align:left;padding:9px 14px;font-size:12px;color:#d1d5db;background:none;border:none;cursor:pointer;border-bottom:1px solid #1f2937; }
  .upg-tools-item:last-child { border-bottom:none; }
  .upg-tools-item:hover { background:#1f2937;color:#e5e7eb; }

  .upg-summary { position:absolute;top:12px;left:12px;background:rgba(17,24,39,0.94);border:1px solid #1f2937;border-radius:8px;padding:8px 12px;color:#e5e7eb;font-size:12px;z-index:20;max-width:340px;box-shadow:0 4px 18px rgba(0,0,0,0.5); }
  .upg-summary .label { color:#93c5fd;font-weight:600;letter-spacing:.04em;text-transform:uppercase;font-size:10px;margin-bottom:4px; }
  .upg-summary .stat  { color:#9ca3af;font-variant-numeric:tabular-nums; }
  .upg-summary .stat b { color:#e5e7eb;font-weight:600; }
`)
</script>

<template>
  <div class="upg-root">
    <div class="upg-tab-bar">
      <button
        v-for="t in TABS"
        :key="t.id"
        class="upg-tab"
        :class="{ active: activeTabId === t.id }"
        @click="activeTabId = t.id"
      >{{ t.label }}</button>
    </div>

    <div class="upg-body">
      <!-- Tab 1: My UPG 100 List — uses the framework SemanticTreeLegend -->
      <div class="upg-tab-pane" :hidden="activeTabId !== 'upg-100-list'">
        <div ref="mapContainer" class="upg-map"></div>

        <!-- Selection summary box (top-left) -->
        <div v-if="selectedListLabel" class="upg-summary">
          <div class="label">Selected list</div>
          <div style="font-size:13px;color:#e5e7eb;margin-bottom:4px;">{{ selectedListLabel }}</div>
          <div class="stat">UPGs: <b>{{ selectedUpgCount?.toLocaleString() }}</b></div>
          <div class="stat">Population: <b>{{ selectedPop?.toLocaleString() }}</b></div>
        </div>

        <!-- Tools button — top-right, left of legend (AC7: fly, export, clear) -->
        <div class="upg-tools-bar">
          <button class="upg-tools-btn" @click="toolsOpen = !toolsOpen">&#9881; Tools</button>
          <div v-if="toolsOpen" class="upg-tools-menu">
            <button class="upg-tools-item" :disabled="!pplrInstance.selection.value" @click="flyToSelection">&#128269; Fly to selection bounds</button>
            <button class="upg-tools-item" @click="exportSelection">&#128229; Export selected as JSON</button>
            <button class="upg-tools-item" @click="clearSelection">&#10005; Clear selection</button>
          </div>
        </div>

        <!-- Framework SemanticTreeLegend (sortable count + pop columns built in) -->
        <div class="upg-legend-host">
          <SemanticTreeLegend
            :nodes="legendNodes"
            :tabs="legendTabs"
            :columns="['count', 'pop']"
            title="My UPG 100 List"
            :export-enabled="true"
          />
        </div>
      </div>

      <!-- Tab 2: Regions — literal clone of doxa-research-map's Regions tab -->
      <div class="upg-tab-pane" :hidden="activeTabId !== 'regions'">
        <ResearchMapClone v-if="activeTabId === 'regions'" />
      </div>
    </div>
  </div>
</template>
