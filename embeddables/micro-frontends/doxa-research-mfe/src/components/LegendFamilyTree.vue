<script setup>
/**
 * LegendFamilyTree — language-family table with legend tabs + carat expand/collapse.
 *
 * TABS (above CSS table)
 *   Three tabs: Language Families / Languages / Dialects (labels via tabLabels prop).
 *   Tab 1 (family):   family rows with caret to expand child language rows.
 *   Tab 2 (language): flat list of all languages across all families.
 *   Tab 3 (dialect):  dialect rows (empty until imb_language_class is populated).
 *   Each tab stores its own independent selection in mapStore.
 *   Switching tabs restores the previously selected row for that tab (QA R4 A4).
 *
 * SELECTION UX
 *   - Selected row: full opacity + 2px ring.
 *   - Non-selected rows: 30% opacity (QA R2 A1).
 *   - Inline X button inside selected pill deselects on click (QA R2 A3, R4 A3).
 *
 * EVENTS
 *   Emits `highlight` on parent channel AND dispatches `legend:highlight` window
 *   event (cross-shadow-DOM). Both carry the same payload.
 */
import { defineProps, defineEmits, computed, inject } from 'vue'
import { useShadowStyles } from '@/composables/useShadowStyles.js'
import { useLanguageFamilyLegendData } from '../composables/useLanguageFamilyLegendData.js'

const mapStore = inject('mapStore', null)
const selectedFamilyKey   = computed(() => mapStore?.selectedFamily   || null)
const selectedLanguageKey = computed(() => mapStore?.selectedLanguage || null)
const selectedDialectKey  = computed(() => mapStore?.selectedDialect?.key || null)
// When a dialect is selected, its parent language row key (e.g. "Afro-Asiatic__Arabic") stays visible.
const selectedDialectParentKey = computed(() => {
  const dk = mapStore?.selectedDialect?.key
  if (!dk) return null
  const lastSep = dk.lastIndexOf('__')
  return lastSep > 0 ? dk.slice(0, lastSep) : null
})

const props = defineProps({
  /** Ref<NormalizedPeopleGroup[]> — passed by parent. */
  peopleGroups: { type: Array, required: true },
  /** Active language-family aggregation method. Reserved for future use. */
  aggregator:   { type: String, default: 'auto' },
  /** Title rendered as the first row of the subgrid (parent supplies localized string). */
  title:        { type: String, default: 'Language Families' },
  /** Column labels — keep in sync with LegendRows. */
  columns:      {
    type: Array,
    default: () => ([
      { key: 'count',      label: 'UPGS',       width: 48 },
      { key: 'population', label: 'POPULATION', width: 48 }
    ])
  },
  /** Dark mode flag */
  isDark:    { type: Boolean, default: false },
  fmtPop:    { type: Function, default: v => String(v || 0) },
  fmtCount:  { type: Function, default: v => String(v || 0) },
  /**
   * Tab descriptors — generic so future maps can pass their own layer names.
   * Shape: [{ id: string, label: string }]
   */
  tabLabels: {
    type: Array,
    default: () => [
      { id: 'family',   label: 'Language Families' },
      { id: 'language', label: 'Languages'         },
      { id: 'dialect',  label: 'Dialects/Varieties' }
    ]
  }
})

const emit = defineEmits(['highlight'])

const peopleGroupsRef = { get value() { return props.peopleGroups } }

const { rows, languageRows, dialectRows, toggle, isExpanded, childRowsFor, dialectRowsFor, highlight } =
  useLanguageFamilyLegendData(peopleGroupsRef, { aggregator: props.aggregator })

// ── Legend tabs ───────────────────────────────────────────────────────────────
const activeLegendTab = computed({
  get: () => mapStore?.activeLegendTab || 'family',
  set: (v)  => mapStore?.setActiveLegendTab?.(v)
})

function switchLegendTab(tabId) {
  if (mapStore?.setActiveLegendTab) mapStore.setActiveLegendTab(tabId)
  else activeLegendTab.value = tabId  // fallback if store not injected
}

