<script setup>
import { ref, computed, onMounted, onBeforeUnmount, inject, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useShadowStyles } from '@/composables/useShadowStyles.js'
import { useLegendData } from '@/composables/useLegendData.js'
import { RESEARCH_LEGEND_OPTIONS } from '../composables/researchLegendOptions.js'
import LegendRows from './LegendRows.vue'
import SemanticTreeLegend from './SemanticTreeLegend.vue'
import { useLanguageFamilyLegendData } from '../composables/useLanguageFamilyLegendData.js'
import PeopleGroupDetail from './PeopleGroupDetail.vue'

const { t } = useI18n()

useShadowStyles(`
/* ── Mobile bottom sheet — chrome only.
   The TABLE (title + column labels + data rows) is rendered by LegendRows,
   the SAME component desktop uses, with all the same default CSS. Mobile
   no longer overrides any .lrg-* rule — the bottom sheet is purely
   mobile chrome (pull tab, collapse/expand caret, touch drag). ── */
.floating-mini-image{position:absolute;left:16px;bottom:calc(30% + 16px);z-index:999;pointer-events:auto;cursor:pointer;}
.mini-image{width:120px;height:150px;object-fit:cover;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.25);display:block;}

/* Containment root: clamps absolute children to the map area. */
.legend-sheet-root{position:absolute;inset:0;pointer-events:none;overflow:hidden;}
.legend-sheet-root>*{pointer-events:auto;}

/* Sheet shell — no padding; drag strip and caret are absolutely
   positioned overlays. Legend content owns the top padding, matching
   desktop's arrangement so caret+title align on the same visual baseline. */
.legend-mobile-sheet{position:absolute;bottom:0;left:0;right:0;z-index:1000;background:white;border-top-left-radius:16px;border-top-right-radius:16px;box-shadow:0 -4px 20px rgba(0,0,0,0.2);transition:height 0.3s ease-out;display:flex;flex-direction:column;overflow:hidden;max-height:calc(100% - 80px);}

/* Drag strip — thin top overlay holding the pull-tab handle + touch
   gestures. z-index puts it above content. */
.sheet-drag-strip{position:absolute;top:0;left:0;right:0;height:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;z-index:2;}
.pull-tab-handle{width:40px;height:4px;background:#ccc;border-radius:2px;}

/* Collapse caret — same arrangement as desktop's .legend-collapse-caret. */
.mobile-collapse-caret{position:absolute;top:14px;left:6px;width:18px;height:18px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;color:#666;padding:0;z-index:3;transition:transform 0.3s ease-out;transform-origin:center;outline:none;-webkit-tap-highlight-color:transparent;}
.mobile-collapse-caret:focus{outline:none;}
.mobile-collapse-caret:hover{color:#333;}

/* Detail-mode close X — top-right corner */
.detail-close-btn{position:absolute;top:10px;right:12px;background:none;border:none;padding:4px;cursor:pointer;color:#666;display:flex;align-items:center;justify-content:center;z-index:3;transition:color 0.2s ease;}
.detail-close-btn:hover{color:#333;}

/* Content padding — 28px left clears the absolutely-positioned
   mobile-collapse-caret (left:6px, width:18px). NO right padding so
   the scrollbar sits at the FAR RIGHT edge (otherwise we get an ugly
   gap between the content and the scrollbar in detail mode). The
   detail-close-btn at right:12px is z-index:3 absolute and floats
   over content — it does not need padding to "make room" for it.
   Top 12px clears the drag strip overlay.
   IMPORTANT: NO backticks anywhere in this comment block — it lives
   inside a JS template literal (useShadowStyles) and a stray backtick
   silently closes the string and blanks the entire mobile stylesheet. */
.legend-content{flex:1;overflow-y:auto;overflow-x:hidden;padding:12px 0 12px 28px;-webkit-overflow-scrolling:touch;}
.legend-content::-webkit-scrollbar{width:4px;}
.legend-content::-webkit-scrollbar-track{background:transparent;}
.legend-content::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.18);border-radius:4px;}
.legend-content::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.3);}

/* Collapsed state — hide data rows AND column labels but keep the title
   row visible. Mirrors desktop: collapsed legend shows only "Legend".
   Collapsed-mode padding override aligns the title text vertical center
   with the absolute mobile-collapse-caret (top:14, height:18 -> center
   y=23). Title font 13px line-height 1.2 -> half-height ~8. So title
   text top should land at y ~= 16 -> total padding above title = 16. */
.legend-mobile-sheet.collapsed .legend-content .lrg-row,
.legend-mobile-sheet.collapsed .legend-content .lrg-footer,
.legend-mobile-sheet.collapsed .legend-content .lrg-header-col,
.legend-mobile-sheet.collapsed .legend-content .lft-row,
.legend-mobile-sheet.collapsed .legend-content .lft-row-child,
.legend-mobile-sheet.collapsed .legend-content .lft-header-col{display:none!important;}
/* Fully-collapsed sheet (showing only "Legend" + caret) drops the
   16px top-corner radius — square edges look cleaner when the sheet
   is acting as a thin bottom footer. Rounded corners return when
   expanded (user feedback 2026-04-27). */
.legend-mobile-sheet.collapsed{box-shadow:0 -2px 8px rgba(0,0,0,0.15);height:auto !important;min-height:0;border-top-left-radius:0;border-top-right-radius:0;}
.legend-mobile-sheet.collapsed .legend-content{padding-top:0!important;padding-bottom:0!important;}
.legend-mobile-sheet.collapsed .lrg-items,
.legend-mobile-sheet.collapsed .lft-items{padding:0!important;}
.legend-mobile-sheet.collapsed .lrg-title-row,
.legend-mobile-sheet.collapsed .lft-title-row{padding:16px 0!important;}

/* ── Mobile language-family tree overrides ──
   IMPORTANT: do NOT override .lft-title-row grid-template-columns here.
   The desktop CSS makes the title-row a SUBGRID of .lft-items so the
   UPGS / POPULATION column headers line up with the data rows' badges.
   An explicit grid-template-columns on the title-row breaks subgrid
   inheritance and causes the misaligned headers we saw in user feedback
   (2026-04-27).
   Tap-area: rows are 44px tall (Apple HIG) so the row is comfortably
   tappable; the in-row caret stays slim like desktop. The colored pill
   keeps its desktop look.
   No backticks anywhere in this comment block — see the earlier note. */
.legend-mobile-sheet .lft-row{min-height:44px;column-gap:8px;}
.legend-mobile-sheet .lft-row-child{margin-left:0;}
.legend-mobile-sheet .lft-item-inner{min-height:36px;padding:6px 8px;}
.legend-mobile-sheet .lft-name{font-size:13px;}
/* Collapsed-state row hiding lives in the unified block above (handles
   both .lrg-* and .lft-* in one place). */

/* ── Dark mode (class-based, driven by isDark prop) ── */
.sheet-dark{background:#3b463d!important;box-shadow:0 -4px 20px rgba(0,0,0,0.5)!important;}
.sheet-dark .mobile-collapse-caret{color:rgba(243,243,241,0.75)!important;}
.sheet-dark .mobile-collapse-caret:hover{color:#F3F3F1!important;}
.sheet-dark .detail-close-btn{color:rgba(243,243,241,0.75)!important;}
.sheet-dark .detail-close-btn:hover{color:#F3F3F1!important;}
.sheet-dark .pull-tab-handle{background:rgba(243,243,241,0.3)!important;}
.sheet-dark .legend-content{background:#3b463d!important;}
.sheet-dark .legend-content::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.2);}
`, 'legend-mobile-sheet')

