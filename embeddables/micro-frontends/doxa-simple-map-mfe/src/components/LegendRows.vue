<template>
  <div
    class="legend-row-group"
    :class="isDark ? 'lrg-dark' : 'lrg-light'"
  >
    <!-- ONE grid table. First column is an invisible caret column — it doubles
         as the card's left padding AND as the rendering column for every
         row-level caret (title caret via #title-caret slot, child-expand
         carets on tree rows). A matching trailing column on the right of
         the same width provides symmetric right padding without the card
         needing its own left/right padding. See docs/legend-spec.md. -->
    <div class="lrg-items" :style="{ '--lrg-grid-cols': gridCols }">

      <!-- Title row — first row of the table. Caret slot in col 1, title in
           col 2, column headers auto-placed into remaining tracks. -->
      <div v-if="!hideColumnHeader && (title || columns.length)" class="lrg-title-row">
        <span class="lrg-title-caret-slot"><slot name="title-caret" /></span>
        <span class="lrg-title">{{ title }}</span>
        <span v-for="col in columns" :key="col.key" class="lrg-header-col">{{ col.label }}</span>
      </div>

      <!-- Data rows — colored pills, clickable. The .lrg-item / .lrg-item-inner
           wrappers are present for LegendMobile.vue CSS compatibility; on
           desktop they are display:contents so the subgrid is flat. -->
      <template v-for="item in items" :key="item.key">
        <div class="lrg-row">
          <button
            v-if="item.children && item.children.length && !disableCollapse"
            class="lrg-caret"
            :class="{ expanded: !collapsed[item.key] }"
            @click.stop="toggleCollapse(item.key)"
            aria-label="Toggle children"
          >
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <!-- Empty col-1 placeholder keeps subgrid flat for non-tree rows. -->
          <span v-else class="lrg-caret-placeholder" aria-hidden="true"></span>

          <div
            class="lrg-item"
            :class="{ selected: activeFilter === item.filterKey }"
            @click="$emit('filter-click', item.filterKey)"
          >
            <div class="lrg-item-inner" :style="{ backgroundColor: item.color, '--lrg-item-color': item.color }">
              <span class="lrg-name">{{ item.label }}</span>
              <span v-for="col in columns" :key="col.key" class="lrg-badge">
                <span class="lrg-badge-inner">
                  {{ col.key === 'population' ? fmtPop(item.population) : fmtCount(item.count) }}
                </span>
              </span>
            </div>
          </div>
        </div>

        <!-- Children rows -->
        <template v-if="item.children && item.children.length && !collapsed[item.key]">
          <div v-for="child in item.children" :key="child.key" class="lrg-row lrg-row-child">
            <span class="lrg-caret-placeholder" aria-hidden="true"></span>
            <div
              class="lrg-item"
              :class="{ selected: activeFilter === child.filterKey }"
              @click="$emit('filter-click', child.filterKey)"
            >
              <div class="lrg-item-inner" :style="{ backgroundColor: child.color, '--lrg-item-color': child.color }">
                <span class="lrg-name">{{ child.label }}</span>
                <span v-for="col in columns" :key="col.key" class="lrg-badge">
                  <span class="lrg-badge-inner">
                    {{ col.key === 'population' ? fmtPop(child.population) : fmtCount(child.count) }}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </template>
      </template>

      <!-- Footer totals (only when columns exist AND showFooter true).
           doxa-simple-map passes showFooter=false. -->
      <div v-if="columns.length && showFooter" class="lrg-footer">
        <span class="lrg-footer-caret-slot" aria-hidden="true"></span>
        <span class="lrg-footer-label">{{ t('legend.footer.total') }}</span>
        <span v-for="col in columns" :key="col.key" class="lrg-footer-value">
          {{ col.key === 'population' ? fmtPop(totalPopulation) : fmtCount(totalCount) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useShadowStyles } from '../composables/useShadowStyles.js'

const { t } = useI18n()

useShadowStyles(`
/* ── LegendRows — single flat grid with an invisible caret column.
   Spec: docs/legend-spec.md. One parent grid (.lrg-items) with subgrid
   children (.lrg-title-row, .lrg-row, .lrg-footer). Col 1 is the caret
   column (doubles as the legend's left padding); last col is a matching
   trailing track (right padding). Both are --lrg-caret-col wide so the
   legend is visually symmetric without any outer left/right padding. ── */
.legend-row-group{--lrg-caret-col:10px;display:flex;flex-direction:column;height:100%;min-height:0;}

/* The grid + scroll container. Tracks:
   [caret --lrg-caret-col] [name 1fr] [UPGS auto] [POPULATION auto] [trailing --lrg-caret-col].
   Title row + every data row is a subgrid of these tracks.
   align-content:start — CRITICAL: without this, grid auto-rows STRETCH to
   fill flex:1 parent. Packing rows to the top keeps them at natural height. */
.lrg-items{display:grid;grid-template-columns:var(--lrg-grid-cols, var(--lrg-caret-col) minmax(80px,1fr) auto auto var(--lrg-caret-col));grid-auto-rows:auto;align-content:start;column-gap:6px;row-gap:6px;padding:12px 0;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;-ms-overflow-style:none;}
.lrg-items::-webkit-scrollbar{display:none;width:0;height:0;}

/* Title row — first row of the table. Plain (not colored). Shares tracks.
   Col 1 = title caret slot, col 2 = title text, cols 3+ = column headers. */
.lrg-title-row{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;align-items:center;padding:4px 0;}
.lrg-title-caret-slot{grid-column:1;display:flex;align-items:center;justify-content:center;}
.lrg-title{grid-column:2;font-weight:600;font-size:13px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.lrg-header-col{text-align:center;white-space:nowrap;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.3px;font-weight:700;}

/* Data row — subgrid of .lrg-items. Caret lives in col 1 (real grid cell,
   not absolute); the pill spans cols 2 to -2 so the trailing column stays
   empty as right padding. */
.lrg-row{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;align-items:center;}
.lrg-row-child{margin-left:0;}

/* .lrg-item and .lrg-item-inner are layout-transparent on desktop so the
   subgrid stays flat. LegendMobile.vue overrides these at higher specificity
   so mobile keeps its own block layout. */
.lrg-item{display:contents;cursor:pointer;}
.lrg-item-inner{display:grid;grid-template-columns:subgrid;grid-column:2 / -2;align-items:center;border-radius:6px;min-height:36px;padding:6px 0;transition:opacity 0.15s ease;}
.lrg-item-inner:hover{opacity:0.92;}
.lrg-item.selected .lrg-item-inner{outline:2px solid rgba(0,0,0,0.25);outline-offset:-2px;}

/* Caret — real grid cell in col 1, centered. Zero padding per spec: the
   column width IS the padding, the caret just sits in the middle of it. */
.lrg-caret{grid-column:1;justify-self:center;align-self:center;width:10px;height:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;background:none;border:none;padding:0;transition:transform 0.2s ease;outline:none;-webkit-tap-highlight-color:transparent;opacity:0.85;}
.lrg-caret:focus{outline:none;}
.lrg-caret.expanded{transform:rotate(90deg);}

/* Empty col-1 slot on non-tree rows — keeps subgrid flat without rendering
   anything visible. */
.lrg-caret-placeholder{grid-column:1;display:block;}

/* Name — first pill column (col 2 of parent grid, col 1 of the subgrid). */
.lrg-name{grid-column:1;padding:0 0 0 8px;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

/* Badges — auto-placed into the remaining subgrid tracks. Centered in track. */
.lrg-badge{display:flex;align-items:center;justify-content:center;}
.lrg-badge-inner{display:inline-block;background:color-mix(in srgb, var(--lrg-item-color, #888), currentColor 22%);border-radius:8px;padding:2px 10px;font-size:11px;font-weight:600;font-family:'Courier New',monospace;white-space:nowrap;min-width:32px;text-align:center;}

/* Footer — col 1 empty (matches caret column), col 2 label, trailing values. */
.lrg-footer{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;align-items:center;padding:5px 0;border-top:1px solid rgba(0,0,0,0.07);font-size:11px;font-weight:600;color:#555;background:#fff;position:sticky;bottom:0;}
.lrg-footer-caret-slot{grid-column:1;}
.lrg-footer-label{grid-column:2;color:#777;}
.lrg-footer-value{text-align:center;font-family:'Courier New',monospace;}

/* ── Light mode ── text over colored pills is white */
.lrg-light .lrg-name{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.35);}
.lrg-light .lrg-badge-inner{color:#fff;}
.lrg-light .lrg-caret{color:#666;}

/* ── Dark mode ── */
.lrg-dark .lrg-name{color:#F3F3F1;text-shadow:0 1px 2px rgba(0,0,0,0.4);}
.lrg-dark .lrg-badge-inner{color:#F3F3F1;}
.lrg-dark .lrg-caret{color:rgba(243,243,241,0.75);}
.lrg-dark .lrg-title{color:#F3F3F1;}
.lrg-dark .lrg-header-col{color:rgba(243,243,241,0.65);}
.lrg-dark .lrg-footer{background:#2a332a;border-top-color:rgba(255,255,255,0.1);color:rgba(243,243,241,0.75);}
.lrg-dark .lrg-footer-label{color:rgba(243,243,241,0.65);}
`, 'legend-row-group')

const props = defineProps({
  /** Table title — rendered as the name-column text of the first (header) row */
  title:             { type: String,  default: '' },
  /** Array of LegendItem: { key, label, color, count?, population?, filterKey?, children?: [] } */
  items:             { type: Array,   required: true },
  /** Column definitions: [{ key: 'count'|'population', label, width }] */
  columns:           { type: Array,   default: () => [] },
  /** Currently active filter key (highlighted row) */
  activeFilter:      { type: String,  default: null },
  /** Dark mode flag */
  isDark:            { type: Boolean, default: false },
  /** Hide the built-in header row (parent renders its own title outside LegendRows) */
  hideColumnHeader:  { type: Boolean, default: false },
  /** Show totals footer */
  showFooter:        { type: Boolean, default: false },
  totalCount:        { type: Number,  default: 0 },
  totalPopulation:   { type: Number,  default: 0 },
  fmtPop:            { type: Function, default: v => String(v || 0) },
  fmtCount:          { type: Function, default: v => String(v || 0) },
  /** Disable collapse/expand carets for tree items */
  disableCollapse:   { type: Boolean, default: false }
})

defineEmits(['filter-click'])

const collapsed = reactive({})
function toggleCollapse(key) {
  collapsed[key] = !collapsed[key]
}

/**
 * Dynamic grid-template-columns string driven by the `columns` prop.
 * Shape: `[caret --lrg-caret-col] [name minmax(80px,1fr)] [badge auto × N] [trailing --lrg-caret-col]`.
 * The caret column doubles as the legend's left padding AND the rendering
 * track for every caret (title, row, child, footer). The trailing track
 * mirrors its width so left/right visual padding is symmetric.
 */
const gridCols = computed(() => {
  const badgeTracks = props.columns.map(() => 'auto').join(' ')
  return `var(--lrg-caret-col) minmax(80px, 1fr) ${badgeTracks} var(--lrg-caret-col)`
})
</script>

<style scoped>
/* All styles injected via useShadowStyles for shadow DOM compatibility. */
</style>
