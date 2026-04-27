<script setup>
/**
 * LegendFamilyTree — language-family table with carat expand/collapse.
 *
 * MERGE LINEAGE
 *   - Chrome: NEW CSS-table look from LegendRows.vue (subgrid, pill rows,
 *     sticky title row).
 *   - Behavior: OLD doxa-map-app-widget LegendComponent.vue carat semantics
 *     (default-collapsed family rows; click chevron to reveal language rows).
 *
 * RENDERING CONTRACT
 *   - Rendered INSIDE LegendDesktop / LegendMobile when `legendType` is
 *     `'language-family'`. The card chrome (header, collapse caret, dark mode,
 *     close button) stays in the parent — this component owns ONLY the table.
 *   - Slot `before-rows` available for future cluster controls / search.
 *
 * EVENTS
 *   - Emits `highlight` on parent-component channel AND dispatches a
 *     `legend:highlight` window event via the composable. Both are equivalent
 *     — the window event is the cross-shadow-DOM contract; the parent emit
 *     is for callers that want a Vue-native handler.
 *
 * CLUSTER-READY
 *   - Rows whose `kind === 'cluster'` render a small cluster icon next to the
 *     count badge. Clicking such a row fires `kind: 'cluster'` (handled in
 *     the composable). Today no upstream sets clusterId — this is a hook for
 *     when clustering ships.
 */
import { defineProps, defineEmits, computed, inject } from 'vue'
import { useShadowStyles } from '@/composables/useShadowStyles.js'
import { useLanguageFamilyLegendData } from '../composables/useLanguageFamilyLegendData.js'

// mapStore.selectedFamily is the source of truth for "which row is currently
// active" — research-map.vue's applyDimFilter writes it on highlight. The
// legend reads it back here to paint a `.lft-row-selected` class on the
// matching row (qa.md row-selection-indicator request).
const mapStore = inject('mapStore', null)
const selectedFamilyKey = computed(() => mapStore?.selectedFamily || null)
const selectedLanguageKey = computed(() => mapStore?.selectedLanguage || null)

const props = defineProps({
  /** Ref<NormalizedPeopleGroup[]> — passed by parent. */
  peopleGroups: { type: Array, required: true },
  /** Active language-family aggregation method. Reserved for future use. */
  aggregator:   { type: String, default: 'auto' },
  /** Title rendered as the first row of the subgrid (parent supplies localized string). */
  title:        { type: String, default: 'Language Families' },
  /** Column labels — keep in sync with LegendRows: [{ key:'count', label }, { key:'population', label }] */
  columns:      {
    type: Array,
    default: () => ([
      { key: 'count',      label: 'UPGS',       width: 48 },
      { key: 'population', label: 'POPULATION', width: 48 }
    ])
  },
  /** Dark mode flag — mirrors LegendRows class toggle. */
  isDark:       { type: Boolean, default: false },
  /** Population formatter (parent supplies fmtPop from useLegendData). */
  fmtPop:       { type: Function, default: v => String(v || 0) },
  /** Count formatter (parent supplies fmtCount from useLegendData). */
  fmtCount:     { type: Function, default: v => String(v || 0) }
})

const emit = defineEmits(['highlight'])

// Wrap the array prop into a Ref-like for the composable. The composable
// accepts any { value } object; using a getter keeps reactivity even when the
// parent passes a reactive prop directly.
const peopleGroupsRef = { get value() { return props.peopleGroups } }

const { rows, toggle, isExpanded, childRowsFor, highlight } =
  useLanguageFamilyLegendData(peopleGroupsRef, { aggregator: props.aggregator })

function handleRowClick(row) {
  highlight(row)
  emit('highlight', row)
}

function handleCaretClick(familyKey, evt) {
  evt.stopPropagation() // Caret toggles expand only — does NOT fire highlight.
  toggle(familyKey)
}

