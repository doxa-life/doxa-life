<script setup>
/**
 * research-map.vue — Application Profile: Research Map
 *
 * The "researcher's workbench" archetype. Composes every framework piece a
 * subject-matter expert (missiologist, demographer, ethnographer) needs to
 * produce a publishable map: clustering, fly-to navigation, multi-field
 * filters, language-family legend, detail panel, and large-format poster
 * export.
 *
 * profile-config shape (minimal for research-map):
 *   {
 *     "profile":   "research-map",
 *     "tk":        "pk.eyJ...",
 *     "dataSource": "pray-tools",
 *     "instanceId": "any-stable-id"
 *   }
 * Tabs are NOT configurable from outside this profile — they're baked in.
 * To change them, edit the TABS constant in this file.
 *
 * BAKED-IN TABS (mirrors the OLD doxa-map-app-widget research map exactly,
 * source: DOXA/doxa-map-app-widget/src/config/mapConfig.js:434, tabOrder):
 *   1. Prayer Progress     (prayerProgress / prayer)
 *   2. Doxa Regions        (doxaRegion / doxa-regions)
 *   3. Affinity Blocks     (affinityBlock / affinity-blocs)
 *   4. Language Families   (languageFamily / language-families)
 *   5. Gospel Resources    (resource / gospel-resources)
 */

import { inject, provide, ref, computed, onMounted, onBeforeUnmount, watch, markRaw } from 'vue'

// ─── Composables (framework) ─────────────────────────────────────────────────
import { useMapInstance }  from '../composables/useMapInstance.js'
import { useMapLayers }    from '../composables/useMapLayers.js'
import { useMapEvents }    from '../composables/useMapEvents.js'
import { useMapFly }       from '../composables/useMapFly.js'
import { useShadowStyles } from '../composables/useShadowStyles.js'

// TODO(Wave 3): useMapData lives in doxa-map-mfe; not yet ported to template.
// Parallel agent ports it to template/src/composables/useMapData.js.
import { useMapData }      from '../composables/useMapData.js'

// TODO(Wave 3): NEW composable — clustering. Parallel agent writes it at
// template/src/composables/useMapClustering.js (network + MST + mapbox-native).
// See discovery-reports/04-clustering-sources.md.
import { useMapClustering } from '../composables/useMapClustering.js'

// TODO(Wave 3): NEW composable — poster printing. Parallel agent writes it at
// template/src/composables/useMapPoster.js (tile-stitch + slot composition).
// See discovery-reports/02-poster-printing-research.md.
import { useMapPoster }    from '../composables/useMapPoster.js'

// TODO(Wave 3): useLegendData lives in doxa-map-mfe; parallel agent ports it
// to template/src/composables/useLegendData.js.
import { useLegendData }   from '../composables/useLegendData.js'

// ─── Config + utils ──────────────────────────────────────────────────────────
import { mapDefaults }            from '../config/mapConfig.js'
import { getColorStrategy }       from '../config/colorStrategies.js'
// TODO(Wave 3): DataSourceManager not yet in template/src/utils — ports from
// doxa-map-mfe alongside useMapData.
import { DataSourceManager }      from '../utils/DataSourceManager.js'

// ─── Components ──────────────────────────────────────────────────────────────
import LegendDesktop  from '../components/LegendDesktop.vue'
import LegendMobile   from '../components/LegendMobile.vue'

// TODO(Wave 3): MapControlsComponent (toolbar wrapper) ports with the
// individual map-controls/* buttons from doxa-map-mfe.
import MapControlsComponent from '../components/MapControlsComponent.vue'

// TODO(Wave 3): SideMenuDrawer ports from doxa-map-mfe.
import SideMenuDrawer from '../components/SideMenuDrawer.vue'

// TODO(Wave 3): PeopleGroupDetail ports from doxa-map-mfe alongside the
// detail-panel CSS bundle.
import PeopleGroupDetail from '../components/PeopleGroupDetail.vue'

// New components written in this same wave:
import ResearchMapSideMenu    from '../components/ResearchMapSideMenu.vue'
import ResearchMapFilterPanel from '../components/ResearchMapFilterPanel.vue'

// TODO(Wave 3): PosterDialog written by the poster-printing parallel agent
// at template/src/components/poster/PosterDialog.vue.
import PosterDialog from '../components/poster/PosterDialog.vue'

