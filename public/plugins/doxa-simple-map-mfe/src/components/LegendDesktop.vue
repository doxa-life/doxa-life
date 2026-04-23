<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch, inject, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useShadowStyles } from '../composables/useShadowStyles.js'
import { useLegendData } from '../composables/useLegendData.js'
import LegendMobile from './LegendMobile.vue'
import LegendRows from './LegendRows.vue'
import PeopleGroupDetail from './PeopleGroupDetail.vue'

const { t } = useI18n()

useShadowStyles(`
/* ── Container — the card.
   position:relative so the absolute collapse caret anchors to it.
   Equal padding would be ideal, but we let the inner .legend-content own
   the padding (so scrollbars & rounded corners behave). The container
   clips rounded corners via overflow:hidden. ── */
.legend-container{position:absolute;top:54px;left:10px;width:var(--map-legend-width,340px);max-height:calc(100vh - 74px);background:#fff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.12),0 1px 3px rgba(0,0,0,0.08);z-index:1000;overflow:hidden;display:flex;flex-direction:column;transition:all 0.3s ease;}
.legend-container.collapsed{width:auto;min-width:180px;max-height:44px;height:44px;top:54px;border-radius:12px;overflow:hidden;}

/* Card-level collapse caret — sits in the card's LEFT PADDING area.
   Anchored to the container's top-left so it aligns with the title row. */
.legend-collapse-caret{position:absolute;top:14px;left:6px;width:18px;height:18px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;color:#888;padding:0;z-index:2;transition:transform 0.3s ease;outline:none;-webkit-tap-highlight-color:transparent;}
.legend-collapse-caret:focus{outline:none;}
.legend-collapse-caret.rotated{transform:rotate(-90deg);}
.legend-collapse-caret:hover{color:#333;}

/* Detail-mode close button — top-right of the card */
.detail-close-btn{position:absolute;top:10px;right:10px;background:none;border:none;padding:4px;cursor:pointer;color:#888;display:flex;align-items:center;justify-content:center;z-index:2;transition:color 0.2s ease;}
.detail-close-btn:hover{color:#333;}

/* ── Content — equal padding on all sides. The title row (first row of
   the LegendRows grid) sits here, so the card shows just that when
   collapsed. Data rows and controls are hidden via .collapsed state below. ── */
.legend-content{padding:12px 14px 12px 28px;overflow-y:auto;overflow-x:hidden;flex:1;max-height:700px;}
.legend-content.no-padding{padding:12px 14px 12px 28px;}

/* When collapsed, hide everything EXCEPT the title inside LegendRows.
   The title row stays visible; column labels (UPGS/POPULATION) are hidden
   so the collapsed state shows only "Legend" — feedback 2026-04-21. */
.legend-container.collapsed .legend-controls,
.legend-container.collapsed .lrg-row,
.legend-container.collapsed .lrg-footer,
.legend-container.collapsed .lrg-header-col{display:none!important;}
.legend-controls{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;}
.legend-btn{padding:5px 10px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;transition:background 0.2s;}
.legend-btn:hover{background:#0056b3;}
.legend-btn.active{background:#28a745;}

/* ── Items ── */
.legend-items-container{display:flex;flex-direction:column;gap:4px;}
.legend-item{padding:6px 10px;border-radius:4px;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:var(--map-font-md,13px);transition:all 0.2s;}
.legend-item-clickable{cursor:pointer;}
.legend-item-clickable:hover{transform:translateX(4px);box-shadow:0 2px 4px rgba(0,0,0,0.1);}
.legend-item-selected{outline:2px solid #333;outline-offset:2px;}
.legend-item-text{flex:1;font-weight:500;color:#333;}
.legend-item-count{font-size:var(--map-font-sm,11px);color:#555;background:rgba(0,0,0,0.08);padding:2px 7px;border-radius:10px;min-width:40px;text-align:right;margin-right:4px;}
.legend-item-population{font-size:var(--map-font-sm,11px);color:#555;background:rgba(0,0,0,0.08);padding:2px 7px;border-radius:10px;min-width:52px;text-align:right;margin-right:4px;}
.legend-export-btn{background:none;border:none;cursor:pointer;font-size:15px;padding:0 4px;}
.legend-tree-item{display:flex;flex-direction:column;gap:4px;}
.legend-tree-parent{display:flex;align-items:center;gap:6px;}
.legend-tree-caret{width:16px;height:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.2s;font-size:12px;color:#666;}
.legend-tree-caret.expanded{transform:rotate(90deg);}
.legend-tree-child{margin-left:20px;display:flex;gap:6px;}
.legend-tree-caret-placeholder{width:16px;}
.legend-item-child{font-size:12px;}

/* ── Stats header ── */
.legend-stats-header{display:flex;align-items:center;padding:4px 0;background:#fff;border-bottom:1px solid rgba(0,0,0,0.07);font-weight:600;font-size:10px;color:#777;text-transform:uppercase;letter-spacing:0.4px;position:sticky;top:0;z-index:10;}
.legend-stats-label{flex:1;min-width:0;padding:0 10px;}
/* Stats column values — 10px right padding aligns with header's last-of-type gap
   and gives a clean breathing space against the card's right edge. */
.legend-stats-value{width:58px;text-align:right;flex-shrink:0;font-family:'Courier New',monospace;padding-right:10px;white-space:pre;}
.legend-footer{display:flex;align-items:center;padding:5px 0;border-top:1px solid rgba(0,0,0,0.07);font-size:11px;font-weight:600;color:#555;background:#fff;}
.legend-footer-label{flex:1;padding-left:10px;color:#777;}
.legend-footer-value{width:56px;text-align:right;padding-right:10px;font-family:'Courier New',monospace;}

/* ── Scrollbar ── */
.legend-content::-webkit-scrollbar{width:4px;}
.legend-content::-webkit-scrollbar-track{background:transparent;}
.legend-content::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.18);border-radius:4px;}
.legend-content::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.3);}

/* ── Dark mode ── */
.legend-dark{background:#3b463d!important;border:1px solid rgba(255,255,255,0.10)!important;box-shadow:0 4px 16px rgba(0,0,0,0.5)!important;}
.legend-dark .legend-content{background:#3b463d;}
.legend-dark .legend-collapse-caret{color:rgba(243,243,241,0.75);}
.legend-dark .legend-collapse-caret:hover{color:#F3F3F1;}
.legend-dark .detail-close-btn{color:rgba(243,243,241,0.75)!important;}
.legend-dark .detail-close-btn:hover{color:#F3F3F1!important;}
.legend-dark .legend-stats-header{background:#2a332a!important;color:rgba(243,243,241,0.65)!important;border-bottom-color:rgba(255,255,255,0.1)!important;}
.legend-dark .legend-footer{background:#2a332a!important;border-top-color:rgba(255,255,255,0.1)!important;color:rgba(243,243,241,0.75)!important;}
.legend-dark .legend-footer-label{color:rgba(243,243,241,0.65)!important;}
.legend-dark .legend-item-text{color:#F3F3F1!important;}
.legend-dark .legend-item-count{background:rgba(255,255,255,0.12)!important;color:rgba(243,243,241,0.9)!important;}
.legend-dark .legend-item-population{background:rgba(255,255,255,0.12)!important;color:rgba(243,243,241,0.9)!important;}
.legend-dark .legend-item-selected{outline-color:rgba(255,255,255,0.5)!important;}
.legend-dark .legend-tree-caret{color:rgba(243,243,241,0.7)!important;}
.legend-dark .legend-content::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.18);}
`, 'legend-component')

