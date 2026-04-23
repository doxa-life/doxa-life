/**
 * usePolygonWorkflow — selection + commit + undo/redo state for polygons.
 *
 * Three sets:
 *   selected — currently selected polygon ids
 *   pending  — polygons queued for commit (e.g. via "Add to batch" action)
 *   committed — polygons that have been processed
 *
 * History tracks transitions for undo/redo.
 *
 * @example
 *   const wf = usePolygonWorkflow();
 *   wf.select('p1'); wf.select('p2');
 *   wf.commitSelected();
 *   wf.undo();
 */
import { ref, computed, readonly } from 'vue';

export function usePolygonWorkflow() {
  const selected  = ref(new Set());
  const pending   = ref(new Set());
  const committed = ref(new Set());
  const history   = ref([]);   // stack of inverse ops
  const future    = ref([]);   // redo stack

  const selectedArr  = computed(() => Array.from(selected.value));
  const pendingArr   = computed(() => Array.from(pending.value));
  const committedArr = computed(() => Array.from(committed.value));

  function _record(op) {
    history.value.push(op);
    future.value = [];
  }
  function _apply(op) {
    if (op.type === 'select')        op.ids.forEach(id => selected.value.add(id));
    else if (op.type === 'deselect') op.ids.forEach(id => selected.value.delete(id));
    else if (op.type === 'commit')   op.ids.forEach(id => { selected.value.delete(id); committed.value.add(id); });
    else if (op.type === 'uncommit') op.ids.forEach(id => { committed.value.delete(id); selected.value.add(id); });
    else if (op.type === 'pend')     op.ids.forEach(id => pending.value.add(id));
    else if (op.type === 'unpend')   op.ids.forEach(id => pending.value.delete(id));
    selected.value  = new Set(selected.value);   // trigger reactivity
    pending.value   = new Set(pending.value);
    committed.value = new Set(committed.value);
  }
  function _inverse(op) {
    if (op.type === 'select')   return { type: 'deselect', ids: op.ids };
    if (op.type === 'deselect') return { type: 'select',   ids: op.ids };
    if (op.type === 'commit')   return { type: 'uncommit', ids: op.ids };
    if (op.type === 'uncommit') return { type: 'commit',   ids: op.ids };
    if (op.type === 'pend')     return { type: 'unpend',   ids: op.ids };
    if (op.type === 'unpend')   return { type: 'pend',     ids: op.ids };
    return null;
  }

  function select(...ids)         { const op = { type: 'select',   ids }; _apply(op); _record(_inverse(op)); }
  function deselect(...ids)       { const op = { type: 'deselect', ids }; _apply(op); _record(_inverse(op)); }
  function clearSelection()       { deselect(...selectedArr.value); }
  function commitSelected()       { const op = { type: 'commit',   ids: selectedArr.value }; _apply(op); _record(_inverse(op)); }

  function undo() {
    const op = history.value.pop();
    if (!op) return false;
    future.value.push(_inverse(op));
    _apply(op);
    return true;
  }
  function redo() {
    const op = future.value.pop();
    if (!op) return false;
    history.value.push(_inverse(op));
    _apply(op);
    return true;
  }
  function reset() {
    selected.value  = new Set();
    pending.value   = new Set();
    committed.value = new Set();
    history.value   = [];
    future.value    = [];
  }

  return {
    selected:  readonly(selected),
    pending:   readonly(pending),
    committed: readonly(committed),
    selectedArr,
    pendingArr,
    committedArr,
    canUndo: computed(() => history.value.length > 0),
    canRedo: computed(() => future.value.length > 0),
    select,
    deselect,
    clearSelection,
    commitSelected,
    undo,
    redo,
    reset,
  };
}
