<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, inject, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useShadowStyles } from '@/composables/useShadowStyles.js'
import { useLegendData } from '@/composables/useLegendData.js'
import { defineAsyncComponent } from 'vue'
import LegendRows from './LegendRows.vue'
import PeopleGroupDetail from './PeopleGroupDetail.vue'
// Async-import the heavier branches so the boot bundle stays lean.
const LegendMobile = defineAsyncComponent(() => import('./LegendMobile.vue'))
// Language-family tab is now handled by <SemanticTreeLegend> mounted directly
// in research-map.vue as a standalone sibling (PPLR's panel chrome owns its
// positioning + collapse-to-pill). LegendDesktop only renders the other tabs
// (Prayer / Engagement / Adoption / Doxa Regions) via LegendRows.
import { RESEARCH_LEGEND_OPTIONS } from '../composables/researchLegendOptions.js'

const { t } = useI18n()

useShadowStyles(`
/* ── Container — the card.
   The LegendRows grid owns left/right padding via its caret + trailing
   columns. The card itself only adds top/bottom breathing space via
   .legend-content, and clips rounded corners via overflow:hidden. ── */
/* Transition: only the dimensions that actually change between expanded
   and collapsed. Using 'all' would also animate top/left/position and cause
   layout thrash on state flips. Emphasized-decelerate curve mirrors
   Material Design 3 snap-open, settle-closed feel. */
/* top/left/width aligned to SemanticTreeLegend's .stl-panel (top:60px,
   left:8px, width:380px) so the LegendDesktop card and the SemanticTreeLegend
   sit at exactly the same position+size — no visible jump when the user
   clicks a pin and the detail panel swaps in over the language-family legend
   (qa: 2026-05-02). */
.legend-container{position:absolute;top:60px;left:8px;width:var(--map-legend-width,380px);max-height:calc(100vh - 80px);background:#fff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.12),0 1px 3px rgba(0,0,0,0.08);z-index:1000;overflow:hidden;display:flex;flex-direction:column;transition:width 200ms cubic-bezier(0.2,0,0,1),max-height 200ms cubic-bezier(0.2,0,0,1),min-width 200ms cubic-bezier(0.2,0,0,1),border-radius 200ms linear,box-shadow 200ms linear;will-change:width,max-height;}
/* Collapsed: card matches geocoder shape — 36px tall pill with 20px radius.
   Name track auto-sizes to fit "Legend" text (no empty slack on the right).
   .lrg-items padding cleared so the single title row centers inside 36px. */
.legend-container.collapsed{width:auto;min-width:0;max-height:36px;height:36px;top:54px;border-radius:20px;overflow:hidden;}
.legend-container.collapsed .lrg-items{grid-template-columns:var(--lrg-caret-col) auto var(--lrg-caret-col) !important;padding:0 !important;align-content:center;}
.legend-container.collapsed .lrg-title-row{padding:0 !important;}

/* Card-level collapse caret — rendered into the #title-caret slot of
   LegendRows. It sits inside the grid's caret column (col 1), centered,
   with zero padding per spec. Rotation flips on collapse. */
.legend-collapse-caret{width:10px;height:10px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;color:#888;padding:0;transition:transform 180ms cubic-bezier(0.2,0,0,1),color 120ms linear;outline:none;-webkit-tap-highlight-color:transparent;will-change:transform;}
.legend-collapse-caret:focus{outline:none;}
.legend-collapse-caret.rotated{transform:rotate(-90deg);}
.legend-collapse-caret:hover{color:#333;}

/* Detail-mode close button — top-right of the card */
.detail-close-btn{position:absolute;top:10px;right:10px;background:none;border:none;padding:4px;cursor:pointer;color:#888;display:flex;align-items:center;justify-content:center;z-index:2;transition:color 0.2s ease;}
.detail-close-btn:hover{color:#333;}

/* ── Content — no padding; left/right AND top/bottom are handled by the
   LegendRows grid (caret + trailing columns + .lrg-items padding 12px 0).
   Double-padding here would push the collapsed title row out of the
   collapsed card. Title row stays visible when collapsed; data rows +
   controls are hidden via .collapsed state below. ── */
.legend-content{padding:0;overflow-y:auto;overflow-x:hidden;flex:1;max-height:650px;display:flex;flex-direction:column;min-height:0;}
.legend-content.no-padding{padding:0;}

/* When collapsed, hide everything EXCEPT the title inside LegendRows.
   The title row stays visible; column labels (UPGS/POPULATION) are hidden
   so the collapsed state shows only "Legend" — feedback 2026-04-21. */
.legend-container.collapsed .lrg-row,
.legend-container.collapsed .lrg-footer,
.legend-container.collapsed .lrg-header-col,
.legend-container.collapsed .lft-row,
.legend-container.collapsed .lft-row-child,
.legend-container.collapsed .lft-header-col{display:none!important;}
/* Tab-4 lang-fam tree height parity with tabs 1-3 (qa.md R6 + R8 A2).
   Clamp to the same 36px pill when collapsed, hide column headers like
   LegendRows does, AND disable position:sticky on the title row — sticky
   creates its own stacking context that breaks the parent .legend-container's
   border-radius clip, leaving the collapsed pill with a sharp-cut right edge. */
.legend-container.collapsed .lft-items{padding:0!important;align-content:center;overflow:visible!important;}
.legend-container.collapsed .lft-title-row{padding:0!important;position:static!important;background:transparent!important;}
.legend-container.collapsed .lrg-title-row{position:static!important;background:transparent!important;}

/* SemanticTreeLegend (PPLR-ported) collapse parity — preserve the rounded-pill
   collapse-to-circle aesthetic from before. Hide everything below the titlebar
   so only the title (containing our caret + "Legend"/breadcrumb) shows.
   The .stl-inner border + box-shadow is also removed in collapsed state so the
   inner doesn't double up on the .legend-container's pill chrome. */
.legend-container.collapsed .semantic-tree-legend .stl-tabs-wrap,
.legend-container.collapsed .semantic-tree-legend .stl-col-hdr,
.legend-container.collapsed .semantic-tree-legend .stl-rows{display:none!important;}
.legend-container.collapsed .semantic-tree-legend .stl-inner{background:transparent!important;border:none!important;box-shadow:none!important;border-radius:0!important;}
.legend-container.collapsed .semantic-tree-legend .stl-titlebar{padding:0 12px!important;border-bottom:none!important;min-height:36px!important;}
.legend-section-label{padding:8px 12px 4px;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:0.5px;text-transform:uppercase;}
.legend-dark .legend-section-label{color:rgba(243,243,241,0.55);}

/* Desktop slim rows — scoped to .legend-container so mobile (.legend-mobile-sheet)
   keeps its 44px tap targets. Original desktop rows were 36px tall with 6px
   pill padding — too clunky per user feedback 2026-04-27. */
.legend-container .lrg-row,
.legend-container .lft-row{min-height:24px;}
.legend-container .lrg-item-inner,
.legend-container .lft-item-inner{min-height:24px;padding:2px 0;}

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
} = useLegendData(legendTypeRef, RESEARCH_LEGEND_OPTIONS)

// LegendFamilyTree consumes the raw normalized people-groups (not pre-aggregated).
// research-map.vue provides the array via inject('normalizedPeopleGroups').
const normalizedPeopleGroupsRef = inject('normalizedPeopleGroups', null)
const peopleGroupsForFamilyTree = computed(() => {
  if (normalizedPeopleGroupsRef?.value?.length) return normalizedPeopleGroupsRef.value
  const out = []
  for (const id in dataStore.sources) {
    const src = dataStore.sources[id]
    if (src?.features?.length) out.push(...src.features)
  }
  return out
})

// (SemanticTreeLegend tree adapter moved up to research-map.vue — it mounts
// the legend as a standalone sibling for the language-family tab.)

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

// Refs for DOM elements
const legendItemsContainer = ref(null)

// Named handler for window event — must be stored to allow removeEventListener
let _onOpenDesktopLegend = null

// NOTE: auto-fly + cluster state and the .legend-controls toolbar moved to
// LegendTools.vue (mounted as a sibling in research-map.vue) per UX 2026-04-27.
// The legend card no longer owns showSpeedSelector / showClusterSettings /
// autoFlyIndex / autoFlyTimer / flySpeed / showClusters / clusterMode.
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

// NOTE: speedLabel / flyInterval / showAutoFlyButton predicate moved to
// LegendTools.vue along with the toolbar UI.

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

// NOTE: All auto-fly + cluster handlers (toggleAutoFly / startAutoFly /
// stopAutoFly / scheduleNextFly / flyToCurrentItem / setSpeed /
// toggleSpeedSelector / setClusterMode / toggleClusters) moved to
// LegendTools.vue. The card no longer drives the tour cadence.

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
       the first row of the same grid as the data rows. The card-level
       collapse caret is injected into the LegendRows #title-caret slot so
       it lives in the grid's caret column (col 1) — aligned with the title
       row, and using the same padding track as all row-level carets.
       See docs/legend-spec.md. -->
  <div v-else :class="['legend-container', { collapsed: isCollapsed, 'legend-dark': isDark }]">
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
         stays visible when collapsed; data rows are hidden via .collapsed class.
         The Fly + Clusters toolbar that used to live here moved to LegendTools.vue
         (mounted as a sibling of LegendDesktop in research-map.vue) per UX
         2026-04-27. -->
    <div class="legend-content" :class="{ 'no-padding': legendColumns.length > 0 }">
      <!-- People Group Detail mode (pin was clicked) -->
      <PeopleGroupDetail
        v-if="legendMode === 'detail' && selectedPeopleGroup"
        :peopleGroup="selectedPeopleGroup"
        :hideHeader="true"
        :dark="isDark"
        :action="popupAction"
      />

      <!-- Language-family tab is now handled by <SemanticTreeLegend> mounted
           directly in research-map.vue as a standalone sibling. LegendDesktop
           is hidden for that tab via parent v-if. No branch here. -->
      <template v-else-if="legendType === 'language-family'"></template>

      <!-- Universal data-driven legend rows.
           The title comes from here — rendered as the first row of the table,
           NOT as a separate header bar. -->
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
      >
        <template #title-caret>
          <button
            class="legend-collapse-caret"
            :class="{ rotated: isCollapsed }"
            @click.stop="toggleCollapse"
            :aria-label="t('aria.toggleLegend')"
          >
            <svg width="8" height="8" viewBox="0 0 20 20" fill="none">
              <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </template>
      </LegendRows>
    </div>
  </div> <!-- end desktop legend -->
</template>

<style scoped>
/* All legend styles are injected via useShadowStyles above so they survive
   shadow-DOM isolation and don't collide with scoped data-v-* selectors.
   Do NOT re-declare .legend-container / .legend-content / .lrg-* here. */
</style>