<template>
  <div class="prayer-progress-legend" :class="isDark ? 'dark-theme' : 'light-theme'">
    <!-- Column header row (hidden when parent provides its own) -->
    <div v-if="!hideColumnHeader" class="ppl-header">
      <span class="ppl-header-spacer"></span>
      <span class="ppl-header-label"></span>
      <span class="ppl-header-col">UPGs</span>
      <span class="ppl-header-col">Population</span>
    </div>

    <div class="ppl-items">
      <!-- Primary row (Needs Prayer / Needs Engagement) -->
      <div class="ppl-row">
        <span
          class="ppl-caret"
          :class="{ expanded: !isPrimaryCollapsed }"
          @click.stop="togglePrimaryCard"
        ><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <div
          class="ppl-item"
          :class="{ selected: activeFilter === config.primaryKey }"
          @click="handleFilterClick(config.primaryKey)"
        >
          <div class="ppl-item-inner" :style="{ backgroundColor: config.primaryColor }">
            <span class="ppl-name">{{ config.primaryLabel }}</span>
            <span class="ppl-badge"><span class="ppl-badge-inner">{{ formatUPGCount(primaryStats.upgCount) }}</span></span>
            <span class="ppl-badge"><span class="ppl-badge-inner">{{ formatPopulation(primaryStats.population) }}</span></span>
          </div>
        </div>
      </div>

      <!-- Secondary row (Has Prayer / Has Engagement) — shown when expanded -->
      <div v-if="!isPrimaryCollapsed" class="ppl-row ppl-row-child">
        <span class="ppl-header-spacer"></span>
        <div
          class="ppl-item"
          :class="{ selected: activeFilter === config.secondaryKey }"
          @click="handleFilterClick(config.secondaryKey)"
        >
          <div class="ppl-item-inner" :style="{ backgroundColor: config.secondaryColor }">
            <span class="ppl-name">{{ config.secondaryLabel }}</span>
            <span class="ppl-badge"><span class="ppl-badge-inner">{{ formatUPGCount(secondaryStats.upgCount) }}</span></span>
            <span class="ppl-badge"><span class="ppl-badge-inner">{{ formatPopulation(secondaryStats.population) }}</span></span>
          </div>
        </div>
      </div>

      <!-- Tertiary row (Full Prayer Coverage) — shown when expanded, prayer only -->
      <div v-if="!isPrimaryCollapsed && config.tertiaryKey" class="ppl-row ppl-row-child">
        <span class="ppl-header-spacer"></span>
        <div
          class="ppl-item"
          :class="{ selected: activeFilter === config.tertiaryKey }"
          @click="handleFilterClick(config.tertiaryKey)"
        >
          <div class="ppl-item-inner" :style="{ backgroundColor: config.tertiaryColor }">
            <span class="ppl-name">{{ config.tertiaryLabel }}</span>
            <span class="ppl-badge"><span class="ppl-badge-inner">{{ formatUPGCount(tertiaryStats.upgCount) }}</span></span>
            <span class="ppl-badge"><span class="ppl-badge-inner">{{ formatPopulation(tertiaryStats.population) }}</span></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from 'vue';
import { PRAYER_COLORS, checkHasPrayer, getPrayerLevel } from '../config/prayerColors.js';
import { ENGAGEMENT_COLORS, ADOPTION_COLORS } from '../config/colorStrategies.js';
import { useShadowStyles } from '../composables/useShadowStyles.js';
import { getApiBaseUrl } from '../utils/apiBaseUrl.js';