// ── Shadow-DOM-injected styles. Re-uses the .lrg-* selectors from LegendRows
// so the visual stays identical to the rest of the legend table.
useShadowStyles(`
/* CSS-table layout — IDENTICAL pattern to LegendRows.vue: one parent grid
   with subgrid children so the title row's column headers (UPGS / POPULATION)
   align perfectly with the data rows' badges. Tracks: caret-col | name 1fr |
   UPGS auto | POPULATION auto | trailing caret-col. */
.legend-family-tree{--lft-caret-col:10px;display:flex;flex-direction:column;height:100%;min-height:0;}
/* Items: NO top padding — that area is owned by the sticky .lft-title-row's
   internal padding-top so the white sticky bg covers it. Otherwise scrolled
   data rows leak into a transparent gutter ABOVE the sticky header. */
.lft-items{display:grid;grid-template-columns:var(--lft-caret-col) minmax(80px,1fr) auto auto var(--lft-caret-col);grid-auto-rows:auto;align-content:start;column-gap:6px;row-gap:6px;padding:0 0 12px;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;-ms-overflow-style:none;}
.lft-items::-webkit-scrollbar{display:none;width:0;height:0;}
/* Title row — first row of the table, subgrid of .lft-items. Sticky so caret
   + UPGS/POPULATION column headers stay visible while rows scroll. The
   12px padding-top is INSIDE this sticky element so its white background
   covers what was previously the .lft-items padding-top gutter. */
.lft-title-row{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;align-items:center;padding:12px 0 6px;position:sticky;top:0;z-index:5;background:#fff;}
.lft-dark .lft-title-row{background:#3b463d;}
.lft-title-caret-slot{grid-column:1;justify-self:center;align-self:center;display:flex;align-items:center;justify-content:center;line-height:1;}
/* line-height:1.2 (not 1) so the G in UPGS / cap-letter ascenders aren't clipped. */
.lft-title{grid-column:2;align-self:center;padding:0 8px;font-weight:600;font-size:13px;line-height:1.2;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.lft-header-col{align-self:center;text-align:center;white-space:nowrap;font-size:10px;line-height:1.3;color:#888;text-transform:uppercase;letter-spacing:0.3px;font-weight:700;}
/* Data rows — also subgrids of .lft-items so columns line up with the title. */
.lft-row{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;align-items:center;min-height:36px;}
.lft-row-child{margin-left:0;}
/* Caret cell — col 1 of the parent grid, centered. */
.lft-caret{grid-column:1;justify-self:center;align-self:center;width:14px;height:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#374151;background:transparent;border:none;padding:0;transition:transform 0.2s ease;outline:none;-webkit-tap-highlight-color:transparent;}
.lft-caret:hover{background:rgba(0,0,0,0.06);border-radius:3px;color:#111;}
.lft-caret:focus{outline:none;}
.lft-caret.expanded{transform:rotate(90deg);}
.lft-caret-spacer{grid-column:1;width:14px;}
/* The clickable pill — subgrid that spans cols 2..-2 (name + UPGs + POPULATION). */
.lft-item{display:contents;cursor:pointer;}
.lft-item-inner{display:grid;grid-template-columns:subgrid;grid-column:2 / -2;align-items:center;border-radius:6px;min-height:36px;padding:6px 0;transition:opacity 0.15s ease;}
.lft-item-inner:hover{opacity:0.92;box-shadow:0 0 0 2px rgba(0,0,0,0.18);}
/* Currently-selected row indicator (qa.md row-selection-indicator).
   2px ring + faint glow on the colored pill. Matches the hover treatment
   shape so the visual language stays consistent. */
.lft-row-selected .lft-item-inner{box-shadow:0 0 0 2px #111827, 0 2px 8px rgba(0,0,0,0.25);}
.lft-dark .lft-row-selected .lft-item-inner{box-shadow:0 0 0 2px #F3F3F1, 0 2px 8px rgba(0,0,0,0.45);}
/* 8px left padding matches LegendRows .lrg-name so tab-4 names sit at the
   same indent as tabs 1-3 (qa.md user feedback 2026-04-27). */
.lft-name{padding:0 0 0 8px;font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.lft-row-child .lft-name{padding-left:18px;font-weight:600;}
.lft-badge{display:flex;align-items:center;justify-content:center;}
.lft-badge-inner{display:inline-flex;align-items:center;justify-content:center;gap:4px;background:rgba(255,255,255,0.22);border-radius:6px;padding:1px 6px;font-size:10px;font-weight:700;font-family:'Courier New',monospace;white-space:nowrap;min-width:30px;text-align:center;}
.lft-cluster-icon{display:inline-block;width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px currentColor;opacity:0.85;}
/* Light mode: caret stays dark (column 1 is the white card background, not the pill) */
.lft-light .lft-name{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.35);}
.lft-light .lft-badge-inner{color:#fff;}
.lft-light .lft-caret{color:#374151;}
.lft-light .lft-caret:hover{color:#111;}
/* Dark mode */
.lft-dark .lft-name{color:#F3F3F1;text-shadow:0 1px 2px rgba(0,0,0,0.4);}
.lft-dark .lft-badge-inner{color:#F3F3F1;}
.lft-dark .lft-caret{color:rgba(243,243,241,0.85);}
.lft-dark .lft-title{color:#F3F3F1;}
.lft-dark .lft-header-col{color:rgba(243,243,241,0.65);}
`, 'legend-family-tree')
</script>

