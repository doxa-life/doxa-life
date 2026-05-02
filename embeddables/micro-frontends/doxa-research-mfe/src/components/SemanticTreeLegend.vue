<script setup>
/**
 * SemanticTreeLegend — reusable hierarchical legend for any one-to-many semantic tree.
 *
 * Ported from /Map-Framework/05-apps/PPLR-MAPS/PPLR-validate-data-mfe/src/components/SemanticTreeLegend.vue
 * (851 lines), word-for-word per QA building-round-1 R4 decision. Adaptations:
 *
 *   - Outer .stl-panel wrapper REMOVED — our parent LegendDesktop owns the
 *     panel chrome and the circular-collapse-to-circle behavior the user wants
 *     to preserve. We render directly into the LegendDesktop's content slot.
 *   - .stl-collapse-btn REMOVED — the collapse caret is provided by LegendDesktop
 *     via the #title-caret slot (matches the existing LegendFamilyTree pattern).
 *   - .stl-reopen rounded-pill REMOVED for the same reason.
 *   - Internal panelOpen state removed — collapse is fully external.
 *   - <style scoped> replaced with useShadowStyles() because doxa-research-mfe
 *     renders inside a shadow root (Vue's scoped attribute selectors don't
 *     bridge the shadow boundary the way useShadowStyles does).
 *   - Tree node shape, traversal helpers, selection/sort/breadcrumb logic,
 *     hairline-trunks layout — all preserved.
 *
 * Tree node shape:
 *   { id, label, color?, count?, pop?, filter?, info?, children?: TreeNode[] }
 */
import { ref, computed, defineProps, defineEmits, watch } from 'vue'
import { useShadowStyles } from '@/composables/useShadowStyles.js'
import { useInstance } from '../composables/usePplrInstance.js'

const props = defineProps({
  nodes:   { type: Array,  default: () => [] },
  tabs:    { type: Array,  default: null },
  columns: { type: Array,  default: () => ['count', 'pop'] },
  title:   { type: String, default: 'Legend' },
})

const emit = defineEmits(['select'])

const instance = useInstance()

// ── Tree traversal ─────────────────────────────────────────────────────────────
function treeMaxDepth(nodes, d = 0) {
  if (!nodes?.length) return d
  return Math.max(...nodes.map(n => treeMaxDepth(n.children ?? [], d + 1)))
}
function collectAtDepth(nodes, target, curr = 0) {
  if (curr === target) return nodes.slice()
  return nodes.flatMap(n => collectAtDepth(n.children ?? [], target, curr + 1))
}
function findAncestorChain(nodes, targetId, chain = []) {
  for (const node of nodes) {
    if (node.id === targetId) return chain
    if (node.children?.length) {
      const found = findAncestorChain(node.children, targetId, [...chain, node])
      if (found) return found
    }
  }
  return null
}
function collectAllDescendantIds(node, out = new Set()) {
  if (!node?.children?.length) return out
  for (const c of node.children) {
    out.add(c.id)
    collectAllDescendantIds(c, out)
  }
  return out
}
// Resolve a sparse {id} payload to the full node in props.nodes — needed when
// instance.selection is set externally (geocoder bridge from research-map.vue
// passes id+label+depth only, no children). Without this, descendants dim.
function findNodeById(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children?.length) {
      const f = findNodeById(n.children, id)
      if (f) return f
    }
  }
  return null
}

// ── Derived ────────────────────────────────────────────────────────────────────
const treeDepth = computed(() => treeMaxDepth(props.nodes))

const tabList = computed(() => {
  const src = props.tabs ?? []
  const len = src.length || (treeDepth.value + 1)
  return Array.from({ length: len }, (_, i) =>
    src[i] ?? { id: `gen${i+1}`, label: `Generation ${i + 1}` }
  )
})

// ── State ─────────────────────────────────────────────────────────────────────
const localActiveTab = ref(0)
const expandedIds    = ref(new Set())
const localSelected  = ref(null)
const showInfoForTab = ref(null)
const sortBy         = ref(null)   // null = default (pop desc), 'count' | 'pop'
const sortDir        = ref('desc') // 'desc' | 'asc'

const activeTab = computed({
  get: () => instance ? instance.activeTab.value : localActiveTab.value,
  set: v => {
    if (instance) instance.activeTab.value = v
    else          localActiveTab.value = v
  },
})