// ─── Shadow-DOM style injection ──────────────────────────────────────────────
useShadowStyles(`
  .rm-root { position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;background:#0f1216;color:#e7ebf0; }
  .rm-tab-bar { flex:0 0 auto;display:flex;align-items:center;background:#171c23;border-bottom:1px solid #232a33;height:44px;padding:0 8px;gap:2px;z-index:10;overflow-x:auto;scrollbar-width:thin; }
  .rm-tab { background:none;border:none;padding:0 14px;height:100%;font-size:13px;font-weight:500;color:#a8b2bd;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:color .12s,border-color .12s,background .12s; }
  .rm-tab:hover { color:#e7ebf0;background:rgba(124,140,248,0.06); }
  .rm-tab.active { color:#7c8cf8;border-bottom-color:#7c8cf8;background:rgba(124,140,248,0.08); }
  .rm-map-area { flex:1 1 0;position:relative;overflow:hidden; }
  .rm-map-canvas { position:absolute;inset:0; }
  .rm-loading { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#0f1216;color:#7c8cf8;font:13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;z-index:5; }
  .rm-badge { position:absolute;top:10px;right:10px;background:rgba(124,140,248,0.12);color:#7c8cf8;border:1px solid rgba(124,140,248,0.3);padding:3px 9px;border-radius:4px;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;pointer-events:none;z-index:50; }
  /* Mobile-only legend slot — desktop hides via @media */
  .rm-legend-mobile-slot { display:none; }
  @media(max-width:767px){
    .rm-tab-bar { height:40px; }
    .rm-tab { padding:0 10px;font-size:12px; }
    .rm-legend-mobile-slot { display:block; }
    .rm-legend-desktop-slot { display:none; }
  }
`, 'research-map')

// ─── Config from ProfileLoader (provide/inject — never direct imports) ──────
const profileConfig = inject('profileConfig')
const mapboxToken   = inject('mapboxToken')
const dataSource    = inject('dataSource')
const colorSet      = inject('colorSet')
const injectedInstanceId = inject('instanceId', null)

// Stores — instance-scoped Pinia, supplied by ProfileLoader
const mapStore  = inject('mapStore')
const dataStore = inject('dataStore')
const uiStore   = inject('uiStore')

// ─── Tabs (HARDCODED for this profile) ───────────────────────────────────────
// This profile is self-contained: tabs are NOT read from profileConfig or
// inject('tabs'). The host's profile-config shrinks to { profile, tk,
// dataSource, instanceId }. To change the tabs, edit this constant.
//
// SOURCE OF TRUTH — these tabs mirror the OLD research map verbatim:
//   /DOXA/doxa-map-app-widget/src/config/mapConfig.js
//     - tabOrder    (line 434):  ['prayer', 'doxa-regions', 'affinity-blocks',
//                                  'language-families', 'gospel-resources']
//     - per-tab cfg (lines 138-429): legendType, colorMode, popup.template
//
// VERIFIED KEY MATCHES against framework:
//   colorStrategy: keys come from COLOR_MODES (template/src/config/colors.js:20-30).
//     prayerProgress, doxaRegion, affinityBlock, languageFamily, resource — all defined.
//     (NOTE: the OLD app's "prayer" tab was a literal alias of doxa-regions —
//      same colorMode/legend. The framework has a richer prayerProgress
//      strategy + dedicated `prayer` legend, so we use those for the prayer tab.
//      This is the only intentional upgrade vs. a strict 1:1 mirror.)
//   legend: keys come from useLegendData switch arms (template/src/composables/
//     useLegendData.js:156-262). All five — prayer, doxa-regions, affinity-blocs,
//     language-families, gospel-resources — are present.
const TABS = [
  { id: 'prayer',            label: 'Prayer Progress',   colorStrategy: 'prayerProgress', legend: 'prayer',            popup: 'default'  },
  { id: 'doxa-regions',      label: 'Doxa Regions',      colorStrategy: 'doxaRegion',     legend: 'doxa-regions',      popup: 'default'  },
  { id: 'affinity-blocks',   label: 'Affinity Blocks',   colorStrategy: 'affinityBlock',  legend: 'affinity-blocs',    popup: 'detailed' },
  { id: 'language-families', label: 'Language Families', colorStrategy: 'languageFamily', legend: 'language-families', popup: 'default'  },
  { id: 'gospel-resources',  label: 'Gospel Resources',  colorStrategy: 'resource',       legend: 'gospel-resources',  popup: 'default'  }
]
const tabs       = computed(() => TABS)
const showTabBar = computed(() => true)

const activeTabId = ref(null)
const activeTab   = computed(() => tabs.value.find(t => t.id === activeTabId.value) ?? tabs.value[0])
const activeLegendType = computed(() => activeTab.value?.legend ?? 'default')
const activePopupAction = computed(() => activeTab.value?.popup ?? 'pray')