const props = defineProps({
  legendType: {
    type: String,
    required: true
  },
  initiallyCollapsed: {
    type: Boolean,
    default: false
  },
  isDark: {
    type: Boolean,
    default: false
  },
  /**
   * Primary action button rendered in the pin-detail popup.
   * 'pray'  → "Pray for them" → pray.doxa.life/<slug>?source=doxalife
   * 'adopt' → "Adopt"          → /adopt/<slug>/?source=doxalife on current origin
   */
  popupAction: {
    type: String,
    default: 'pray',
    validator: (v) => ['pray', 'adopt', 'none'].includes(v)
  },
  /**
   * Disable collapse/expand caret for single-tier legends.
   * When true, hides the caret UI but keeps underlying functionality intact.
   */
  disableCollapse: {
    type: Boolean,
    default: false
  }
})

// Initialize Pinia stores — injected from ProfileLoader (instance-scoped)
const mapStore = inject('mapStore')
const dataStore = inject('dataStore')
const uiStore = inject('uiStore')

// ── Data-driven legend (universal for all legend types) ─────────────────────
const legendTypeRef = toRef(props, 'legendType')
const {
  items: legendDataItems, columns: legendColumns, title: legendDataTitle,
  activeFilter, setFilter, totalCount, totalPopulation,
  fmtPop, fmtCount
} = useLegendData(legendTypeRef)

