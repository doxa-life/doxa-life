<script setup>
import { ref, computed, onMounted, onBeforeUnmount, inject, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useShadowStyles } from '../composables/useShadowStyles.js'
import { useLegendData } from '../composables/useLegendData.js'
import LegendRows from './LegendRows.vue'
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

/* Sheet shell — no padding; drag strip is an absolutely positioned overlay.
   The collapse caret now renders inside the LegendRows #title-caret slot
   (grid col 1), same as desktop.
   Base min-height guarantees the collapsed title row is visible on first
   paint, before any uiStore hydration resolves legendHeight. */
/* Height transition at 220ms matches native bottom-sheet timing on iOS /
   Android. Emphasized-decelerate curve makes the sheet feel "thrown" into
   its resting position rather than sliding uniformly. */
.legend-mobile-sheet{position:absolute;bottom:0;left:0;right:0;z-index:1000;background:white;border-top-left-radius:16px;border-top-right-radius:16px;box-shadow:0 -4px 20px rgba(0,0,0,0.2);transition:height 220ms cubic-bezier(0.2,0,0,1);display:flex;flex-direction:column;overflow:hidden;max-height:calc(100% - 80px);min-height:52px;will-change:height;}
/* While the user is actively dragging the pull-tab, height MUST track the
   finger 1:1 — any transition here causes the sheet to lag behind the
   finger. Disable the transition for the duration of the gesture; it
   re-engages on touchend when the state snaps to open/collapsed/fullyOpen. */
.legend-mobile-sheet.sheet-dragging{transition:none !important;}

/* Drag strip — thin top overlay holding the pull-tab handle + touch
   gestures. z-index puts it above content; pointer-events:none on the
   content area below continues unaffected. */
.sheet-drag-strip{position:absolute;top:0;left:0;right:0;height:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;z-index:2;touch-action:none;-webkit-user-select:none;}
.pull-tab-handle{width:40px;height:4px;background:#ccc;border-radius:2px;}

/* Collapse caret — rendered into LegendRows' #title-caret slot, so it lives
   in the grid's caret column (col 1), centered with zero padding. Rotation
   is driven inline via :style (caretRotation deg). */
.mobile-collapse-caret{width:10px;height:10px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;color:#666;padding:0;transition:transform 180ms cubic-bezier(0.2,0,0,1);transform-origin:center;outline:none;-webkit-tap-highlight-color:transparent;will-change:transform;}
.mobile-collapse-caret:focus{outline:none;}
.mobile-collapse-caret:hover{color:#333;}

/* Detail-mode close X — top-right corner */
.detail-close-btn{position:absolute;top:10px;right:12px;background:none;border:none;padding:4px;cursor:pointer;color:#666;display:flex;align-items:center;justify-content:center;z-index:3;transition:color 0.2s ease;}
.detail-close-btn:hover{color:#333;}

/* Content — no padding; vertical + horizontal padding both live inside
   LegendRows (.lrg-items padding 12px 0 + caret/trailing columns).
   Adding padding here would push the collapsed title row below the
   sheet's min-height and make the legend appear empty on mobile. */
.legend-content{flex:1;overflow-y:auto;overflow-x:hidden;padding:0;display:flex;flex-direction:column;min-height:0;-webkit-overflow-scrolling:touch;}
.legend-content::-webkit-scrollbar{width:4px;}
.legend-content::-webkit-scrollbar-track{background:transparent;}
.legend-content::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.18);border-radius:4px;}
.legend-content::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,0.3);}

/* Collapsed state — hide data rows AND column labels but keep the title
   row + caret visible. Mirrors desktop: collapsed legend shows only "Legend".
   Definite height (not auto) so the flex:1 chain (sheet → .legend-content →
   .lrg-items) resolves predictably on mobile browsers — an auto-height
   sheet with flex-basis:0 children can collapse to 0 content-height
   despite min-height keeping the outer frame at 52px. Also collapse the
   grid's caret + title rows so only the title row's caret and "Legend"
   text render inside the 52px strip. */
.legend-mobile-sheet.collapsed .legend-content .lrg-row,
.legend-mobile-sheet.collapsed .legend-content .lrg-footer,
.legend-mobile-sheet.collapsed .legend-content .lrg-header-col{display:none!important;}
/* Flat top edges in collapsed footer mode — matches the research-map
   pattern (qa: 2026-05-04 user feedback). Rounded corners return when the
   sheet is expanded since the base .legend-mobile-sheet rule still sets
   border-top-*-radius:16px and only the .collapsed override zeroes them. */
.legend-mobile-sheet.collapsed{box-shadow:0 -2px 8px rgba(0,0,0,0.15);height:52px !important;min-height:52px;border-top-left-radius:0;border-top-right-radius:0;}
.legend-mobile-sheet.collapsed .lrg-items{grid-template-columns:var(--lrg-caret-col) auto var(--lrg-caret-col) !important;padding:0 !important;align-content:center;}
.legend-mobile-sheet.collapsed .lrg-title-row{padding:0 !important;}

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

// Initialize stores — injected from ProfileLoader (instance-scoped)
const uiStore = inject('uiStore')
const mapStore = inject('mapStore')
const dataStore = inject('dataStore')

// ── Data-driven legend (universal for all legend types) ─────────────────────
const legendTypeRef = toRef(props, 'legendType')
const {
  items: legendDataItems, columns: legendColumns, title: legendDataTitle,
  activeFilter, setFilter, totalCount, totalPopulation,
  fmtPop, fmtCount
} = useLegendData(legendTypeRef)

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
const legendMode = computed(() => uiStore.legendMode) // NEW: prayer vs detail mode
const selectedPeopleGroup = computed(() => uiStore.selectedPeopleGroup) // NEW: for detail view

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
  if (legendState.value === 'collapsed') {
    return t('legend.header.collapsed')
  }

  // (G) When legend is OPEN → show the map's configured title from legend data
  // This is the legendDataTitle from useLegendData (e.g., "Prayer Progress", "Engagement Progress")
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
  uiStore.selectPeopleGroup(null) // Return to prayer mode
  uiStore.openLegend() // Snap back to 30% so map is visible
}