// ─── Map ID + container refs ─────────────────────────────────────────────────
const mapId = (injectedInstanceId?.value || injectedInstanceId) || ('research-map-' + Math.random().toString(36).slice(2, 7))
provide('mapId', mapId)

const rmRoot       = ref(null)
const mapContainer = ref(null)
const appReady     = ref(false)

// ─── Map instance (shadow-DOM safe — element ref, never string ID) ───────────
const { map, isMapReady, initializeMap, destroy } = useMapInstance({
  containerRef: mapContainer,
  accessToken:  mapboxToken.value,
  style:        profileConfig?.value?.style   ?? 'mapbox://styles/mapbox/dark-v11',
  center:       profileConfig?.value?.center  ?? mapDefaults.center ?? [20, 10],
  zoom:         profileConfig?.value?.zoom    ?? mapDefaults.zoom   ?? 1.8,
  pitch:        profileConfig?.value?.pitch   ?? mapDefaults.pitch  ?? 0,
  bearing:      profileConfig?.value?.bearing ?? mapDefaults.bearing?? 0
})

// ─── Data composable ─────────────────────────────────────────────────────────
const dsm = new DataSourceManager()
const mapData = useMapData({
  mapId,
  dataSourceId:      dataSource.value,
  dataSourceManager: dsm,
  dataStore,
  markRaw:           (v) => v
})

// ─── Layers composable ───────────────────────────────────────────────────────
const mapLayers = useMapLayers({
  getMap: () => map.value,
  mapId,
  // Color comes from the active tab's strategy (looked up at paint time)
  getLanguageFamilyColor: (langFam) => {
    const strat = getColorStrategy(activeTab.value?.colorStrategy)
    return strat?.colors?.[langFam] ?? strat?.fallback ?? '#7c8cf8'
  }
})

// ─── Events composable (click → detail, hover → cursor) ──────────────────────
// Wired via useMapLayers internally, but we also keep an explicit handle for
// custom event hookups (e.g., poster-mode disables click handlers).
const mapEvents = useMapEvents({
  getMap: () => map.value,
  mapId,
  getLanguageFamilyColor: () => '#7c8cf8'
})

// ─── Fly composable ──────────────────────────────────────────────────────────
const mapFly = useMapFly({
  getMap: () => map.value,
  mapId,
  mapStore,
  defaultCenter: profileConfig?.value?.center ?? [20, 10],
  defaultZoom:   profileConfig?.value?.zoom   ?? 1.8
})

// ─── Clustering composable ───────────────────────────────────────────────────
// Modes: 'mapbox' (native circle clustering) | 'mst' | 'network' | 'off'
// Toggled from ResearchMapSideMenu via mapStore.clusteringMode.
const clustering = useMapClustering({
  getMap: () => map.value,
  mapId,
  mapStore,
  // Cluster color follows the active tab's strategy
  getClusterColor: () => getColorStrategy(activeTab.value?.colorStrategy)?.fallback ?? '#7c8cf8'
})

// ─── Legend data composable ──────────────────────────────────────────────────
// Builds legend rows from the loaded GeoJSON aggregated by the active tab's
// `legend` key. LegendDesktop / LegendMobile read these via inject('legendRows')
// (provided below).
const legend = useLegendData({
  mapId,
  dataStore,
  legendType: activeLegendType
})
provide('legendRows', legend.rows)

// ─── Poster composable ───────────────────────────────────────────────────────
// Owns the off-screen Mapbox instance, tile-stitch render loop, and PDF
// composition. Reads slots config from PosterDialog state.
const poster = useMapPoster({
  sourceMap:   () => map.value,
  mapboxToken: mapboxToken.value,
  styleUrl:    () => map.value?.getStyle()?.sprite?.replace(/\/sprite.*$/, '') || profileConfig?.value?.style
})

// ─── Side-menu / dialog state ────────────────────────────────────────────────
const showSideMenu   = ref(false)
const showPoster     = ref(false)
const selectedFeature = computed(() => mapStore.selectedFeature)

// ─── Tab switching ───────────────────────────────────────────────────────────
function switchTab(tabId) {
  if (tabId === activeTabId.value) return
  activeTabId.value = tabId
  uiStore.setActiveTab?.(tabId)
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab || !map.value) return
  const strat = getColorStrategy(tab.colorStrategy)
  if (map.value.getLayer('language-family-pins') && strat?.buildExpression) {
    map.value.setPaintProperty('language-family-pins', 'circle-color', strat.buildExpression())
  }
  // Re-aggregate legend rows for the new lens
  legend.refresh?.()
  // Re-color clusters (cluster paint depends on active strategy)
  clustering.refreshColors?.()
}