const selectedNode = computed({
  get: () => instance ? instance.selection.value : localSelected.value,
  set: v => {
    if (instance) instance.selection.value = v
    else          localSelected.value = v
  },
})

const selectedId = computed(() => selectedNode.value?.id || null)

let _lastInternalId = null
if (instance) {
  // Auto-expand-ancestor-chain when an EXTERNAL writer (geocoder etc.) sets the
  // selection. _lastInternalId guards against re-entering when selectNode()
  // below updates instance.selection (the watcher would loop otherwise).
  watch(() => instance.selection.value, sel => {
    if (sel?.id === _lastInternalId) return
    if (!sel) { _lastInternalId = null; return }
    _lastInternalId = sel.id
    const chain = findAncestorChain(props.nodes, sel.id) || []
    if (typeof sel.depth === 'number') {
      activeTab.value = Math.min(sel.depth, tabList.value.length - 1)
    }
    const tabIdx = activeTab.value
    // Clear OTHER expansions; only expand the ancestor chain so the selection
    // is actually visible in the rows (per QA: don't leave Indo-European open
    // when user picked an Afro-Asiatic-equivalent result).
    const newExp = new Set()
    chain.slice(tabIdx).forEach(p => newExp.add(p.id))
    expandedIds.value = newExp
    emit('select', sel)
  })
}

// ── Sort ───────────────────────────────────────────────────────────────────────
function defaultSort(a, b) {
  const pd = (b.pop ?? 0) - (a.pop ?? 0)
  return pd !== 0 ? pd : (b.count ?? 0) - (a.count ?? 0)
}

const byActiveSort = computed(() => {
  if (!sortBy.value) return defaultSort
  const key = sortBy.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  return (a, b) => (((a[key] ?? 0) - (b[key] ?? 0)) * dir)
})

function clickSortHeader(key) {
  if (sortBy.value === key) {
    if (sortDir.value === 'desc') sortDir.value = 'asc'
    else { sortBy.value = null; sortDir.value = 'desc' }
  } else {
    sortBy.value = key
    sortDir.value = 'desc'
  }
}

// ── Visible rows ───────────────────────────────────────────────────────────────
const topNodesAll = computed(() =>
  [...collectAtDepth(props.nodes, activeTab.value)].sort(byActiveSort.value)
)
const topNodes = computed(() => {
  const limit = tabList.value[activeTab.value]?.topLimit
  return limit ? topNodesAll.value.slice(0, limit) : topNodesAll.value
})
const topNodesOverflow = computed(() => {
  const limit = tabList.value[activeTab.value]?.topLimit
  if (!limit) return 0
  return Math.max(0, topNodesAll.value.length - limit)
})

function buildRows(out, nodes, relDepth, parent) {
  for (const node of nodes) {
    out.push({ node, relDepth, parent })
    if (expandedIds.value.has(node.id) && node.children?.length) {
      buildRows(out, [...node.children].sort(byActiveSort.value), relDepth + 1, node)
    }
  }
}
const visibleRows = computed(() => {
  const out = []
  buildRows(out, topNodes.value, 0, null)
  // Sibling-aware hairline trunk segments per indent level. For each row R at
  // relDepth N, walk levels L = 0..N-1; each L gets a trunk class:
  //   pipe  = ancestor at level L still has more siblings later → vertical line
  //   tee   = THIS row's parent has a later sibling AND this is not last child
  //   elbow = THIS row is its parent's last child
  //   blank = ancestor's chain ended above
  for (let i = 0; i < out.length; i++) {
    const row = out[i]
    if (row.relDepth === 0) { row.trunks = []; continue }
    const segs = []
    for (let L = 0; L < row.relDepth; L++) {
      // Find the ancestor at level L of this row
      let ancestor = null
      let walkRow = row
      let levelsToWalk = row.relDepth - L
      while (levelsToWalk > 0 && walkRow.parent) {
        walkRow = { node: walkRow.parent, relDepth: walkRow.relDepth - 1, parent: null }
        const idxAbove = (() => {
          for (let k = i - 1; k >= 0; k--) {
            if (out[k].node.id === walkRow.node.id) return k
          }
          return -1
        })()
        if (idxAbove >= 0) walkRow.parent = out[idxAbove].parent
        levelsToWalk--
      }
      ancestor = walkRow.node
      let trunkContinues = false
      for (let j = i + 1; j < out.length; j++) {
        const next = out[j]
        if (next.relDepth < L) { trunkContinues = false; break }
        if (next.relDepth === L && next.parent && ancestor && next.parent.id === ancestor.id) {
          trunkContinues = true; break
        }
        if (next.relDepth === L && (!next.parent || (ancestor && next.parent.id !== ancestor.id))) {
          continue
        }
      }
      if (L === row.relDepth - 1) {
        let hasLaterSibling = false
        for (let j = i + 1; j < out.length; j++) {
          const next = out[j]
          if (next.relDepth < row.relDepth) break
          if (next.relDepth === row.relDepth && next.parent === row.parent) {
            hasLaterSibling = true; break
          }
        }
        segs.push(hasLaterSibling ? 'tee' : 'elbow')
      } else {
        segs.push(trunkContinues ? 'pipe' : 'blank')
      }
    }
    row.trunks = segs
  }
  return out
})