// Instance ID — injected from doxa-simple-map (provided per <doxa-map> instance)
// Used to scope window events so multiple maps on the same page don't interfere
const mapId = inject('mapId', null)

// Platform detection
const isMobile = computed(() => uiStore.isMobile)

// Legend mode (prayer progress ↔ people group detail)
const legendMode = computed(() => uiStore.legendMode)
const selectedPeopleGroup = computed(() => uiStore.selectedPeopleGroup)

// Reactive data
const isCollapsed = ref(props.initiallyCollapsed)
const autoFlyIndex = ref(0)
const autoFlyTimer = ref(null)
const showSpeedSelector = ref(false)
const showClusterSettings = ref(false)

// Refs for DOM elements
const legendItemsContainer = ref(null)

// Named handler for window event — must be stored to allow removeEventListener
let _onOpenDesktopLegend = null

// Store-derived computeds still needed for auto-fly / cluster controls
const isAutoFlying = computed(() => mapStore.isAutoFlying)
const isGuidedTourActive = computed(() => mapStore.isGuidedTourActive)
const flySpeed = computed(() => mapStore.flySpeed)
const showClusters = computed(() => mapStore.showClusters)
const clusterMode = computed(() => mapStore.clusterMode)
const developerMode = computed(() => mapStore.developerMode)

// Legend title — implements header title swap based on legend state and selection
// (G) When legend is COLLAPSED → display "Legend"
// (G) When legend is OPEN → display the map's configured title prop (e.g. "Engagement Progress")
// (H) When a people group is selected → display ONLY the people group name
// (H) When nothing is selected → revert to map title or "Legend" if collapsed
const legendTitle = computed(() => {
  // (H) When a people group is selected in detail mode
  if (legendMode.value === 'detail' && selectedPeopleGroup.value) {
    return selectedPeopleGroup.value.properties?.name || t('legend.header.peopleGroupFallback')
  }

  // (G) When legend is COLLAPSED → show "Legend"
  if (isCollapsed.value) {
    return t('legend.header.collapsed')
  }

  // (G) When legend is OPEN → show the legend data title (e.g., "Prayer Progress", "Engagement Progress")
  return legendDataTitle.value
})

// Speed label for UI
const speedLabel = computed(() => {
  const labels = { slow: t('buttons.speedOption.slow'), normal: t('buttons.speedOption.normal'), fast: t('buttons.speedOption.fast') }
  return labels[flySpeed.value] || t('buttons.speedOption.normal')
})

// Fly interval based on speed
const flyInterval = computed(() => {
  const intervals = { slow: 8000, normal: 5000, fast: 3000 }
  return intervals[flySpeed.value] || 5000
})

// Show auto fly button only for certain legend types
const showAutoFlyButton = computed(() => {
  return props.legendType === 'doxa-regions' || props.legendType === 'language-families'
})

// Toggle legend collapse — blocked in detail mode so X button click can't accidentally collapse
function toggleCollapse() {
  if (legendMode.value === 'detail') return
  isCollapsed.value = !isCollapsed.value
}

// Auto-expand when pin is clicked and legend enters detail mode
watch(legendMode, (mode) => {
  if (mode === 'detail' && isCollapsed.value) {
    isCollapsed.value = false
  }
})

// Handle row click from LegendRowGroup
function handleRowFilterClick(filterKey) {
  setFilter(filterKey)
}

// Export selection
function exportSelection(item, event) {
  event.stopPropagation()
  // TODO: Implement export functionality
}