const props = defineProps({
  legendType: {
    type: String,
    required: true
  },
  isDark: {
    type: Boolean,
    default: false
  },
  /** Popup action forwarded to PeopleGroupDetail — 'pray' | 'adopt' | 'none'. */
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

// Stores — injected from ProfileLoader (instance-scoped)
const uiStore = inject('uiStore')
const mapStore = inject('mapStore')
const dataStore = inject('dataStore')

// ── Data-driven legend (universal for all legend types) ─────────────────────
const legendTypeRef = toRef(props, 'legendType')
const {
  items: legendDataItems, columns: legendColumns, title: legendDataTitle,
  activeFilter, setFilter, totalCount, totalPopulation,
  fmtPop, fmtCount
} = useLegendData(legendTypeRef, RESEARCH_LEGEND_OPTIONS)

// LegendFamilyTree consumes the raw normalized people-groups (not pre-aggregated).
// research-map.vue provides the array via inject('normalizedPeopleGroups') —
// same contract as LegendDesktop. Falls back to scanning dataStore.sources so
// the tree still renders if the inject isn't wired (e.g. test harnesses).
const normalizedPeopleGroupsRef = inject('normalizedPeopleGroups', null)
const peopleGroupsForFamilyTree = computed(() => {
  if (normalizedPeopleGroupsRef?.value?.length) return normalizedPeopleGroupsRef.value
  const out = []
  for (const id in (dataStore?.sources || {})) {
    const src = dataStore.sources[id]
    if (src?.features?.length) out.push(...src.features)
  }
  return out
})

// SemanticTreeLegend tree adapter (mobile copy — same composable, same shape).
const _pgRefMobile = { get value() { return peopleGroupsForFamilyTree.value } }
const { langTree: langTreeForMobile } = useLanguageFamilyLegendData(_pgRefMobile)
const LANG_TABS_MOBILE = [
  { id: 'family',   label: 'Lang Family', info: 'A language family is a group of languages descended from a common ancestor.' },
  { id: 'language', label: 'Language',    info: 'A language is a system of communication used by a people.' },
  { id: 'dialect',  label: 'Dialect',     info: 'A dialect/variety is a regional or social form of a language.' },
]

// Touch gesture state
const touchStartY = ref(0)
const touchStartHeight = ref(0)
const containerHeight = ref(0) // actual container height (not window height)
const isDragging = ref(false)

// Computed properties from stores
const legendState = computed(() => uiStore.legendState)
const legendHeight = computed(() => uiStore.legendHeight)
const caretRotation = computed(() => uiStore.caretRotation)
const showPullTab = computed(() => uiStore.showPullTab)
const legendMode = computed(() => uiStore.legendMode)
const selectedPeopleGroup = computed(() => uiStore.selectedPeopleGroup)

// Legend title — swaps based on legend state and selection
const legendTitle = computed(() => {
  if (legendMode.value === 'detail' && selectedPeopleGroup.value) {
    return selectedPeopleGroup.value.properties?.name || t('legend.header.peopleGroupFallback')
  }

  if (legendState.value === 'collapsed') {
    return t('legend.header.collapsed')
  }

  return legendDataTitle.value
})

// Handle row click from LegendRowGroup
function handleRowFilterClick(filterKey) {
  uiStore.handleLegendItemClick()
  setFilter(filterKey)
}

// Methods
function handleCaretClick() {
  uiStore.toggleLegend()
}

function handleCloseDetail() {
  uiStore.selectPeopleGroup(null) // Return to data-view mode
  uiStore.openLegend() // Snap back to 30% so map is visible
}

// Mini-image URL for the floating image above drawer at 30%
const miniImageUrl = computed(() => {
  if (!selectedPeopleGroup.value) return null
  const props_ = selectedPeopleGroup.value.properties || {}
  // TODO: `_raw.ImageURL` is a DOXA CSV-specific fallback. Generic usage
  // should rely on a normalized `imageUrl` field from the data source.
  return props_.imageUrl || props_._raw?.ImageURL || null
})

// Touch gesture handlers for pull tab
function handlePullTabTouchStart(event) {
  if (legendState.value !== 'collapsed') {
    touchStartY.value = event.touches[0].clientY
    const sheet = event.currentTarget.parentElement
    touchStartHeight.value = sheet.offsetHeight
    // Store the map container height (parent of the sheet) for clamping
    containerHeight.value = sheet.parentElement?.offsetHeight || window.innerHeight
    isDragging.value = true
  }
}

function handlePullTabTouchMove(event) {
  if (!isDragging.value) return

  event.preventDefault() // Prevent scrolling while dragging

  const currentY = event.touches[0].clientY
  const deltaY = touchStartY.value - currentY // Positive = drag up, Negative = drag down

  // Calculate new height
  const newHeight = touchStartHeight.value + deltaY
  const availHeight = containerHeight.value || window.innerHeight

  // Clamp between 30% and (container - toolbar)
  const minHeight = availHeight * 0.3
  const maxHeight = availHeight - 56 // 56px = map toolbar height
  const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight))

  // Set height dynamically (smooth dragging)
  uiStore.setLegendHeight(`${clampedHeight}px`)
}