<template>
  <div :class="['legend-family-tree', isDark ? 'lft-dark' : 'lft-light']">
    <!-- Optional content slot before the table — e.g. cluster controls, search -->
    <slot name="before-rows" />

    <div class="lft-items">
      <!-- Title row (subgrid first row — same chrome as LegendRows).
           Slot 'title-caret' lets the parent (LegendDesktop) inject the card-
           level collapse caret into col 1 of this row, so the lang-fam tab can
           collapse just like all other tabs. -->
      <div class="lft-title-row">
        <span class="lft-title-caret-slot">
          <slot name="title-caret" />
        </span>
        <span class="lft-title">{{ title }}</span>
        <span v-for="col in columns" :key="col.key" class="lft-header-col">{{ col.label }}</span>
      </div>

      <template v-for="row in rows" :key="row.key">
        <!-- Family row (or cluster row if row.kind === 'cluster') -->
        <div class="lft-row" :class="{ 'lft-row-selected': row.label === selectedFamilyKey }">
          <!-- Carat: only present for family rows that have languages.
               Cluster rows are LEAVES from the legend's POV — no carat. -->
          <button
            v-if="row.kind === 'family'"
            class="lft-caret"
            :class="{ expanded: isExpanded(row.key) }"
            @click="(e) => handleCaretClick(row.key, e)"
            :aria-label="isExpanded(row.key) ? 'Collapse family' : 'Expand family'"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <div
            class="lft-item"
            @click="handleRowClick(row)"
          >
            <div class="lft-item-inner" :style="{ backgroundColor: row.color, '--lft-item-color': row.color }">
              <span class="lft-name">{{ row.label }}</span>
              <span v-for="col in columns" :key="col.key" class="lft-badge">
                <span class="lft-badge-inner">
                  <!-- Cluster-ready: paint the cluster icon next to the count
                       column when this row is a cluster row. -->
                  <span v-if="row.kind === 'cluster' && col.key === 'count'" class="lft-cluster-icon" />
                  {{ col.key === 'population' ? fmtPop(row.population) : fmtCount(row.peopleGroupCount) }}
                </span>
              </span>
            </div>
          </div>
        </div>

        <!-- Children: only families can have children. Cluster rows are leaves. -->
        <template v-if="row.kind === 'family' && isExpanded(row.key)">
          <div
            v-for="child in childRowsFor(row.key)"
            :key="child.key"
            class="lft-row lft-row-child"
            :class="{ 'lft-row-selected': child.label === selectedLanguageKey }"
          >
            <div class="lft-item" @click="handleRowClick(child)">
              <div class="lft-item-inner" :style="{ backgroundColor: child.color, '--lft-item-color': child.color }">
                <span class="lft-name">{{ child.label }}</span>
                <span v-for="col in columns" :key="col.key" class="lft-badge">
                  <span class="lft-badge-inner">
                    <span v-if="child.kind === 'cluster' && col.key === 'count'" class="lft-cluster-icon" />
                    {{ col.key === 'population' ? fmtPop(child.population) : fmtCount(child.peopleGroupCount) }}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* All runtime styles injected via useShadowStyles for shadow DOM compatibility. */
</style>