useShadowStyles(`
/* ── Wrapper ── */
.prayer-progress-legend{display:flex;flex-direction:column;height:100%;}

/* ── Column header row ── */
.ppl-header{display:flex;align-items:center;padding:4px 0;border-bottom:1px solid rgba(0,0,0,0.07);font-weight:600;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.4px;background:#fff;position:sticky;top:0;z-index:10;}
.ppl-header-spacer{width:28px;flex-shrink:0;}
.ppl-header-label{flex:1;min-width:0;padding:0 10px;}
.ppl-header-col{width:48px;text-align:right;flex-shrink:0;padding-right:10px;white-space:nowrap;}

/* ── Rows ── */
.ppl-items{flex:1;overflow-y:auto;overflow-x:hidden;}
.ppl-row{display:flex;align-items:center;width:100%;border-bottom:1px solid rgba(0,0,0,0.05);}
.ppl-row-child{margin-left:0;border-bottom:1px solid rgba(0,0,0,0.04);}
.ppl-caret{width:28px;flex-shrink:0;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;color:#888;transition:transform 0.2s ease;user-select:none;outline:none;-webkit-tap-highlight-color:transparent;align-self:stretch;padding:0;}
.ppl-caret:focus{outline:none;}
.ppl-caret.expanded{transform:rotate(90deg);}

/* ── Item pill (colored bar) ── */
.ppl-item{flex:1;display:flex;align-items:center;padding:7px 0;cursor:pointer;transition:all 0.15s ease;min-height:36px;}
.ppl-item:hover{opacity:0.88;}
.ppl-item.selected{outline:2px solid rgba(0,0,0,0.25);outline-offset:-2px;}
.ppl-item-inner{flex:1;display:flex;align-items:center;border-radius:4px;padding:5px 0;min-height:28px;margin-right:0;}
.ppl-name{flex:1;min-width:0;font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 10px;}
.ppl-badge{width:48px;flex-shrink:0;text-align:right;padding-right:10px;}
.ppl-badge-inner{display:inline-block;background:rgba(0,0,0,0.15);border-radius:8px;padding:1px 6px;font-size:11px;font-weight:600;font-family:'Courier New',monospace;white-space:nowrap;min-width:32px;text-align:right;}

/* ── Light mode colors ── */
.prayer-progress-legend.light-theme .ppl-header{background:#fff;color:#777;}
.prayer-progress-legend.light-theme .ppl-name{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.35);}
.prayer-progress-legend.light-theme .ppl-badge-inner{background:rgba(0,0,0,0.18);color:#fff;}
.prayer-progress-legend.light-theme .ppl-caret{color:#666;}
.prayer-progress-legend.light-theme .ppl-row{border-bottom-color:rgba(0,0,0,0.06);}
.prayer-progress-legend.light-theme .ppl-item.selected{outline-color:rgba(0,0,0,0.3);}

/* ── Dark mode colors ── */
.prayer-progress-legend.dark-theme .ppl-header{background:#2a332a;color:rgba(243,243,241,0.65);border-bottom-color:rgba(255,255,255,0.08);}
.prayer-progress-legend.dark-theme .ppl-name{color:#F3F3F1;text-shadow:0 1px 2px rgba(0,0,0,0.4);}
.prayer-progress-legend.dark-theme .ppl-badge-inner{background:rgba(255,255,255,0.15);color:#F3F3F1;}
.prayer-progress-legend.dark-theme .ppl-caret{color:rgba(243,243,241,0.75);}
.prayer-progress-legend.dark-theme .ppl-row{border-bottom-color:rgba(255,255,255,0.06);}
.prayer-progress-legend.dark-theme .ppl-items{background:#3b463d;}
.prayer-progress-legend.dark-theme .ppl-item.selected{outline-color:rgba(255,255,255,0.35);}
`, 'legend-prayer-progress')

// ─── Props ────────────────────────────────────────────────────────────────────
// legendType: 'prayer' | 'engagement' | 'adoption'
// Adding more types in future just means adding an entry to LEGEND_CONFIGS below.
const props = defineProps({
  legendType: {
    type: String,
    default: 'prayer'
  },
  isDark: {
    type: Boolean,
    default: false
  },
  hideColumnHeader: {
    type: Boolean,
    default: false
  }
})

// ─── Legend configuration map ─────────────────────────────────────────────────
// Prayer is now 3-tier (red/orange/green). Engagement stays binary.
// To add a new legend type: add an entry here and a checkFn below.
const LEGEND_CONFIGS = {
  prayer: {
    primaryKey:     'noPrayer',
    primaryLabel:   'Needs Prayer',
    primaryColor:   PRAYER_COLORS.noPrayer,
    secondaryKey:   'hasPrayer',
    secondaryLabel: 'Has Prayer',
    secondaryColor: PRAYER_COLORS.hasPrayer,
    tertiaryKey:    'fullPrayer',
    tertiaryLabel:  'Has Full Prayer Coverage',
    tertiaryColor:  PRAYER_COLORS.fullPrayer,
    checkPrimary:   (p) => getPrayerLevel(p) === 'noPrayer',
    checkSecondary: (p) => getPrayerLevel(p) === 'hasPrayer',
    checkTertiary:  (p) => getPrayerLevel(p) === 'fullPrayer'
  },
  engagement: {
    primaryKey:     'notEngaged',
    primaryLabel:   'Needs Engagement',
    primaryColor:   ENGAGEMENT_COLORS.notEngaged,
    secondaryKey:   'hasEngagement',
    secondaryLabel: 'Has Engagement',
    secondaryColor: ENGAGEMENT_COLORS.hasEngagement,
    tertiaryKey:    null,
    tertiaryLabel:  null,
    tertiaryColor:  null,
    checkPrimary:   (p) => !checkHasEngagement(p),
    checkSecondary: (p) => checkHasEngagement(p),
    checkTertiary:  null
  },
  adoption: {
    primaryKey:     'notAdopted',
    primaryLabel:   'Needs Adoption',
    primaryColor:   ADOPTION_COLORS.notAdopted,
    secondaryKey:   'hasAdoption',
    secondaryLabel: 'Has Adoption',
    secondaryColor: ADOPTION_COLORS.hasAdoption,
    tertiaryKey:    null,
    tertiaryLabel:  null,
    tertiaryColor:  null,
    checkPrimary:   (p) => !checkHasAdoption(p),
    checkSecondary: (p) => checkHasAdoption(p),
    checkTertiary:  null
  }
}