// Mini-image URL for the floating image above drawer at 30%
const miniImageUrl = computed(() => {
  if (!selectedPeopleGroup.value) return null
  const props_ = selectedPeopleGroup.value.properties || {}
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
  // Parsing those gave 48 / 30 / NaN respectively, which then compared against
  // real pixel `startHeight` and falsely tripped the "dragged down" branch on
  // simple taps — collapsing the legend when the user meant to caret-cascade.
  const sheet = event?.currentTarget?.parentElement
  const currentHeight = sheet ? sheet.offsetHeight : touchStartHeight.value
  const startHeight   = touchStartHeight.value
  const availHeight   = containerHeight.value || window.innerHeight

  // Gesture direction — ignore a few pixels of noise from tap vs true drag.
  const JITTER = 8
  const movedUp   = currentHeight > startHeight + JITTER
  const movedDown = currentHeight < startHeight - JITTER

  // Pure tap (no movement) — let the @click handler (handleCaretClick →
  // toggleLegend) own the cascade. Returning early prevents touchend from
  // stepping on the cascade.
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
       and never escape the shadow DOM host / staging frame (fixes underlapping in gem-frame). -->
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

    <div class="legend-mobile-sheet" :class="[legendState, { 'sheet-dark': isDark, 'sheet-dragging': isDragging }]" :style="{ height: legendHeight }">
      <!-- Thin drag strip at the very top: pull-tab visual + touch gestures.
           Invisible handle of a few px tall so the caret+title below can sit
           close together like desktop. -->
      <div class="sheet-drag-strip"
        @click="handleCaretClick"
        @touchstart="showPullTab ? handlePullTabTouchStart($event) : null"
        @touchmove="showPullTab ? handlePullTabTouchMove($event) : null"
        @touchend="showPullTab ? handlePullTabTouchEnd($event) : null"
      >
        <div v-if="showPullTab" class="pull-tab-handle"></div>
      </div>

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

      <!-- Sheet body — same LegendRows invocation as desktop, with title
           rendered as the first row of the table and collapse caret injected
           into the #title-caret slot so caret + title read as one visual row. -->
      <div class="legend-content">
        <PeopleGroupDetail
          v-if="legendMode === 'detail' && selectedPeopleGroup"
          :peopleGroup="selectedPeopleGroup"
          :hideHeader="true"
          :dark="isDark"
          :action="popupAction"
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
        >
          <template #title-caret>
            <button
              class="mobile-collapse-caret"
              :style="{ transform: `rotate(${caretRotation}deg)` }"
              @click.stop="handleCaretClick"
              :aria-label="t('aria.toggleLegend')"
            >
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </template>
        </LegendRows>
      </div>
    </div>
  </div><!-- /.legend-sheet-root -->
</template>

<style scoped>
/* All legend-mobile-sheet / .legend-content / collapsed rules live in
   useShadowStyles above. Do NOT re-declare them here — scoped rules get
   a data-v-* attribute selector which beats even !important useShadowStyles
   rules (that's what caused the invisible collapsed sheet). Only keep
   containment/layout rules that have no useShadowStyles counterpart. */
.floating-mini-image {
  position: absolute;
  left: 16px;
  bottom: calc(30% + 16px);
  z-index: 999;
  pointer-events: auto;
  cursor: pointer;
}

.mini-image {
  width: 120px;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  display: block;
}

.legend-sheet-root {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.legend-sheet-root > * {
  pointer-events: auto;
}
</style>