// ── Computed title (R8 addendum: surface parent of the currently selected child) ──
// Default: title prop ("Language Families") on family tab; tab-derived label on others.
// When a child is selected, replace the title with "Parent: <parent-label>" so the
// user can see where the selection sits in the hierarchy without leaving the tab.
const computedTitle = computed(() => {
  // Dialect selected → parent = the language ("Arabic")
  if (selectedDialectKey.value) {
    const dk = selectedDialectKey.value
    const lastSep = dk.lastIndexOf('__')
    if (lastSep > 0) {
      const langPath = dk.slice(0, lastSep)
      const langSep = langPath.indexOf('__')
      const langLabel = langSep > 0 ? langPath.slice(langSep + 2) : langPath
      return 'Parent: ' + langLabel
    }
  }
  // Language selected → parent = the family. Look it up via languageRows.
  if (selectedLanguageKey.value) {
    const langRow = languageRows.value.find(r => r.label === selectedLanguageKey.value)
    if (langRow?.familyKey) return 'Parent: ' + langRow.familyKey
  }
  // No child selection — use tab-derived label (Tab 1 = title prop, Tab 2/3 = layer name).
  if (activeLegendTab.value === 'language') return 'Languages'
  if (activeLegendTab.value === 'dialect')  return 'Dialects/Varieties'
  return props.title
})

// ── Selection + dimming state ─────────────────────────────────────────────────
// hasSelection drives .lft-has-selection which dims non-selected rows at 30%.
const hasSelection = computed(() => {
  if (activeLegendTab.value === 'family')   return !!(selectedFamilyKey.value || selectedLanguageKey.value || selectedDialectKey.value)
  if (activeLegendTab.value === 'language') return !!(selectedLanguageKey.value || selectedDialectKey.value)
  if (activeLegendTab.value === 'dialect')  return !!selectedDialectKey.value
  return false
})

// ── Row click handlers ────────────────────────────────────────────────────────
function handleRowClick(row) {
  highlight(row)
  emit('highlight', row)
}

function handleCaretClick(familyKey, evt) {
  evt.stopPropagation()
  toggle(familyKey)
}

// X deselect: clear the matching mapStore field.
// research-map.vue watchers call clearAllHighlights when the field goes null.
function deselectRow(row, evt) {
  evt.stopPropagation()
  if (row.kind === 'family') {
    mapStore?.selectFamily?.(null)
  } else if (row.kind === 'dialect') {
    mapStore?.selectDialect?.(null)
  } else {
    mapStore?.selectLanguage?.(null)
  }
}

// ── Shadow-DOM styles ─────────────────────────────────────────────────────────
defineExpose({ switchLegendTab })