// Speed controls
function toggleSpeedSelector() {
  showSpeedSelector.value = !showSpeedSelector.value
  if (showSpeedSelector.value) {
    showClusterSettings.value = false
  }
}

function setSpeed(speed) {
  mapStore.setFlySpeed(speed)
  setTimeout(() => {
    showSpeedSelector.value = false
  }, 300)
}

// Cluster controls
function toggleClusters() {
  mapStore.toggleClusters()
}

function setClusterMode(mode) {
  mapStore.setClusterMode(mode)
  setTimeout(() => {
    showClusterSettings.value = false
  }, 500)
}

// Auto Fly Tour
function toggleAutoFly() {
  if (isAutoFlying.value) {
    stopAutoFly()
  } else {
    if (isGuidedTourActive.value) {
      // TODO: Stop guided tour when implemented
    }
    startAutoFly()
  }
}

function startAutoFly() {
  if (legendDataItems.value.length === 0) return
  
  autoFlyIndex.value = 0
  mapStore.startAutoFly([])
  
  flyToCurrentItem()
  scheduleNextFly()
}

function stopAutoFly() {
  if (autoFlyTimer.value) {
    clearTimeout(autoFlyTimer.value)
    autoFlyTimer.value = null
  }
  mapStore.stopAutoFly()
}

function scheduleNextFly() {
  autoFlyTimer.value = setTimeout(() => {
    if (!isAutoFlying.value) return
    
    autoFlyIndex.value = (autoFlyIndex.value + 1) % legendDataItems.value.length
    flyToCurrentItem()
    scheduleNextFly()
  }, flyInterval.value)
}

function flyToCurrentItem() {
  const item = legendDataItems.value[autoFlyIndex.value]
  if (!item) return
  
  scrollToItem(autoFlyIndex.value)
  setFilter(item.filterKey)
}

function scrollToItem(index) {
  nextTick(() => {
    const container = legendItemsContainer.value
    const itemElements = document.querySelectorAll('.legend-item')
    const item = itemElements[index]
    
    if (container && item) {
      const containerRect = container.getBoundingClientRect()
      const itemRect = item.getBoundingClientRect()
      const scrollOffset = item.offsetTop - container.offsetTop - (containerRect.height / 2) + (itemRect.height / 2)
      
      container.scrollTo({
        top: Math.max(0, scrollOffset),
        behavior: 'smooth'
      })
    }
  })
}

// Lifecycle hooks
onMounted(() => {
  if (window.innerWidth < 768) {
    isCollapsed.value = true
  }
  // Auto-open desktop legend when a pin is clicked and legend is collapsed.
  // Only respond to events from OUR map instance (matched by mapId).
  // This prevents multiple <doxa-map> embeds on the same page from opening each other's legends.
  _onOpenDesktopLegend = (e) => {
    if (mapId && e.detail?.mapId && e.detail.mapId !== mapId) return
    isCollapsed.value = false
  }
  window.addEventListener('doxa:openDesktopLegend', _onOpenDesktopLegend)
})

onBeforeUnmount(() => {
  if (autoFlyTimer.value) {
    clearTimeout(autoFlyTimer.value)
  }
  if (_onOpenDesktopLegend) {
    window.removeEventListener('doxa:openDesktopLegend', _onOpenDesktopLegend)
  }
})
</script>