const hasSel   = computed(() => selectedId.value !== null)
const hasCount = computed(() => props.columns.includes('count'))
const hasPop   = computed(() => props.columns.includes('pop'))

// Descendants of the selected node — kept full-opacity so the user can drill in.
// Resolves the full node via id lookup when selection came from the bridge
// (which only sets {id, label, depth}; no children array).
const selectedDescendants = computed(() => {
  const sel = selectedNode.value
  if (!sel) return new Set()
  const fullNode = sel.children ? sel : (findNodeById(props.nodes, sel.id) || sel)
  return collectAllDescendantIds(fullNode)
})

// ── Parent breadcrumb (uses parent's TAB name, not generic "Parent:") ────────
const parentBreadcrumb = computed(() => {
  const sel = selectedNode.value
  if (!sel) return null
  const chain = findAncestorChain(props.nodes, sel.id)
  if (!chain || !chain.length) return null
  const parent = chain[chain.length - 1]
  const parentDepth = chain.length - 1
  const tabName = tabList.value[parentDepth]?.label || 'Parent'
  return { node: parent, tabName }
})

// ── Actions ────────────────────────────────────────────────────────────────────
function selectNode(node) {
  if (selectedId.value === node.id) {
    _lastInternalId = null
    selectedNode.value = null
    emit('select', null)
  } else {
    _lastInternalId = node.id
    selectedNode.value = node
    emit('select', node)
  }
}
function toggleExpand(id, e) {
  e?.stopPropagation()
  const s = new Set(expandedIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expandedIds.value = s
}
function switchTab(idx) {
  if (activeTab.value === idx) {
    showInfoForTab.value = showInfoForTab.value === idx ? null : idx
    return
  }
  activeTab.value = idx
  expandedIds.value = new Set()
  _lastInternalId = null
  selectedNode.value = null
  showInfoForTab.value = null
  emit('select', null)
}
function deselect(e) {
  e?.stopPropagation()
  _lastInternalId = null
  selectedNode.value = null
  emit('select', null)
}
function showInfo(idx, e) {
  e?.stopPropagation()
  showInfoForTab.value = showInfoForTab.value === idx ? null : idx
}

// ── Formatters ─────────────────────────────────────────────────────────────────
function fmtPop(n) {
  if (!n) return '—'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return Math.round(n / 1e3) + 'k'
  return n.toLocaleString()
}
function fmtCount(n) { return n != null ? n.toLocaleString() : '—' }

// Per-row class helper — descendants of selected stay full-opacity
function rowClasses(row) {
  return {
    selected:   selectedId.value === row.node.id,
    descendant: hasSel.value && selectedDescendants.value.has(row.node.id),
    child:      row.relDepth > 0,
    leaf:       !row.node.children?.length,
  }
}

useShadowStyles(`
/* ── Single source of truth for column widths (PPLR original) ───────────── */
.stl-inner {
  --stl-pad-x:    10px;
  --stl-gap:       6px;
  --stl-caret-w:  14px;
  --stl-dot-w:     8px;
  --stl-num-w:    44px;
  --stl-x-w:      22px;
  flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;
  background:transparent;
  overflow:hidden;
}
/* Title bar */
.stl-titlebar{display:flex;align-items:center;gap:6px;padding:8px 12px;flex-shrink:0;border-bottom:1px solid #21262d;min-height:32px;}
.stl-tb-title,.stl-tb-eyebrow{font:600 10px ui-monospace,monospace;color:#73A17F;text-transform:uppercase;letter-spacing:0.07em;flex-shrink:0;}
.stl-tb-eyebrow{color:#6e7681;font-size:9px;letter-spacing:0.08em;}
.stl-tb-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;box-shadow:0 0 0 1px rgba(0,0,0,0.4),0 0 0 3px rgba(115,161,127,0.15);}
.stl-tb-text{flex:1;min-width:0;font:600 12px system-ui;color:#e6edf3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
/* Tabs (single row) */
.stl-tabs-wrap{flex-shrink:0;}
.stl-tabs{display:flex;flex-wrap:nowrap;gap:4px;padding:6px 8px;border-bottom:1px solid #21262d;overflow-x:auto;scrollbar-width:none;}
.stl-tabs::-webkit-scrollbar{display:none;}
.stl-tab-chip{display:inline-flex;align-items:stretch;flex-shrink:0;background:#1c2333;border:1px solid #30363d;border-radius:6px;overflow:hidden;transition:border-color 0.12s,box-shadow 0.12s;}
.stl-tab-chip:hover{border-color:#484f58;}
.stl-tab-chip.active{background:#3b463d;border-color:#73A17F;box-shadow:0 0 0 2px rgba(115,161,127,0.22),0 1px 4px rgba(59,70,61,0.4);}
.stl-tab{display:inline-flex;align-items:center;background:transparent;border:none;color:#8b949e;font:600 10px ui-monospace,monospace;text-transform:uppercase;letter-spacing:0.04em;padding:4px 8px;cursor:pointer;white-space:nowrap;}
.stl-tab:hover{color:#c9d1d9;}
.stl-tab-chip.active .stl-tab{color:#fff;}
.stl-tab-info{background:rgba(110,118,129,0.15);border:none;border-left:1px solid #30363d;color:#6e7681;cursor:pointer;width:18px;padding:0;font:700 9px ui-monospace,monospace;}
.stl-tab-info:hover{background:rgba(59,70,61,0.2);color:#73A17F;}
.stl-tab-chip.active .stl-tab-info{border-left-color:rgba(0,0,0,0.3);color:#fff;background:rgba(0,0,0,0.2);}
.stl-info-pop{margin:2px 8px 6px;padding:7px 10px;background:#0d1117;border:1px solid #30363d;border-radius:6px;font:11px system-ui;color:#c9d1d9;line-height:1.45;}
/* Shared row layout */
.stl-col-hdr,.stl-row{display:flex;align-items:center;gap:var(--stl-gap);padding:0 var(--stl-pad-x);}
.stl-col-hdr{height:22px;flex-shrink:0;background:#0d1117;border-bottom:1px solid #21262d;}
.stl-hdr-name{flex:1;min-width:0;font:600 9px ui-monospace,monospace;color:#6e7681;text-transform:uppercase;letter-spacing:0.05em;}
.stl-hdr-num{width:var(--stl-num-w);text-align:right;flex-shrink:0;font:600 9px ui-monospace,monospace;color:#6e7681;text-transform:uppercase;letter-spacing:0.05em;background:transparent;border:none;cursor:pointer;padding:0;transition:color 0.1s;display:inline-flex;align-items:center;justify-content:flex-end;gap:3px;}
.stl-hdr-num:hover{color:#c9d1d9;}
.stl-hdr-num.active{color:#73A17F;}
.stl-sort-arrow{font-size:8px;}
/* Rows */
.stl-rows{flex:1;overflow-y:auto;padding-bottom:6px;}
.stl-rows::-webkit-scrollbar{width:6px;}
.stl-rows::-webkit-scrollbar-track{background:transparent;}
.stl-rows::-webkit-scrollbar-thumb{background:#21262d;border-radius:3px;}
.stl-rows::-webkit-scrollbar-thumb:hover{background:#30363d;}
.stl-empty{padding:20px 12px;text-align:center;font:11px system-ui;color:#484f58;}
.stl-overflow{padding:8px 10px;margin:4px 0 0;background:#0d1117;border-top:1px dashed #30363d;text-align:center;font:10px system-ui;color:#6e7681;}
.stl-overflow-hint{color:#73A17F;}
.stl-row{min-height:27px;cursor:pointer;transition:opacity 0.12s,background 0.1s;border-bottom:1px solid rgba(33,38,45,0.45);}
.stl-row:last-child{border-bottom:none;}
.stl-row:hover{background:rgba(255,255,255,0.04);}
.stl-row.child .stl-name{color:#adbac7;}
.stl-row.leaf .stl-name{font-style:italic;}
.stl-rows.has-sel .stl-row:not(.selected):not(.descendant){opacity:0.30;}
.stl-rows.has-sel .stl-row:not(.selected):not(.descendant):hover{opacity:0.6;}
.stl-rows.has-sel .stl-row.descendant{opacity:1;}
.stl-rows.has-sel .stl-row.selected{opacity:1;background:rgba(59,70,61,0.18);box-shadow:inset 3px 0 0 0 #73A17F,0 0 12px rgba(115,161,127,0.08);}
/* Reserved slots */
.stl-caret-sp{width:var(--stl-caret-w);flex-shrink:0;}
.stl-dot-sp{width:var(--stl-dot-w);flex-shrink:0;}
.stl-x-slot{width:var(--stl-x-w);flex-shrink:0;display:flex;align-items:center;justify-content:center;}
/* ASCII-tree hairline trunks */
.stl-trunk{position:relative;flex-shrink:0;width:12px;align-self:stretch;}
.stl-trunk-pipe::before{content:'';position:absolute;left:5px;top:0;bottom:0;width:1px;background:var(--trunk-color,#6e7681);opacity:0.45;}
.stl-trunk-tee::before{content:'';position:absolute;left:5px;top:0;bottom:0;width:1px;background:var(--trunk-color,#6e7681);opacity:0.45;}
.stl-trunk-tee::after{content:'';position:absolute;left:5px;top:50%;height:1px;width:7px;background:var(--trunk-color,#6e7681);opacity:0.55;}
.stl-trunk-elbow::before{content:'';position:absolute;left:5px;top:0;height:50%;width:1px;background:var(--trunk-color,#6e7681);opacity:0.45;}
.stl-trunk-elbow::after{content:'';position:absolute;left:5px;top:calc(50% - 0.5px);height:1px;width:7px;background:var(--trunk-color,#6e7681);opacity:0.55;}
.stl-row.selected .stl-trunk-pipe::before,.stl-row.selected .stl-trunk-tee::before,.stl-row.selected .stl-trunk-tee::after,.stl-row.selected .stl-trunk-elbow::before,.stl-row.selected .stl-trunk-elbow::after,.stl-row.descendant .stl-trunk-pipe::before,.stl-row.descendant .stl-trunk-tee::before,.stl-row.descendant .stl-trunk-tee::after,.stl-row.descendant .stl-trunk-elbow::before,.stl-row.descendant .stl-trunk-elbow::after{opacity:0.85;}
/* Caret button */
.stl-caret{background:none;border:none;padding:0;cursor:pointer;color:#6e7681;width:var(--stl-caret-w);height:var(--stl-caret-w);flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:3px;}
.stl-caret svg{transition:transform 0.15s;}
.stl-caret.open svg{transform:rotate(90deg);}
.stl-caret:hover{color:#c9d1d9;background:rgba(255,255,255,0.06);}
/* Color dot */
.stl-dot{width:var(--stl-dot-w);height:var(--stl-dot-w);border-radius:50%;flex-shrink:0;box-shadow:0 0 0 1px rgba(0,0,0,0.4);}
.stl-row.selected .stl-dot{box-shadow:0 0 0 1px rgba(0,0,0,0.4),0 0 0 3px rgba(115,161,127,0.25);}
/* Label */
.stl-name{flex:1;min-width:0;font:11.5px system-ui,sans-serif;color:#e6edf3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
/* Numeric columns */
.stl-num{width:var(--stl-num-w);text-align:right;flex-shrink:0;font:10.5px ui-monospace,monospace;color:#8b949e;font-variant-numeric:tabular-nums;}
.stl-row.selected .stl-num{color:#e6edf3;}
/* Inline X chip — clearer "delete" affordance, no overlap with badges */
.stl-x-chip{background:#ef4444;border:none;border-radius:50%;color:#fff;cursor:pointer;width:18px;height:18px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px rgba(239,68,68,0.18);transition:transform 0.12s,box-shadow 0.12s;}
.stl-x-chip:hover{transform:scale(1.08);box-shadow:0 0 0 3px rgba(239,68,68,0.3);}
/* Light-mode palette — triggered by [data-theme="light"] */
.semantic-tree-legend[data-theme="light"] .stl-titlebar{border-color:#d8dee4;}
.semantic-tree-legend[data-theme="light"] .stl-tb-title,
.semantic-tree-legend[data-theme="light"] .stl-tb-eyebrow{color:#3b463d;}
.semantic-tree-legend[data-theme="light"] .stl-tb-eyebrow{color:#57606a;}
.semantic-tree-legend[data-theme="light"] .stl-tb-text{color:#1f2328;}
.semantic-tree-legend[data-theme="light"] .stl-tabs{border-color:#d8dee4;}
.semantic-tree-legend[data-theme="light"] .stl-tab-chip{background:#f6f8fa;border-color:#d0d7de;}
.semantic-tree-legend[data-theme="light"] .stl-tab{color:#57606a;}
.semantic-tree-legend[data-theme="light"] .stl-tab:hover{color:#1f2328;}
.semantic-tree-legend[data-theme="light"] .stl-tab-chip.active{background:#3b463d;border-color:#3b463d;box-shadow:0 0 0 2px rgba(59,70,61,0.18);}
.semantic-tree-legend[data-theme="light"] .stl-tab-chip.active .stl-tab{color:#fff;}
.semantic-tree-legend[data-theme="light"] .stl-tab-info{background:rgba(208,215,222,0.4);border-color:#d0d7de;color:#57606a;}
.semantic-tree-legend[data-theme="light"] .stl-info-pop{background:#f6f8fa;border-color:#d0d7de;color:#1f2328;}
.semantic-tree-legend[data-theme="light"] .stl-col-hdr{background:#f6f8fa;border-color:#d8dee4;}
.semantic-tree-legend[data-theme="light"] .stl-hdr-name,
.semantic-tree-legend[data-theme="light"] .stl-hdr-num{color:#57606a;}
.semantic-tree-legend[data-theme="light"] .stl-hdr-num:hover{color:#3b463d;}
.semantic-tree-legend[data-theme="light"] .stl-hdr-num.active{color:#3b463d;}
.semantic-tree-legend[data-theme="light"] .stl-rows::-webkit-scrollbar-thumb{background:#d0d7de;}
.semantic-tree-legend[data-theme="light"] .stl-rows::-webkit-scrollbar-thumb:hover{background:#afb8c1;}
.semantic-tree-legend[data-theme="light"] .stl-empty,
.semantic-tree-legend[data-theme="light"] .stl-overflow{color:#57606a;background:#f6f8fa;border-color:#d8dee4;}
.semantic-tree-legend[data-theme="light"] .stl-overflow-hint{color:#3b463d;}
.semantic-tree-legend[data-theme="light"] .stl-row{border-color:rgba(208,215,222,0.5);}
.semantic-tree-legend[data-theme="light"] .stl-row:hover{background:rgba(59,70,61,0.04);}
.semantic-tree-legend[data-theme="light"] .stl-row.child .stl-name{color:#57606a;}
.semantic-tree-legend[data-theme="light"] .stl-rows.has-sel .stl-row.selected{background:rgba(59,70,61,0.12);box-shadow:inset 3px 0 0 0 #3b463d,0 0 12px rgba(59,70,61,0.08);}
.semantic-tree-legend[data-theme="light"] .stl-name{color:#1f2328;}
.semantic-tree-legend[data-theme="light"] .stl-num{color:#57606a;}
.semantic-tree-legend[data-theme="light"] .stl-row.selected .stl-num{color:#1f2328;}
.semantic-tree-legend[data-theme="light"] .stl-caret{color:#57606a;}
.semantic-tree-legend[data-theme="light"] .stl-caret:hover{background:rgba(59,70,61,0.08);color:#3b463d;}
`, 'semantic-tree-legend')

defineExpose({ switchTab })
</script>

<template>
  <div class="semantic-tree-legend legend-family-tree" :data-theme="instance?.theme.value || 'dark'">
    <div class="stl-inner">

      <!-- Title bar — swaps to "{Tab name}: {Parent label}" when a child is selected.
           The collapse caret comes from LegendDesktop via #title-caret slot. -->
      <div class="stl-titlebar">
        <span class="stl-tb-caret-slot"><slot name="title-caret" /></span>
        <template v-if="parentBreadcrumb && selectedNode">
          <span class="stl-tb-eyebrow">{{ parentBreadcrumb.tabName }}</span>
          <span v-if="parentBreadcrumb.node.color" class="stl-tb-dot"
            :style="{ background: parentBreadcrumb.node.color }"></span>
          <span class="stl-tb-text" :title="parentBreadcrumb.node.label">{{ parentBreadcrumb.node.label }}</span>
        </template>
        <template v-else>
          <span class="stl-tb-title">{{ title }}</span>
        </template>
      </div>

      <!-- Tabs (one per generation) — single row -->
      <div class="stl-tabs-wrap">
        <div class="stl-tabs">
          <div v-for="(tab, idx) in tabList" :key="tab.id"
            class="stl-tab-chip" :class="{ active: activeTab === idx }">
            <button class="stl-tab" @click="switchTab(idx)">{{ tab.label }}</button>
            <button v-if="tab.info" class="stl-tab-info" :title="tab.info"
              @click="showInfo(idx, $event)">i</button>
          </div>
        </div>
        <div v-if="showInfoForTab !== null && tabList[showInfoForTab]?.info" class="stl-info-pop">
          {{ tabList[showInfoForTab].info }}
        </div>
      </div>

      <!-- Column headers — sortable -->
      <div class="stl-col-hdr">
        <span class="stl-caret-sp"></span>
        <span class="stl-dot-sp"></span>
        <span class="stl-hdr-name">{{ tabList[activeTab]?.label || 'Name' }}</span>
        <button v-if="hasCount" class="stl-hdr-num"
          :class="{ active: sortBy === 'count' }"
          title="Sort by UPGs"
          @click="clickSortHeader('count')">
          UPGs
          <span v-if="sortBy === 'count'" class="stl-sort-arrow">{{ sortDir === 'desc' ? '▼' : '▲' }}</span>
        </button>
        <button v-if="hasPop" class="stl-hdr-num"
          :class="{ active: sortBy === 'pop' }"
          title="Sort by Population"
          @click="clickSortHeader('pop')">
          Pop
          <span v-if="sortBy === 'pop'" class="stl-sort-arrow">{{ sortDir === 'desc' ? '▼' : '▲' }}</span>
        </button>
        <span class="stl-x-slot"></span>
      </div>

      <!-- Rows -->
      <div class="stl-rows" :class="{ 'has-sel': hasSel }">
        <div v-for="row in visibleRows" :key="row.node.id"
          class="stl-row" :class="rowClasses(row)"
          :style="{ '--trunk-color': (row.parent?.color || '#6e7681') }"
          @click="selectNode(row.node)">
          <span v-for="(seg, i) in row.trunks" :key="`tr${i}`"
            class="stl-trunk" :class="`stl-trunk-${seg}`"></span>
          <button v-if="row.node.children?.length"
            class="stl-caret" :class="{ open: expandedIds.has(row.node.id) }"
            @click.stop="toggleExpand(row.node.id, $event)">
            <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
              <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <span v-else class="stl-caret-sp"></span>
          <span v-if="row.node.color" class="stl-dot" :style="{ background: row.node.color }"></span>
          <span v-else class="stl-dot-sp"></span>
          <span class="stl-name">{{ row.node.label }}</span>
          <span v-if="hasCount" class="stl-num">{{ fmtCount(row.node.count) }}</span>
          <span v-if="hasPop"   class="stl-num">{{ fmtPop(row.node.pop) }}</span>
          <span class="stl-x-slot">
            <button v-if="selectedId === row.node.id"
              class="stl-x-chip" title="Clear selection"
              @click.stop="deselect($event)">
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </span>
        </div>

        <div v-if="!visibleRows.length && nodes.length === 0" class="stl-empty">Loading…</div>
        <div v-else-if="!visibleRows.length" class="stl-empty">No data at this level</div>
        <div v-if="topNodesOverflow > 0" class="stl-overflow">
          Showing top {{ tabList[activeTab].topLimit.toLocaleString() }} of
          {{ topNodesAll.length.toLocaleString() }} —
          <span class="stl-overflow-hint">use the geocoder above to find the rest</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* All runtime styles injected via useShadowStyles for shadow DOM compatibility. */
</style>
