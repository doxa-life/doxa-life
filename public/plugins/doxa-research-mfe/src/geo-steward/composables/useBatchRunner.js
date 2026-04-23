/**
 * useBatchRunner — generic batch processor with progress + cancellation.
 *
 * Pass any async function as `worker` and an array of items. The composable
 * runs the worker per item, with concurrency cap, and exposes progress.
 * Uses AbortController for cancellation.
 *
 * @example
 *   const { run, progress, running, cancel, results, errors } = useBatchRunner();
 *   await run(items, async (item, signal) => {
 *     const res = await fetch('/api/x', { method: 'POST', body: JSON.stringify(item), signal });
 *     return res.json();
 *   }, { concurrency: 4 });
 */
import { ref, computed } from 'vue';

export function useBatchRunner() {
  const total      = ref(0);
  const completed  = ref(0);
  const results    = ref([]);
  const errors     = ref([]);
  const running    = ref(false);
  let   ctrl       = null;

  const progress = computed(() => total.value ? completed.value / total.value : 0);

  /**
   * @param {Array} items
   * @param {(item:any, signal:AbortSignal, idx:number)=>Promise<any>} worker
   * @param {{concurrency?: number, stopOnError?: boolean}} [opts]
   */
  async function run(items, worker, opts = {}) {
    if (running.value) throw new Error('useBatchRunner: already running');
    const concurrency = Math.max(1, opts.concurrency ?? 4);
    const stopOnError = !!opts.stopOnError;

    total.value     = items.length;
    completed.value = 0;
    results.value   = new Array(items.length).fill(undefined);
    errors.value    = [];
    running.value   = true;
    ctrl = new AbortController();

    let nextIdx = 0;
    let aborted = false;
    async function worker_loop() {
      while (!aborted) {
        const i = nextIdx++;
        if (i >= items.length) return;
        try {
          results.value[i] = await worker(items[i], ctrl.signal, i);
        } catch (err) {
          errors.value.push({ index: i, item: items[i], error: err });
          if (stopOnError) { aborted = true; ctrl.abort(); return; }
        } finally {
          completed.value++;
        }
      }
    }
    try {
      await Promise.all(Array.from({ length: concurrency }, worker_loop));
    } finally {
      running.value = false;
      ctrl = null;
    }
    return { results: results.value, errors: errors.value };
  }

  function cancel() {
    if (ctrl) ctrl.abort();
  }

  return {
    run,
    cancel,
    progress,
    running,
    total,
    completed,
    results,
    errors,
  };
}