useShadowStyles(`
/* ── Outer wrapper ── */
.legend-family-tree{--lft-caret-col:10px;display:flex;flex-direction:column;height:100%;min-height:0;}

/* ── Tab bar — lives above the CSS table. Compact pill tabs. ── */
.lft-tab-bar{display:flex;gap:2px;padding:8px 10px 4px;flex-shrink:0;}
.lft-tab-btn{flex:1;background:none;border:none;padding:4px 6px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;color:#6b7280;white-space:nowrap;transition:background 0.12s,color 0.12s;outline:none;-webkit-tap-highlight-color:transparent;}
.lft-tab-btn:hover{background:rgba(0,0,0,0.06);color:#374151;}
.lft-tab-btn.lft-tab-active{background:rgba(0,0,0,0.10);color:#111827;}
.lft-dark .lft-tab-btn{color:rgba(243,243,241,0.6);}
.lft-dark .lft-tab-btn:hover{background:rgba(255,255,255,0.08);color:#F3F3F1;}
.lft-dark .lft-tab-btn.lft-tab-active{background:rgba(255,255,255,0.14);color:#F3F3F1;}
/* Hide tab bar when the legend card is collapsed */
.legend-container.collapsed .lft-tab-bar{display:none!important;}

/* ── Grid table (identical to previous) ── */
.lft-items{display:grid;grid-template-columns:var(--lft-caret-col) minmax(80px,1fr) auto auto var(--lft-caret-col);grid-auto-rows:auto;align-content:start;column-gap:6px;row-gap:6px;padding:0 0 12px;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;-ms-overflow-style:none;}
.lft-items::-webkit-scrollbar{display:none;width:0;height:0;}
.lft-title-row{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;align-items:center;padding:12px 0 6px;position:sticky;top:0;z-index:5;background:#fff;}
.lft-dark .lft-title-row{background:#3b463d;}
.lft-title-caret-slot{grid-column:1;justify-self:center;align-self:center;display:flex;align-items:center;justify-content:center;line-height:1;}
.lft-title{grid-column:2;align-self:center;padding:0 8px;font-weight:600;font-size:13px;line-height:1.2;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.lft-header-col{align-self:center;text-align:center;white-space:nowrap;font-size:10px;line-height:1.3;color:#888;text-transform:uppercase;letter-spacing:0.3px;font-weight:700;}
.lft-row{display:grid;grid-template-columns:subgrid;grid-column:1 / -1;align-items:center;min-height:36px;}
.lft-row-child{margin-left:0;}
.lft-row-dialect{margin-left:0;}
/* Per-generation indent for nested rows (CSS table cells ignore padding,
   so the indent goes on .lft-name inside the inner pill).
   Gen 1 (family/language at root): 8px (.lft-name baseline below)
   Gen 2 (language under family / dialect under language in tab 2): 24px (.lft-row-child .lft-name)
   Gen 3 (dialect under language under family — tab 1 grandchildren): 40px (.lft-name-dialect) */
.lft-name-dialect{padding-left:40px;font-weight:500;font-size:11px;font-style:italic;}
/* Vertical hierarchy guide-line on child rows */
.lft-row-child .lft-item-inner::before,
.lft-row-dialect .lft-item-inner::before{content:'';position:absolute;left:8px;top:8px;bottom:8px;width:2px;border-radius:2px;background:rgba(255,255,255,0.45);pointer-events:none;}
.lft-dark .lft-row-child .lft-item-inner::before,
.lft-dark .lft-row-dialect .lft-item-inner::before{background:rgba(243,243,241,0.30);}
.lft-row-dialect .lft-item-inner::before{left:24px;}
.lft-caret-indent{margin-left:10px;}
.lft-caret{grid-column:1;justify-self:center;align-self:center;width:14px;height:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#374151;background:transparent;border:none;padding:0;transition:transform 0.2s ease;outline:none;-webkit-tap-highlight-color:transparent;}
.lft-caret:hover{background:rgba(0,0,0,0.06);border-radius:3px;color:#111;}
.lft-caret:focus{outline:none;}
.lft-caret.expanded{transform:rotate(90deg);}
.lft-caret-spacer{grid-column:1;width:14px;}

/* ── Pill row — clickable. position:relative to anchor the absolute X button. ── */
.lft-item{display:contents;cursor:pointer;}
.lft-item-inner{display:grid;grid-template-columns:subgrid;grid-column:2 / -2;align-items:center;border-radius:6px;min-height:36px;padding:6px 0;transition:opacity 0.15s ease;position:relative;}
.lft-item-inner:hover{opacity:0.92;box-shadow:0 0 0 2px rgba(0,0,0,0.18);}

/* ── Selected row: strong 2px ring + mild glow ── */
.lft-row-selected .lft-item-inner{box-shadow:0 0 0 2px #111827, 0 2px 8px rgba(0,0,0,0.25);}
.lft-dark .lft-row-selected .lft-item-inner{box-shadow:0 0 0 2px #F3F3F1, 0 2px 8px rgba(0,0,0,0.45);}

/* ── Row dimming: when any selection is active, dim non-selected rows to 30% ── */
.lft-has-selection .lft-row:not(.lft-row-selected) .lft-item-inner{opacity:0.3;}
.lft-has-selection .lft-row:not(.lft-row-selected) .lft-item-inner:hover{opacity:0.55;}
/* ── Child-active: dialect children of selected language stay fully visible ── */
.lft-has-selection .lft-row.lft-row-child-active:not(.lft-row-selected) .lft-item-inner{opacity:1!important;}
.lft-has-selection .lft-row.lft-row-child-active:not(.lft-row-selected) .lft-item-inner:hover{opacity:0.92!important;}

/* ── Inline X deselect button — chip pattern (Google Filters / MUI chips).
   Absolute-positioned at the far right of the pill. Only visible on selected
   rows. position:relative on .lft-item-inner anchors it without breaking the
   subgrid. The pill spans grid columns 2 to -2; the right caret column (-1)
   is empty, so right:-22px tucks the X into that gap and never overlaps the
   population badge. ── */
.lft-deselect-btn{display:none;position:absolute;right:-22px;top:50%;transform:translateY(-50%);width:16px;height:16px;background:rgba(0,0,0,0.55);border:none;border-radius:50%;padding:0;cursor:pointer;align-items:center;justify-content:center;color:#fff;transition:background 0.12s;outline:none;-webkit-tap-highlight-color:transparent;z-index:2;box-shadow:0 1px 3px rgba(0,0,0,0.35);}
.lft-row-selected .lft-deselect-btn{display:flex;}
.lft-deselect-btn:hover{background:rgba(0,0,0,0.78);}
.lft-dark .lft-deselect-btn{background:rgba(243,243,241,0.85);color:#1a1a2e;}
.lft-dark .lft-deselect-btn:hover{background:#F3F3F1;}

/* ── Name + badges ── */
.lft-name{padding:0 0 0 8px;font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.lft-row-child .lft-name{padding-left:24px;font-weight:600;}
.lft-badge{display:flex;align-items:center;justify-content:center;}
.lft-badge-inner{display:inline-flex;align-items:center;justify-content:gap:4px;background:rgba(255,255,255,0.22);border-radius:6px;padding:1px 6px;font-size:10px;font-weight:700;font-family:'Courier New',monospace;white-space:nowrap;min-width:30px;text-align:center;}
.lft-cluster-icon{display:inline-block;width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px currentColor;opacity:0.85;}

/* ── Light/dark text on pills ── */
.lft-light .lft-name{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.35);}
.lft-light .lft-badge-inner{color:#fff;}
.lft-light .lft-caret{color:#374151;}
.lft-light .lft-caret:hover{color:#111;}
.lft-dark .lft-name{color:#F3F3F1;text-shadow:0 1px 2px rgba(0,0,0,0.4);}
.lft-dark .lft-badge-inner{color:#F3F3F1;}
.lft-dark .lft-caret{color:rgba(243,243,241,0.85);}
.lft-dark .lft-title{color:#F3F3F1;}
.lft-dark .lft-header-col{color:rgba(243,243,241,0.65);}

/* ── Dialect tab: empty-state message ── */
.lft-empty{grid-column:1 / -1;padding:16px 12px;font-size:12px;color:#9ca3af;text-align:center;}
.lft-dark .lft-empty{color:rgba(243,243,241,0.45);}
`, 'legend-family-tree')
</script>

