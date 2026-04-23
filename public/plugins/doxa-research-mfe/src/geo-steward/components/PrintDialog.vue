<script setup>
/**
 * PrintDialog — preview + trigger for printing the map. Pair with
 * usePrintDialog for the underlying state.
 *
 * Emits 'print' when the user confirms. Parent gathers snapshot + legend
 * SVG and either renders for print or hands off to PDF generation.
 */
import { computed } from 'vue';

const props = defineProps({
  open:        { type: Boolean, default: false },
  title:       { type: String, default: 'Print Map' },
  previewUrl:  { type: String, default: '' },     // image data URL or src
  metadata:    { type: Object, default: () => ({}) },
  loading:     { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'print']);

const metaRows = computed(() => Object.entries(props.metadata));
</script>

<template>
  <div v-if="open" class="print-dialog" role="dialog" aria-modal="true">
    <div class="print-dialog__backdrop" @click="emit('close')" />
    <div class="print-dialog__panel">
      <header class="print-dialog__header">
        <h3>{{ title }}</h3>
        <button class="print-dialog__close" @click="emit('close')">×</button>
      </header>

      <section class="print-dialog__body">
        <div v-if="loading" class="print-dialog__loading">Preparing preview…</div>
        <img v-else-if="previewUrl" :src="previewUrl" class="print-dialog__preview" alt="Map preview" />
        <dl v-if="metaRows.length" class="print-dialog__meta">
          <template v-for="([k, v]) in metaRows" :key="k">
            <dt>{{ k }}</dt>
            <dd>{{ v }}</dd>
          </template>
        </dl>
      </section>

      <footer class="print-dialog__footer">
        <button @click="emit('close')">Cancel</button>
        <button class="primary" :disabled="loading || !previewUrl" @click="emit('print')">Print</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.print-dialog { position: fixed; inset: 0; z-index: 5000; display: flex; align-items: center; justify-content: center; }
.print-dialog__backdrop { position:absolute; inset:0; background: rgba(0,0,0,.4); }
.print-dialog__panel {
  position: relative; background: #fff; border-radius: 8px;
  width: min(800px, 90vw); max-height: 90vh; display: flex; flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,.25);
}
.print-dialog__header { display:flex; justify-content:space-between; padding:1rem 1.25rem; border-bottom:1px solid #e5e7eb; }
.print-dialog__header h3 { margin: 0; }
.print-dialog__close { font-size: 1.5rem; background: none; border: none; cursor: pointer; }
.print-dialog__body { padding: 1rem 1.25rem; overflow: auto; }
.print-dialog__loading { padding: 2rem; text-align: center; color: #6b7280; }
.print-dialog__preview { width: 100%; border: 1px solid #e5e7eb; border-radius: 4px; }
.print-dialog__meta { margin: 1rem 0 0; display:grid; grid-template-columns: max-content 1fr; gap: .25rem .75rem; font-size: .875rem; }
.print-dialog__meta dt { color: #6b7280; }
.print-dialog__footer { display:flex; gap: .5rem; justify-content:flex-end; padding:.75rem 1.25rem; border-top:1px solid #e5e7eb; }
.print-dialog__footer .primary { background:#2563eb; color:#fff; border:none; padding:.5rem 1rem; border-radius:4px; }
.print-dialog__footer .primary[disabled] { opacity:.5; cursor:not-allowed; }
</style>