<template>
  <!-- Mobile: Use bottom sheet legend -->
  <LegendMobile v-if="isMobile" :legendType="legendType" :popupAction="popupAction" :isDark="isDark" :disableCollapse="disableCollapse" />

  <!-- Desktop: ONE table, NO separate header bar.
       The legend title ("Prayer Progress" etc.) is rendered by LegendRows as
       the first row of the same grid as the data rows — so title, column
       labels, and badges all sit on the same column tracks. Collapse caret
       is absolutely positioned in the card's LEFT PADDING area (outside the
       grid). See docs/legend-spec.md. -->
  <div v-else :class="['legend-container', { collapsed: isCollapsed, 'legend-dark': isDark }]">
    <!-- Card-level collapse caret — lives in the card's LEFT PADDING, not in the grid. -->
    <button
      class="legend-collapse-caret"
      :class="{ rotated: isCollapsed }"
      @click="toggleCollapse"
      :aria-label="t('aria.toggleLegend')"
    >
      <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- Detail-mode close button (only when a people group is selected) -->
    <button
      v-if="legendMode === 'detail'"
      class="detail-close-btn"
      @click.stop="uiStore.selectPeopleGroup(null)"
      :aria-label="t('aria.backToLegend')"
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>

    <!-- Content (equal padding all sides). Always rendered so the title row
         stays visible when collapsed; data rows are hidden via .collapsed class. -->
    <div class="legend-content" :class="{ 'dropdown-active': showClusterSettings || showSpeedSelector, 'no-padding': legendColumns.length > 0 }">
      <!-- Control Buttons Row -->
      <div v-if="showAutoFlyButton" class="legend-controls">
        <!-- Auto Fly Button with Speed Selector -->
        <div class="control-btn-group">
          <button 
            class="control-btn auto-fly-btn"
            :class="{ active: isAutoFlying }"
            @click.stop="toggleAutoFly"
            :title="isAutoFlying ? t('buttons.stopFlight') : t('buttons.startAutoFly')"
          >
            <span class="btn-icon">✈️</span>
            <span class="btn-text">{{ isAutoFlying ? 'Stop' : 'Fly' }}</span>
          </button>
          <button 
            class="speed-btn"
            @click.stop="toggleSpeedSelector"
            :title="t('buttons.speedLabel') + ' ' + speedLabel"
          >
            <span class="speed-icon">⏱️</span>
          </button>
          <!-- Speed Selector Popup -->
          <div v-if="showSpeedSelector" class="speed-selector">
            <div class="speed-option" :class="{ active: flySpeed === 'slow' }" @click="setSpeed('slow')">{{ t('buttons.speedOption.slow') }}</div>
            <div class="speed-option" :class="{ active: flySpeed === 'normal' }" @click="setSpeed('normal')">{{ t('buttons.speedOption.normal') }}</div>
            <div class="speed-option" :class="{ active: flySpeed === 'fast' }" @click="setSpeed('fast')">{{ t('buttons.speedOption.fast') }}</div>
          </div>
        </div>
        
        <!-- Clusters Button with Settings Selector -->
        <div class="control-btn-group" :class="{ 'dropdown-open': showClusterSettings }">
          <button 
            class="control-btn clusters-btn"
            :class="{ active: showClusters }"
            @click.stop="toggleClusters"
            :title="t('buttons.showClusters')"
          >
            <span class="checkbox-icon" :class="{ checked: showClusters }">
              <svg v-if="showClusters" width="12" height="12" viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-6" stroke="#3498db" stroke-width="2" fill="none"/>
              </svg>
            </span>
            <span class="btn-text">Clusters</span>
          </button>
          <button 
            class="speed-btn cluster-settings-btn"
            @click.stop="showClusterSettings = !showClusterSettings"
            :title="t('buttons.clusterSettings')"
          >
            <span class="speed-icon">⚙️</span>
          </button>
          <!-- Cluster Settings Popup -->
          <div v-if="showClusterSettings" class="cluster-settings-selector" @click.stop>
            <div v-if="legendType !== 'language-families' && legendType !== 'gospel-resources'" class="cluster-option" :class="{ active: clusterMode === 'region' }" @click.stop="setClusterMode('region')">
              <span class="cluster-option-icon">🌍</span>
              <span class="cluster-option-text">{{ t('options.clusterByRegion') }}</span>
            </div>
            <div v-if="legendType !== 'gospel-resources'" class="cluster-option" :class="{ active: clusterMode === 'language-family' }" @click.stop="setClusterMode('language-family')">
              <span class="cluster-option-icon">🗣️</span>
              <span class="cluster-option-text">{{ t('options.clusterByLanguageFamily') }}</span>
            </div>
            <div v-if="legendType === 'gospel-resources'" class="cluster-option" :class="{ active: clusterMode === 'resource' }" @click.stop="setClusterMode('resource')">
              <span class="cluster-option-icon">📖</span>
              <span class="cluster-option-text">{{ t('options.clusterByGospelResource') }}</span>
            </div>
          </div>
          <!-- Overlay to block clicks behind dropdown -->
          <div v-if="showClusterSettings" class="dropdown-overlay" @click.stop="showClusterSettings = false"></div>
        </div>
      </div>
      
      <!-- People Group Detail mode (pin was clicked) -->
      <PeopleGroupDetail
        v-if="legendMode === 'detail' && selectedPeopleGroup"
        :peopleGroup="selectedPeopleGroup"
        :hideHeader="true"
        :dark="isDark"
        :action="popupAction"
      />

      <!-- Universal data-driven legend rows.
           The title comes from here — rendered as the first row of the table,
           NOT as a separate header bar.
           disableCollapse is FORCED TRUE: child-row carets are feature-flagged
           off for now. When the tree/expand UI is ready, change this back to
           `disableCollapse` (the prop passthrough). -->
      <LegendRows
        v-else
        :title="legendTitle"
        :items="legendDataItems"
        :columns="legendColumns"
        :activeFilter="activeFilter"
        :isDark="isDark"
        :hideColumnHeader="false"
        :showFooter="false"
        :disableCollapse="true"
        :totalCount="totalCount"
        :totalPopulation="totalPopulation"
        :fmtPop="fmtPop"
        :fmtCount="fmtCount"
        @filter-click="handleRowFilterClick"
      />
    </div>
  </div> <!-- end desktop legend -->