<template>
  <div :class="['legend-family-tree', isDark ? 'lft-dark' : 'lft-light', { 'lft-has-selection': hasSelection }]">

    <!-- ── Tab bar (above the CSS table). Tab definitions live in the toolbar
         HelpButton, not inline ⓘ icons — keeps the legend uncluttered for the
         eventual mobile rewrite. ── -->
    <div class="lft-tab-bar">
      <button
        v-for="tab in tabLabels"
        :key="tab.id"
        class="lft-tab-btn"
        :class="{ 'lft-tab-active': activeLegendTab === tab.id }"
        @click="switchLegendTab(tab.id)"
      >{{ tab.label }}</button>
    </div>

    <!-- Optional content slot before the table rows -->
    <slot name="before-rows" />

    <div class="lft-items">
      <!-- Title row with sticky header and column labels -->
      <div class="lft-title-row">
        <span class="lft-title-caret-slot">
          <slot name="title-caret" />
        </span>
        <span class="lft-title">{{ computedTitle }}</span>
        <span v-for="col in columns" :key="col.key" class="lft-header-col">{{ col.label }}</span>
      </div>

      <!-- ── TAB 1: Language Family rows ── -->
      <template v-if="activeLegendTab === 'family'">
        <template v-for="row in rows" :key="row.key">
          <div class="lft-row" :class="{ 'lft-row-selected': row.label === selectedFamilyKey }">
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
            <div class="lft-item" @click="handleRowClick(row)">
              <div class="lft-item-inner" :style="{ backgroundColor: row.color }">
                <span class="lft-name">{{ row.label }}</span>
                <span v-for="col in columns" :key="col.key" class="lft-badge">
                  <span class="lft-badge-inner">
                    <span v-if="row.kind === 'cluster' && col.key === 'count'" class="lft-cluster-icon" />
                    {{ col.key === 'population' ? fmtPop(row.population) : fmtCount(row.peopleGroupCount) }}
                  </span>
                </span>
                <button
                  v-if="row.label === selectedFamilyKey"
                  class="lft-deselect-btn"
                  @click="(e) => deselectRow(row, e)"
                  aria-label="Clear selection"
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Child language rows (expanded family) -->
          <template v-if="row.kind === 'family' && isExpanded(row.key)">
            <template v-for="child in childRowsFor(row.key)" :key="child.key">
              <div
                class="lft-row lft-row-child"
                :class="{ 'lft-row-selected': child.label === selectedLanguageKey }"
              >
                <button
                  v-if="child.hasDialects"
                  class="lft-caret lft-caret-indent"
                  :class="{ expanded: isExpanded(child.key) }"
                  @click="(e) => handleCaretClick(child.key, e)"
                  :aria-label="isExpanded(child.key) ? 'Collapse dialects' : 'Expand dialects'"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <span v-else class="lft-caret-spacer" />
                <div class="lft-item" @click="handleRowClick(child)">
                  <div class="lft-item-inner" :style="{ backgroundColor: child.color }">
                    <span class="lft-name">{{ child.label }}</span>
                    <span v-for="col in columns" :key="col.key" class="lft-badge">
                      <span class="lft-badge-inner">
                        <span v-if="child.kind === 'cluster' && col.key === 'count'" class="lft-cluster-icon" />
                        {{ col.key === 'population' ? fmtPop(child.population) : fmtCount(child.peopleGroupCount) }}
                      </span>
                    </span>
                    <button
                      v-if="child.label === selectedLanguageKey"
                      class="lft-deselect-btn"
                      @click="(e) => deselectRow(child, e)"
                      aria-label="Clear selection"
                    >
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <!-- Dialect grandchildren under language child -->
              <template v-if="child.hasDialects && isExpanded(child.key)">
                <div
                  v-for="dialect in dialectRowsFor(child.key)"
                  :key="dialect.key"
                  class="lft-row lft-row-dialect"
                  :class="{
                    'lft-row-child-active': child.label === selectedLanguageKey,
                    'lft-row-selected': dialect.key === selectedDialectKey
                  }"
                >
                  <div class="lft-item" @click="handleRowClick(dialect)">
                    <div class="lft-item-inner" :style="{ backgroundColor: dialect.color }">
                      <span class="lft-name lft-name-dialect">{{ dialect.label }}</span>
                      <span v-for="col in columns" :key="col.key" class="lft-badge">
                        <span class="lft-badge-inner">
                          {{ col.key === 'population' ? fmtPop(dialect.population) : fmtCount(dialect.peopleGroupCount) }}
                        </span>
                      </span>
                      <button
                        v-if="dialect.key === selectedDialectKey"
                        class="lft-deselect-btn"
                        @click="(e) => deselectRow(dialect, e)"
                        aria-label="Clear selection"
                      >
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                          <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </template>
            </template>
          </template>
        </template>
      </template>

      <!-- ── TAB 2: Language rows (deduplicated by base) with dialect caret ── -->
      <template v-else-if="activeLegendTab === 'language'">
        <template v-for="row in languageRows" :key="row.key">
          <div
            class="lft-row"
            :class="{
              'lft-row-selected': row.label === selectedLanguageKey,
              'lft-row-child-active': row.key === selectedDialectParentKey
            }"
          >
            <button
              v-if="row.hasDialects"
              class="lft-caret"
              :class="{ expanded: isExpanded(row.key) }"
              @click="(e) => handleCaretClick(row.key, e)"
              :aria-label="isExpanded(row.key) ? 'Collapse dialects' : 'Expand dialects'"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <span v-else class="lft-caret-spacer" />
            <div class="lft-item" @click="handleRowClick(row)">
              <div class="lft-item-inner" :style="{ backgroundColor: row.color }">
                <span class="lft-name">{{ row.label }}</span>
                <span v-for="col in columns" :key="col.key" class="lft-badge">
                  <span class="lft-badge-inner">
                    {{ col.key === 'population' ? fmtPop(row.population) : fmtCount(row.peopleGroupCount) }}
                  </span>
                </span>
                <button
                  v-if="row.label === selectedLanguageKey"
                  class="lft-deselect-btn"
                  @click="(e) => deselectRow(row, e)"
                  aria-label="Clear selection"
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <!-- Dialect children under language row -->
          <template v-if="row.hasDialects && isExpanded(row.key)">
            <div
              v-for="dialect in dialectRowsFor(row.key)"
              :key="dialect.key"
              class="lft-row lft-row-dialect"
              :class="{
                'lft-row-child-active': row.label === selectedLanguageKey,
                'lft-row-selected': dialect.key === selectedDialectKey
              }"
            >
              <div class="lft-item" @click="handleRowClick(dialect)">
                <div class="lft-item-inner" :style="{ backgroundColor: dialect.color }">
                  <span class="lft-name lft-name-dialect">{{ dialect.label }}</span>
                  <span v-for="col in columns" :key="col.key" class="lft-badge">
                    <span class="lft-badge-inner">
                      {{ col.key === 'population' ? fmtPop(dialect.population) : fmtCount(dialect.peopleGroupCount) }}
                    </span>
                  </span>
                  <button
                    v-if="dialect.key === selectedDialectKey"
                    class="lft-deselect-btn"
                    @click="(e) => deselectRow(dialect, e)"
                    aria-label="Clear selection"
                  >
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </template>
        </template>
      </template>

      <!-- ── TAB 3: Flat dialect rows parsed from language field ── -->
      <template v-else-if="activeLegendTab === 'dialect'">
        <template v-if="dialectRows.length">
          <div
            v-for="row in dialectRows"
            :key="row.key"
            class="lft-row lft-row-dialect"
            :class="{ 'lft-row-selected': row.key === selectedDialectKey }"
          >
            <span class="lft-caret-spacer" />
            <div class="lft-item" @click="handleRowClick(row)">
              <div class="lft-item-inner" :style="{ backgroundColor: row.color }">
                <span class="lft-name lft-name-dialect">{{ row.label }}</span>
                <span v-for="col in columns" :key="col.key" class="lft-badge">
                  <span class="lft-badge-inner">
                    {{ col.key === 'population' ? fmtPop(row.population) : fmtCount(row.peopleGroupCount) }}
                  </span>
                </span>
                <button
                  v-if="row.key === selectedDialectKey"
                  class="lft-deselect-btn"
                  @click="(e) => deselectRow(row, e)"
                  aria-label="Clear selection"
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="lft-empty">No dialect data available.</div>
      </template>

    </div>
  </div>
</template>

<style scoped>
/* All runtime styles injected via useShadowStyles for shadow DOM compatibility. */
</style>