// ─── Legend → fly-to wiring ──────────────────────────────────────────────────
// LegendRows emits a window event when a row is clicked; we fly the map there.
function onLegendRowClick(evt) {
  const detail = evt?.detail
  if (!detail || detail.mapId !== mapId) return
  if (detail.center && Array.isArray(detail.center)) {
    mapFly.flyToCoords?.({ longitude: detail.center[0], latitude: detail.center[1] }, detail.zoom ?? 4)
  } else if (detail.bounds) {
    mapFly.fitBounds?.(detail.bounds, 60)
  }
}

// ─── Filter sync — ResearchMapFilterPanel writes to mapStore.filters ─────────
// useMapLayers + useMapClustering subscribe to mapStore.filters and re-render
// the source / cluster layers when they change.
watch(() => mapStore.filters, () => {
  mapLayers.applyFilters?.(mapStore.filters)
  clustering.applyFilters?.(mapStore.filters)
}, { deep: true })

// ─── Lifecycle ───────────────────────────────────────────────────────────────
async function onMapReady(normalizedPeopleGroups) {
  mapStore.registerMap(mapId, map.value)
  try { map.value.setProjection('mercator') } catch (_) { /* style may not support */ }

  if (normalizedPeopleGroups?.length) {
    mapLayers.addLanguageFamilyLayer(
      normalizedPeopleGroups,
      activeTab.value?.colorStrategy ?? 'languageFamily'
    )
    // Hand the same dataset to clustering so MST/network can rebuild on toggle
    clustering.setData?.(normalizedPeopleGroups)
    // Build the initial legend
    legend.build?.(normalizedPeopleGroups)
  }

  mapStore.setMapReady(mapId)
  appReady.value = true
}

onMounted(async () => {
  activeTabId.value = tabs.value[0]?.id ?? 'prayer'
  window.addEventListener('doxa:legend-row-click', onLegendRowClick)

  const dataPromise = mapData.loadData().catch(err => {
    console.error('[research-map] data load failed:', err)
    return { normalizedPeopleGroups: [] }
  })
  await initializeMap()
  if (!map.value) return
  map.value.once('style.load', async () => {
    const { normalizedPeopleGroups } = await dataPromise
    await onMapReady(normalizedPeopleGroups)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('doxa:legend-row-click', onLegendRowClick)
  poster.cleanup?.()
  clustering.cleanup?.()
  mapStore.deregisterMap(mapId)
  destroy()
})
</script>

<template>
  <div ref="rmRoot" class="rm-root">
    <!-- 10-tab bar -->
    <div v-if="showTabBar" class="rm-tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="rm-tab"
        :class="{ active: activeTabId === tab.id }"
        @click="switchTab(tab.id)"
      >{{ tab.label }}</button>
    </div>

    <div class="rm-map-area">
      <div v-if="!appReady" class="rm-loading">Research map loading…</div>
      <div ref="mapContainer" class="rm-map-canvas" />

      <span class="rm-badge">RESEARCH</span>

      <!-- Toolbar (zoom, location, fullscreen, theme, geocoder) -->
      <MapControlsComponent
        v-if="appReady && map"
        :map="map"
        :map-container="mapContainer"
        :access-token="mapboxToken"
      />

      <!-- Side-menu drawer (filter, cluster toggle, poster button) -->
      <ResearchMapSideMenu
        v-if="appReady"
        :is-open="showSideMenu"
        @close="showSideMenu = false"
        @open-poster="showPoster = true"
      >
        <ResearchMapFilterPanel />
      </ResearchMapSideMenu>

      <!-- Legend — desktop card + mobile bottom sheet, responsive -->
      <div class="rm-legend-desktop-slot">
        <LegendDesktop
          v-if="appReady"
          :legend-type="activeLegendType"
          :popup-action="activePopupAction"
          :initially-collapsed="false"
        />
      </div>
      <div class="rm-legend-mobile-slot">
        <LegendMobile
          v-if="appReady"
          :legend-type="activeLegendType"
          :popup-action="activePopupAction"
        />
      </div>

      <!-- People-group detail (opens on pin click via mapStore.selectedFeature) -->
      <PeopleGroupDetail
        v-if="appReady && selectedFeature"
        :feature="selectedFeature"
        :action="activePopupAction"
        @close="mapStore.selectFeature(null)"
      />

      <!-- Poster export modal -->
      <PosterDialog
        v-if="showPoster"
        :poster="poster"
        :legend-rows="legend.rows"
        :active-tab="activeTab"
        @close="showPoster = false"
      />
    </div>
  </div>
</template>
