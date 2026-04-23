/**
 * useWorkflow — multi-step workflow with history, navigation, validation.
 *
 * Steps are passed in as an array of step descriptors:
 *   { id, title, validate?: () => true|string, onEnter?, onLeave? }
 *
 * Validation: a step's validate() returns true to allow forward, or a string
 * error message to block.
 *
 * @example
 *   const wf = useWorkflow([
 *     { id: 'select',  title: 'Select polygons' },
 *     { id: 'review',  title: 'Review',  validate: () => selected.value.length > 0 || 'Pick at least one' },
 *     { id: 'commit',  title: 'Commit' },
 *   ]);
 *   wf.next();   // advance
 *   wf.back();   // go back
 *   wf.goto('commit');
 */
import { ref, computed, readonly } from 'vue';

/**
 * @param {Array<{id: string, title: string, validate?: Function, onEnter?: Function, onLeave?: Function}>} steps
 * @param {Object} [opts]
 * @param {number} [opts.start=0]
 */
export function useWorkflow(steps, opts = {}) {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error('useWorkflow: steps must be a non-empty array');
  }
  const idx = ref(opts.start ?? 0);
  const error = ref('');
  const history = ref([idx.value]);

  const current  = computed(() => steps[idx.value]);
  const isFirst  = computed(() => idx.value === 0);
  const isLast   = computed(() => idx.value === steps.length - 1);
  const total    = steps.length;

  function _enter(newIdx) {
    const leaving = steps[idx.value];
    leaving?.onLeave?.();
    idx.value = newIdx;
    error.value = '';
    history.value.push(newIdx);
    steps[newIdx]?.onEnter?.();
  }

  function next() {
    if (isLast.value) return false;
    const validation = current.value?.validate ? current.value.validate() : true;
    if (validation !== true) {
      error.value = String(validation || 'Cannot advance');
      return false;
    }
    _enter(idx.value + 1);
    return true;
  }
  function back() {
    if (isFirst.value) return false;
    _enter(idx.value - 1);
    return true;
  }
  function goto(stepIdOrIdx) {
    let target = -1;
    if (typeof stepIdOrIdx === 'number') target = stepIdOrIdx;
    else target = steps.findIndex(s => s.id === stepIdOrIdx);
    if (target < 0 || target >= steps.length) return false;
    _enter(target);
    return true;
  }
  function reset() {
    idx.value = opts.start ?? 0;
    history.value = [idx.value];
    error.value = '';
  }

  return {
    steps:    readonly(ref(steps)),
    index:    readonly(idx),
    current,
    isFirst,
    isLast,
    total,
    error:    readonly(error),
    history:  readonly(history),
    next,
    back,
    goto,
    reset,
  };
}