</template>

<style scoped>
.legend-container {
  position: absolute;
  top: 70px;
  left: 10px;
  /* MUST use the same CSS var as the search bar so the two pills line up.
     applyContainerScale in doxa-simple-map.vue sets this based on container
     width: 340/300/250 at 700/500/<500 breakpoints. */
  width: var(--map-legend-width, 340px);
  max-height: calc(100vh - 90px);
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.legend-container.collapsed {
  width: auto;
  min-width: 120px;
  max-height: 36px;
  height: 36px;
  top: 70px;
  border-radius: 18px;
  overflow: hidden;
}

.legend-header {
  padding: 0 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(0,0,0,0.07);
  background: #fff;
  user-select: none;
  height: 36px;
  min-height: 36px;
  gap: 6px;
}

.legend-container.collapsed .legend-header {
  border-bottom: none;
  border-radius: 21px;
  background: #fff;
  padding: 0 14px;
  height: 36px;
}

.legend-header:hover {
  background: #f5f6f7;
}

.legend-header-content {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.legend-main-title {
  font-weight: 600;
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.legend-subtitle {
  font-size: 11px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}

.legend-header-col {
  font-size: 11px;
  font-weight: 700;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  width: 48px;
  text-align: right;
  flex-shrink: 0;
  white-space: nowrap;
  padding-right: 0;
}

.legend-header-col:last-of-type {
  padding-right: 0;
}

.legend-toggle-icon {
  transition: transform 0.3s ease;
  color: #666;
}

.legend-toggle-icon.rotated {
  transform: rotate(-90deg);
}

.detail-close-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.detail-close-btn:hover {
  color: #333;
}

.legend-content {
  padding: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  max-height: 700px;
}

.legend-content.no-padding {
  padding: 0;
}

.legend-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.legend-btn {
  padding: 6px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.legend-btn:hover {
  background: #0056b3;
}

.legend-btn.active {
  background: #28a745;
}

.legend-items-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-item {
  padding: 8px 12px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  transition: all 0.2s;
}

.legend-item-clickable {
  cursor: pointer;
}

.legend-item-clickable:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.legend-item-selected {
  outline: 2px solid #333;
  outline-offset: 2px;
}

.legend-item-text {
  flex: 1;
  font-weight: 500;
  color: #333;
}

.legend-item-count {
  font-size: 11px;
  color: #666;
  background: rgba(255,255,255,0.3);
  padding: 2px 6px;
  border-radius: 10px;
}

.legend-item-population {
  font-size: 10px;
  color: #888;
}

.legend-export-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
}

.legend-tree-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.legend-tree-parent {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-tree-caret {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s;
  font-size: 12px;
  color: #666;
}

.legend-tree-caret.expanded {
  transform: rotate(90deg);
}

.legend-tree-child {
  margin-left: 20px;
  display: flex;
  gap: 6px;
}

.legend-tree-caret-placeholder {
  width: 16px;
}

.legend-item-child {
  font-size: 12px;
}
</style>