// Engagement check (mirrors colorStrategies logic)
// Reads normalized `engagementStatus` or raw `people_committed` count
function checkHasEngagement(props) {
  const val = props.engagementStatus ?? props._raw?.people_committed
  return val === true || val === 1 || val === '1' || val === 'true'
      || (typeof val === 'number' && val > 0)
      || (typeof val === 'string' && parseInt(val, 10) > 0)
}

// Adoption check (mirrors adoptionStatus normalization in DataSourceManager)
// Reads normalized `adoptionStatus` or raw `adopted_by_churches` count
function checkHasAdoption(props) {
  const val = props.adoptionStatus ?? props._raw?.adopted_by_churches
  return val === true || val === 1 || val === '1' || val === 'true'
      || (typeof val === 'number' && val > 0)
      || (typeof val === 'string' && parseInt(val, 10) > 0)
}

const config = computed(() => LEGEND_CONFIGS[props.legendType] ?? LEGEND_CONFIGS.prayer)

const uiStore = inject('uiStore');
const dataStore = inject('dataStore');

// Collapse state for the parent (primary) row caret
const isPrimaryCollapsed = ref(false);

// Active filter — all types now route through uiStore for map reactivity
const localFilter = ref(null)
const activeFilter = computed(() => {
  if (props.legendType === 'prayer')     return uiStore.prayerFilter
  if (props.legendType === 'engagement') return uiStore.engagementFilter
  if (props.legendType === 'adoption')   return uiStore.adoptionFilter
  return localFilter.value
})

// ─────────────────────────────────────────────────────────────────
// API Statistics — prayer only (GET /api/people-groups/statistics)
// ─────────────────────────────────────────────────────────────────
const apiStats = ref(null);
const apiStatsError = ref(false);

async function fetchApiStats() {
  if (props.legendType !== 'prayer') return
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return;
  try {
    const res = await fetch(`${baseUrl}/api/people-groups/statistics`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    apiStats.value = await res.json();
    apiStatsError.value = false;
  } catch (err) {
    apiStatsError.value = true;
  }
}

onMounted(fetchApiStats);

// ─── Local data scan ──────────────────────────────────────────────────────────
// Scans all loaded sources in dataStore (keyed by sourceId)
function localScan(filterFn) {
  const allSources = Object.values(dataStore.sources || {})
  const features = allSources.flatMap(src => src?.features || [])
  const groups = features.filter(item => {
    const p = item.properties || item;
    return filterFn(p);
  });
  return {
    upgCount: groups.length,
    population: groups.reduce((sum, item) => {
      const p = item.properties || item;
      return sum + (parseInt(p.population || p._raw?.Population || 0) || 0);
    }, 0)
  };
}

const primaryStats = computed(() => localScan(config.value.checkPrimary))

const secondaryStats = computed(() => {
  const local = localScan(config.value.checkSecondary)
  // For prayer: prefer live API count if available
  if (
    props.legendType === 'prayer' &&
    apiStats.value && !apiStatsError.value &&
    apiStats.value.total_with_prayer != null
  ) {
    return { upgCount: apiStats.value.total_with_prayer, population: local.population };
  }
  return local;
});

const tertiaryStats = computed(() => {
  if (!config.value.checkTertiary) return { upgCount: 0, population: 0 }
  return localScan(config.value.checkTertiary)
});

function togglePrimaryCard() {
  isPrimaryCollapsed.value = !isPrimaryCollapsed.value;
}

function handleFilterClick(filterKey) {
  if (props.legendType === 'prayer') {
    uiStore.setPrayerFilter(uiStore.prayerFilter === filterKey ? null : filterKey)
  } else if (props.legendType === 'engagement') {
    uiStore.setEngagementFilter(uiStore.engagementFilter === filterKey ? null : filterKey)
  } else if (props.legendType === 'adoption') {
    uiStore.setAdoptionFilter(uiStore.adoptionFilter === filterKey ? null : filterKey)
  } else {
    localFilter.value = localFilter.value === filterKey ? null : filterKey
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatPopulation(population) {
  if (population >= 1000000) {
    const m = (population / 1000000).toFixed(1);
    return `${m.padStart(5, ' ')}M`;
  } else if (population >= 1000) {
    const k = (population / 1000).toFixed(1);
    return `${k.padStart(5, ' ')}K`;
  }
  return population.toLocaleString().padStart(6, ' ');
}

function formatUPGCount(count) {
  const n = Number(count) || 0;
  return n.toLocaleString().padStart(6, ' ');
}
</script>

<style scoped>
/* All styles are injected via useShadowStyles() above.
   This block intentionally kept empty to prevent scoped-CSS specificity
   from overriding the shadow-DOM-injected dark theme styles. */
</style>