function handlePullTabTouchEnd(event) {
  isDragging.value = false

  // Read actual pixel height of the sheet — DO NOT parse legendHeight.value
  // because it's a mixed-unit CSS string ('48px' / '30%' / 'calc(100% - 80px)').
  const sheet = event?.currentTarget?.parentElement
  const currentHeight = sheet ? sheet.offsetHeight : touchStartHeight.value
  const startHeight   = touchStartHeight.value
  const availHeight   = containerHeight.value || window.innerHeight

  // Gesture direction — ignore a few pixels of noise from tap vs true drag.
  const JITTER = 8
  const movedUp   = currentHeight > startHeight + JITTER
  const movedDown = currentHeight < startHeight - JITTER

  // Pure tap (no movement) — let the @click handler own the cascade.
  if (!movedUp && !movedDown) return

  const startedFullyOpen = startHeight >= availHeight * 0.55
  const startedOpen      = startHeight >= availHeight * 0.2 && !startedFullyOpen

  if (movedDown && startedFullyOpen) {
    // Any noticeable downward drag from fullyOpen → 30% (one step down the ladder).
    uiStore.openLegend()
  } else if (movedDown && startedOpen) {
    // Dragged down from 30% → collapse.
    uiStore.collapseLegend()
  } else if (movedUp) {
    // Upward drag → fully open.
    uiStore.fullyOpenLegend()
  } else {
    // Fallback — shouldn't normally hit given the early return above.
    uiStore.openLegend()
  }
}

