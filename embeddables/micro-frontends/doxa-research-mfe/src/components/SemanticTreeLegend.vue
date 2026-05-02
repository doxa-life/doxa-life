<script setup>
/**
 * SemanticTreeLegend — reusable hierarchical legend for any one-to-many semantic tree.
 *
 * EXACT CLONE of /Map-Framework/05-apps/PPLR-MAPS/PPLR-validate-data-mfe/src/components/SemanticTreeLegend.vue
 * per user directive: "do a direct clone, only shave the API." Only difference vs.
 * upstream is the <style scoped> block converted to useShadowStyles() so the CSS
 * lands inside doxa-research-mfe's shadow root.
 *
 * Decoupled from map and geocoder; communicates via the shared per-instance store
 * (Mediator Pattern) when one is provided. Falls back to local state when standalone.
 *
 * Tree node shape:
 *   { id, label, color?, count?, pop?, filter?, info?, children?: TreeNode[] }
 */
import { ref, computed, watch } from 'vue'
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
const panelOpen      = ref(true)
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

watch(() => props.nodes, () => {
  activeTab.value = 0
  expandedIds.value = new Set()
  selectedNode.value = null
  emit('select', null)
}, { deep: false })

let _lastInternalId = null
if (instance) {
  watch(() => instance.selection.value, sel => {
    if (sel?.id === _lastInternalId) return
    if (!sel) { _lastInternalId = null; return }
    _lastInternalId = sel.id
    const chain = findAncestorChain(props.nodes, sel.id) || []
    if (typeof sel.depth === 'number') {
      activeTab.value = Math.min(sel.depth, tabList.value.length - 1)
    }
    const tabIdx = activeTab.value
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
const tabResults = ref([])
const tabLoading = ref(false)

let _pendingTab = -1
function ensureTabComputed(tab) {
  if (tabResults.value[tab]) { tabLoading.value = false; return }
  tabLoading.value = true
  _pendingTab = tab
  setTimeout(() => {
    if (_pendingTab !== tab) return
    const result = [...collectAtDepth(props.nodes, tab)].sort(byActiveSort.value)
    const next = [...tabResults.value]
    next[tab] = result
    tabResults.value = next
    tabLoading.value = false
  }, 0)
}

watch(activeTab, t => ensureTabComputed(t), { immediate: true })
watch(() => [props.nodes, sortBy.value, sortDir.value], () => {
  tabResults.value = []
  ensureTabComputed(activeTab.value)
}, { deep: false })

const topNodesAll = computed(() => tabResults.value[activeTab.value] || [])
const topNodes = computed(() => {
  const limit = tabList.value[activeTab.value]?.topLimit
  return limit ? topNodesAll.value.slice(0, limit) : topNodesAll.value
})
const topNodesOverflow = computed(() => {
  const limit = tabList.value[activeTab.value]?.topLimit
  if (!limit) return 0
  return Math.max(0, topNodesAll.value.length - limit)
})

function buildRows(out, nodes, relDepth, parent, ancestors) {
  for (const node of nodes) {
    out.push({ node, relDepth, parent, ancestors })
    if (expandedIds.value.has(node.id) && node.children?.length) {
      buildRows(out, [...node.children].sort(byActiveSort.value), relDepth + 1, node, [...ancestors, node])
    }
  }
}

const visibleRows = computed(() => {
  const out = []
  buildRows(out, topNodes.value, 0, null, [])
  for (let i = 0; i < out.length; i++) {
    const row = out[i]
    const segs = []
    for (let L = 0; L < row.relDepth; L++) {
      const ancAtL = row.ancestors[L]
      let trunkContinues = false
      for (let j = i + 1; j < out.length; j++) {
        const next = out[j]
        if (next.relDepth <= L) break
        if (next.relDepth === L + 1 && next.ancestors[L] === ancAtL) {
          trunkContinues = true; break
        }
        if (next.relDepth > L + 1 && next.ancestors[L] === ancAtL) {
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

const selectedDescendants = computed(() => {
  if (!selectedNode.value) return new Set()
  return collectAllDescendantIds(selectedNode.value)
})

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

function rowClasses(row) {
  return {
    selected:   selectedId.value === row.node.id,
    descendant: hasSel.value && selectedDescendants.value.has(row.node.id),
    child:      row.relDepth > 0,
    leaf:       !row.node.children?.length,
  }
}

// CSS — verbatim from PPLR's <style scoped>, injected into shadow root.
useShadowStyles(`
.stl-inner {
  --stl-pad-x:    10px;
  --stl-gap:       6px;
  --stl-caret-w:  14px;
  --stl-dot-w:     8px;
  --stl-num-w:    44px;
  --stl-x-w:      22px;
  flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column;
  background: #161b22; border: 1px solid #30363d;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.45);
  overflow: hidden;
}
.stl-panel {
  position: absolute; left: 8px; top: 60px; bottom: 12px; width: 380px; z-index: 4;
  display: flex; flex-direction: column;
  transition: transform 0.25s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s;
  pointer-events: auto;
}
.stl-panel.closed { transform: translateX(-100%); opacity: 0; pointer-events: none; }
.stl-titlebar {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 12px; flex-shrink: 0;
  border-bottom: 1px solid #21262d;
  min-height: 32px;
}
.stl-tb-title,
.stl-tb-eyebrow {
  font: 600 10px ui-monospace, monospace;
  color: #73A17F; text-transform: uppercase; letter-spacing: 0.07em;
  flex-shrink: 0;
}
.stl-tb-eyebrow { color: #6e7681; font-size: 9px; letter-spacing: 0.08em; }
.stl-tb-dot {
  width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.4), 0 0 0 3px rgba(115,161,127,0.15);
}
.stl-tb-text {
  flex: 1; min-width: 0;
  font: 600 12px system-ui; color: #e6edf3;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.stl-tabs-wrap { flex-shrink: 0; }
.stl-tabs {
  display: flex; flex-wrap: nowrap; gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid #21262d;
  overflow-x: auto;
  scrollbar-width: none;
}
.stl-tabs::-webkit-scrollbar { display: none; }
.stl-tab-chip {
  display: inline-flex; align-items: stretch; flex-shrink: 0;
  background: #1c2333; border: 1px solid #30363d; border-radius: 6px;
  overflow: hidden; transition: border-color 0.12s, box-shadow 0.12s;
}
.stl-tab-chip:hover { border-color: #484f58; }
.stl-tab-chip.active {
  background: #3b463d; border-color: #73A17F;
  box-shadow: 0 0 0 2px rgba(115,161,127,0.22), 0 1px 4px rgba(59,70,61,0.4);
}
.stl-tab {
  display: inline-flex; align-items: center;
  background: transparent; border: none;
  color: #8b949e; font: 600 10px ui-monospace, monospace;
  text-transform: uppercase; letter-spacing: 0.04em;
  padding: 4px 8px; cursor: pointer; white-space: nowrap;
}
.stl-tab:hover { color: #c9d1d9; }
.stl-tab-chip.active .stl-tab { color: #fff; }
.stl-tab-info {
  background: rgba(110,118,129,0.15); border: none; border-left: 1px solid #30363d;
  color: #6e7681; cursor: pointer;
  width: 18px; padding: 0; font: 700 9px ui-monospace, monospace;
}
.stl-tab-info:hover { background: rgba(59,70,61,0.2); color: #73A17F; }
.stl-tab-chip.active .stl-tab-info {
  border-left-color: rgba(0,0,0,0.3); color: #fff;
  background: rgba(0,0,0,0.2);
}
.stl-info-pop {
  margin: 2px 8px 6px; padding: 7px 10px;
  background: #0d1117; border: 1px solid #30363d; border-radius: 6px;
  font: 11px system-ui; color: #c9d1d9; line-height: 1.45;
}
.stl-col-hdr,
.stl-row {
  display: flex; align-items: center; gap: var(--stl-gap);
  padding: 0 var(--stl-pad-x);
}
.stl-col-hdr {
  height: 22px; flex-shrink: 0;
  background: #0d1117; border-bottom: 1px solid #21262d;
}
.stl-hdr-name {
  flex: 1; min-width: 0;
  font: 600 9px ui-monospace, monospace;
  color: #6e7681; text-transform: uppercase; letter-spacing: 0.05em;
}
.stl-hdr-num {
  width: var(--stl-num-w); text-align: right; flex-shrink: 0;
  font: 600 9px ui-monospace, monospace;
  color: #6e7681; text-transform: uppercase; letter-spacing: 0.05em;
  background: transparent; border: none; cursor: pointer;
  padding: 0; transition: color 0.1s;
  display: inline-flex; align-items: center; justify-content: flex-end; gap: 3px;
}
.stl-hdr-num:hover { color: #c9d1d9; }
.stl-hdr-num.active { color: #73A17F; }
.stl-sort-arrow { font-size: 8px; }
.stl-rows { flex: 1; overflow-y: auto; padding-bottom: 6px; }
.stl-rows::-webkit-scrollbar { width: 6px; }
.stl-rows::-webkit-scrollbar-track { background: transparent; }
.stl-rows::-webkit-scrollbar-thumb { background: #21262d; border-radius: 3px; }
.stl-rows::-webkit-scrollbar-thumb:hover { background: #30363d; }
.stl-empty {
  padding: 20px 12px; text-align: center;
  font: 11px system-ui; color: #484f58;
}
.stl-loading {
  display: inline-flex; align-items: center; gap: 8px;
  width: 100%; justify-content: center;
  color: #73A17F;
}
.stl-spinner {
  width: 12px; height: 12px; border-radius: 50%;
  border: 2px solid rgba(115,161,127,0.25);
  border-top-color: #73A17F;
  animation: stl-spin 0.7s linear infinite;
}
@keyframes stl-spin { to { transform: rotate(360deg); } }
.stl-overflow {
  padding: 8px 10px; margin: 4px 0 0;
  background: #0d1117; border-top: 1px dashed #30363d;
  text-align: center; font: 10px system-ui; color: #6e7681;
}
.stl-overflow-hint { color: #73A17F; }
.stl-row {
  min-height: 27px;
  cursor: pointer; transition: opacity 0.12s, background 0.1s;
  border-bottom: 1px solid rgba(33,38,45,0.45);
}
.stl-row:last-child { border-bottom: none; }
.stl-row:hover { background: rgba(255,255,255,0.04); }
.stl-row.child .stl-name { color: #adbac7; }
.stl-row.leaf .stl-name { font-style: italic; }
.stl-rows.has-sel .stl-row:not(.selected):not(.descendant) { opacity: 0.30; }
.stl-rows.has-sel .stl-row:not(.selected):not(.descendant):hover { opacity: 0.6; }
.stl-rows.has-sel .stl-row.descendant { opacity: 1; }
.stl-rows.has-sel .stl-row.selected {
  opacity: 1;
  background: rgba(255,255,255,0.05);
  box-shadow:
    inset 3px 0 0 0 var(--row-color, #73A17F),
    inset 0 0 0 1px rgba(255,255,255,0.05),
    0 0 14px -2px var(--row-color, rgba(115,161,127,0.4));
}
.stl-panel[data-theme="light"] .stl-rows.has-sel .stl-row.selected {
  background: rgba(255,255,255,0.7);
  box-shadow:
    inset 3px 0 0 0 var(--row-color, #3b463d),
    inset 0 0 0 1px rgba(0,0,0,0.04),
    0 0 14px -2px var(--row-color, rgba(59,70,61,0.35));
}
.stl-caret-sp   { width: var(--stl-caret-w); flex-shrink: 0; }
.stl-dot-sp     { width: var(--stl-dot-w); flex-shrink: 0; }
.stl-x-slot     {
  width: var(--stl-x-w); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.stl-trunk { position: relative; flex-shrink: 0; width: 12px; align-self: stretch; }
.stl-trunk-pipe::before {
  content: ''; position: absolute;
  left: 5px; top: 0; bottom: 0; width: 1px;
  background: var(--trunk-color, #6e7681);
  opacity: 0.45;
}
.stl-trunk-tee::before {
  content: ''; position: absolute;
  left: 5px; top: 0; bottom: 0; width: 1px;
  background: var(--trunk-color, #6e7681);
  opacity: 0.45;
}
.stl-trunk-tee::after {
  content: ''; position: absolute;
  left: 5px; top: 50%; height: 1px; width: 7px;
  background: var(--trunk-color, #6e7681);
  opacity: 0.55;
}
.stl-trunk-elbow::before {
  content: ''; position: absolute;
  left: 5px; top: 0; height: 50%; width: 1px;
  background: var(--trunk-color, #6e7681);
  opacity: 0.45;
}
.stl-trunk-elbow::after {
  content: ''; position: absolute;
  left: 5px; top: calc(50% - 0.5px); height: 1px; width: 7px;
  background: var(--trunk-color, #6e7681);
  opacity: 0.55;
}
.stl-row.selected .stl-trunk-pipe::before,
.stl-row.selected .stl-trunk-tee::before,
.stl-row.selected .stl-trunk-tee::after,
.stl-row.selected .stl-trunk-elbow::before,
.stl-row.selected .stl-trunk-elbow::after,
.stl-row.descendant .stl-trunk-pipe::before,
.stl-row.descendant .stl-trunk-tee::before,
.stl-row.descendant .stl-trunk-tee::after,
.stl-row.descendant .stl-trunk-elbow::before,
.stl-row.descendant .stl-trunk-elbow::after {
  opacity: 0.85;
}
.stl-caret {
  background: none; border: none; padding: 0; cursor: pointer;
  color: #6e7681; width: var(--stl-caret-w); height: var(--stl-caret-w); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 3px;
}
.stl-caret svg { transition: transform 0.15s; }
.stl-caret.open svg { transform: rotate(90deg); }
.stl-caret:hover { color: #c9d1d9; background: rgba(255,255,255,0.06); }
.stl-dot {
  width: var(--stl-dot-w); height: var(--stl-dot-w); border-radius: 50%; flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.4);
}
.stl-row.selected .stl-dot {
  box-shadow: 0 0 0 1px rgba(0,0,0,0.4), 0 0 0 3px rgba(115,161,127,0.25);
}
.stl-name {
  flex: 1; min-width: 0;
  font: 11.5px system-ui, sans-serif; color: #e6edf3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.stl-num {
  width: var(--stl-num-w); text-align: right; flex-shrink: 0;
  font: 10.5px ui-monospace, monospace; color: #8b949e;
  font-variant-numeric: tabular-nums;
}
.stl-row.selected .stl-num { color: #e6edf3; }
.stl-x-chip {
  background: #ef4444; border: none; border-radius: 50%;
  color: #fff; cursor: pointer;
  width: 18px; height: 18px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 2px rgba(239,68,68,0.18);
  transition: transform 0.12s, box-shadow 0.12s;
}
.stl-x-chip:hover { transform: scale(1.08); box-shadow: 0 0 0 3px rgba(239,68,68,0.3); }
.stl-collapse-btn {
  background: rgba(110,118,129,0.15); border: 1px solid #30363d; border-radius: 5px;
  color: #8b949e; cursor: pointer;
  width: 22px; height: 20px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: color 0.1s, background 0.1s, transform 0.18s;
}
.stl-collapse-btn:hover { color: #c9d1d9; background: rgba(59,70,61,0.18); border-color: #73A17F; }
.stl-collapse-btn svg { transition: transform 0.18s; transform: rotate(180deg); }
.stl-reopen {
  position: absolute; left: 8px; top: 60px; z-index: 3;
  display: inline-flex; align-items: center; gap: 8px;
  background: #0d1117; border: 1px solid #30363d;
  border-radius: 999px;
  color: #c9d1d9; cursor: pointer;
  height: 36px;
  padding: 0 14px 0 12px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.25);
  font: 600 11px ui-monospace, monospace;
  text-transform: uppercase; letter-spacing: 0.06em;
  max-width: 320px;
  transition: color 0.12s, background 0.12s, border-color 0.12s, transform 0.12s, box-shadow 0.12s;
}
.stl-reopen:hover {
  color: #fff; background: #1c2333; border-color: #73A17F;
  box-shadow: 0 6px 20px rgba(59,70,61,0.25);
  transform: translateY(-1px);
}
.stl-reopen-icon { color: #73A17F; flex-shrink: 0; }
.stl-reopen-label {
  display: inline-flex; align-items: center; gap: 6px;
  min-width: 0; max-width: 200px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  text-transform: none; letter-spacing: 0;
  font: 600 12px system-ui, sans-serif;
}
.stl-reopen-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.4);
}
.stl-reopen-caret { color: #6e7681; flex-shrink: 0; }
.stl-reopen:hover .stl-reopen-caret { color: #c9d1d9; }
@media (max-width: 640px) {
  .stl-panel { width: 92vw; max-width: 380px; top: 64px; bottom: 8px; }
  .stl-reopen { top: 64px; }
}
.stl-panel[data-theme="light"] .stl-inner {
  background: #ffffff; border-color: #d0d7de;
  box-shadow: 0 6px 24px rgba(31, 35, 40, 0.12);
}
.stl-panel[data-theme="light"] .stl-titlebar { border-color: #d8dee4; }
.stl-panel[data-theme="light"] .stl-tb-title,
.stl-panel[data-theme="light"] .stl-tb-eyebrow { color: #3b463d; }
.stl-panel[data-theme="light"] .stl-tb-eyebrow { color: #57606a; }
.stl-panel[data-theme="light"] .stl-tb-text { color: #1f2328; }
.stl-panel[data-theme="light"] .stl-collapse-btn {
  background: rgba(208,215,222,0.4); border-color: #d0d7de; color: #57606a;
}
.stl-panel[data-theme="light"] .stl-collapse-btn:hover {
  background: rgba(59,70,61,0.12); border-color: #3b463d; color: #3b463d;
}
.stl-panel[data-theme="light"] .stl-tabs { border-color: #d8dee4; }
.stl-panel[data-theme="light"] .stl-tab-chip { background: #f6f8fa; border-color: #d0d7de; }
.stl-panel[data-theme="light"] .stl-tab { color: #57606a; }
.stl-panel[data-theme="light"] .stl-tab:hover { color: #1f2328; }
.stl-panel[data-theme="light"] .stl-tab-chip.active {
  background: #3b463d; border-color: #3b463d;
  box-shadow: 0 0 0 2px rgba(59,70,61,0.18);
}
.stl-panel[data-theme="light"] .stl-tab-chip.active .stl-tab { color: #fff; }
.stl-panel[data-theme="light"] .stl-tab-info {
  background: rgba(208,215,222,0.4); border-color: #d0d7de; color: #57606a;
}
.stl-panel[data-theme="light"] .stl-info-pop { background: #f6f8fa; border-color: #d0d7de; color: #1f2328; }
.stl-panel[data-theme="light"] .stl-col-hdr { background: #f6f8fa; border-color: #d8dee4; }
.stl-panel[data-theme="light"] .stl-hdr-name,
.stl-panel[data-theme="light"] .stl-hdr-num { color: #57606a; }
.stl-panel[data-theme="light"] .stl-hdr-num:hover { color: #3b463d; }
.stl-panel[data-theme="light"] .stl-hdr-num.active { color: #3b463d; }
.stl-panel[data-theme="light"] .stl-rows::-webkit-scrollbar-thumb { background: #d0d7de; }
.stl-panel[data-theme="light"] .stl-rows::-webkit-scrollbar-thumb:hover { background: #afb8c1; }
.stl-panel[data-theme="light"] .stl-empty,
.stl-panel[data-theme="light"] .stl-overflow {
  color: #57606a; background: #f6f8fa; border-color: #d8dee4;
}
.stl-panel[data-theme="light"] .stl-overflow-hint { color: #3b463d; }
.stl-panel[data-theme="light"] .stl-row { border-color: rgba(208,215,222,0.5); }
.stl-panel[data-theme="light"] .stl-row:hover { background: rgba(59,70,61,0.04); }
.stl-panel[data-theme="light"] .stl-row.child .stl-name { color: #57606a; }
.stl-panel[data-theme="light"] .stl-name { color: #1f2328; }
.stl-panel[data-theme="light"] .stl-num { color: #57606a; }
.stl-panel[data-theme="light"] .stl-row.selected .stl-num { color: #1f2328; }
.stl-panel[data-theme="light"] .stl-caret { color: #57606a; }
.stl-panel[data-theme="light"] .stl-caret:hover { background: rgba(59,70,61,0.08); color: #3b463d; }
.stl-reopen[data-theme="light"] {
  background: #ffffff; border-color: #d0d7de; color: #1f2328;
  box-shadow: 0 4px 16px rgba(31,35,40,0.18);
}
.stl-reopen[data-theme="light"]:hover {
  background: #f6f8fa; border-color: #3b463d; color: #3b463d;
  box-shadow: 0 6px 20px rgba(59,70,61,0.2);
}
.stl-reopen[data-theme="light"] .stl-reopen-icon { color: #3b463d; }
.stl-reopen[data-theme="light"] .stl-reopen-caret { color: #57606a; }
`, 'semantic-tree-legend')
</script>

<template>
  <div class="stl-panel" :class="{ closed: !panelOpen }" :data-theme="instance?.theme.value || 'dark'">
    <div class="stl-inner">

      <div class="stl-titlebar">
        <button
          class="stl-collapse-btn"
          :class="{ closed: !panelOpen }"
          :title="panelOpen ? 'Collapse legend' : 'Expand legend'"
          @click="panelOpen = !panelOpen">
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
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

      <div class="stl-rows" :class="{ 'has-sel': hasSel }">
        <div v-for="row in visibleRows" :key="row.node.id"
          class="stl-row" :class="rowClasses(row)"
          :style="{
            '--trunk-color': (row.parent?.color || '#6e7681'),
            '--row-color':   (row.node.color   || '#73A17F'),
          }"
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

        <div v-if="tabLoading && !visibleRows.length" class="stl-empty stl-loading">
          <span class="stl-spinner"></span>
          <span>Loading {{ tabList[activeTab]?.label || 'rows' }}…</span>
        </div>
        <div v-else-if="!visibleRows.length && nodes.length === 0" class="stl-empty">Loading data…</div>
        <div v-else-if="!visibleRows.length" class="stl-empty">No data at this level</div>
        <div v-if="topNodesOverflow > 0" class="stl-overflow">
          Showing top {{ tabList[activeTab].topLimit.toLocaleString() }} of
          {{ topNodesAll.length.toLocaleString() }} —
          <span class="stl-overflow-hint">use the geocoder above to find the rest</span>
        </div>
      </div>
    </div>
  </div>

  <button v-if="!panelOpen"
    class="stl-reopen"
    :data-theme="instance?.theme.value || 'dark'"
    title="Expand legend"
    @click="panelOpen = true">
    <svg class="stl-reopen-icon" width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M2 4h8M2 6h8M2 8h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>
    <span class="stl-reopen-label">
      <template v-if="selectedNode">
        <span v-if="selectedNode.color" class="stl-reopen-dot"
          :style="{ background: selectedNode.color }"></span>
        {{ selectedNode.label }}
      </template>
      <template v-else>{{ title }}</template>
    </span>
    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" class="stl-reopen-caret">
      <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" stroke-width="1.8"
        stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</template>

<style scoped>
/* All runtime styles injected via useShadowStyles for shadow DOM compatibility. */
</style>