// Lifecycle hooks
onMounted(() => {
  // mounted
})

onBeforeUnmount(() => {
  // cleanup
})
</script>

<template>
  <!-- Containment wrapper: ensures position:absolute children are clipped to the map area
       and never escape the shadow DOM host / staging frame. -->
  <div class="legend-sheet-root">
    <!-- Floating mini-image: fixed 16px above the sheet's resting position (30%).
         The sheet slides UP over it — the image never moves. -->
    <div
      v-if="legendMode === 'detail' && selectedPeopleGroup && legendState === 'open' && miniImageUrl"
      class="floating-mini-image"
      @click="uiStore.fullyOpenLegend()"
    >
      <img
        :src="miniImageUrl"
        :alt="selectedPeopleGroup.properties?.name"
        class="mini-image"
      />
    </div>

    <div class="legend-mobile-sheet" :class="[legendState, { 'sheet-dark': isDark }]" :style="{ height: legendHeight }">
      <!-- Thin drag strip at the very top: pull-tab visual + touch gestures. -->
      <div class="sheet-drag-strip"
        @click="handleCaretClick"
        @touchstart="showPullTab ? handlePullTabTouchStart($event) : null"
        @touchmove="showPullTab ? handlePullTabTouchMove($event) : null"
        @touchend="showPullTab ? handlePullTabTouchEnd($event) : null"
      >
        <div v-if="showPullTab" class="pull-tab-handle"></div>
      </div>

      <!-- Collapse caret — absolutely positioned, same pattern as desktop. -->
      <button
        class="mobile-collapse-caret"
        :style="{ transform: `rotate(${caretRotation}deg)` }"
        @click.stop="handleCaretClick"
        :aria-label="t('aria.toggleLegend')"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <!-- Detail-mode close X — absolutely positioned top-right -->
      <button
        v-if="legendMode === 'detail'"
        class="detail-close-btn"
        @click.stop="handleCloseDetail"
        :aria-label="t('aria.backToLegend')"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>

      <!-- Sheet body — same LegendRows invocation as desktop. -->
      <div class="legend-content">
        <PeopleGroupDetail
          v-if="legendMode === 'detail' && selectedPeopleGroup"
          :peopleGroup="selectedPeopleGroup"
          :hideHeader="true"
          :dark="isDark"
          :action="popupAction"
        />

        <!-- Language-family tab: SemanticTreeLegend (PPLR-ported, R4).
             Same component as LegendDesktop; the mobile sheet just provides
             different chrome. Tree-data adapter is wired the same way. -->
        <SemanticTreeLegend
          v-else-if="legendType === 'language-family'"
          :nodes="langTreeForMobile"
          :tabs="LANG_TABS_MOBILE"
          :title="legendTitle || 'Language Families'"
          :columns="['count', 'pop']"
        />

        <!-- disableCollapse is FORCED TRUE here too — child-row carets are
             feature-flagged off. Flip back to `disableCollapse` (prop
             passthrough) when the sub-row expand UI is ready. -->
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
    </div>
  </div><!-- /.legend-sheet-root -->
</template>

<style scoped>
/* All runtime styles are injected via useShadowStyles above. */
</style>
