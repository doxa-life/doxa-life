<!--
  PosterDialog.vue — modal for previewing + rendering a poster export.

  Wires together:
    - posterSizes preset picker
    - format (PNG / PDF) picker
    - orientation toggle
    - DPI selector
    - PosterPreview live-preview pane
    - render → download trigger via useMapPoster

  Caller passes a `getMap` accessor and optional `legendRows` (for legend slot)
  and `metadata` (for footer slot).

  Slots (Vue) you can override:
    - #header          — replace the title bar
    - #format-extras   — add custom inputs next to the format picker
-->
<template>
  <transition name="poster-dlg">
    <div v-if="visible" class="poster-dlg-backdrop" @click.self="onClose">
      <section class="poster-dlg" role="dialog" aria-modal="true" aria-label="Export Poster">
        <header class="poster-dlg__header">
          <slot name="header">
            <h2>Export Poster</h2>
          </slot>
          <button class="poster-dlg__close" type="button" aria-label="Close" @click="onClose">×</button>
        </header>

        <div class="poster-dlg__body">
          <aside class="poster-dlg__controls">
            <label class="ctl">
              <span>Size</span>
              <select v-model="sizeId">
                <option v-for="s in sizes" :key="s.id" :value="s.id">{{ s.label }}</option>
              </select>
            </label>

            <label class="ctl">
              <span>Orientation</span>
              <select v-model="orientation">
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>

            <label class="ctl">
              <span>DPI</span>
              <select v-model.number="dpi">
                <option :value="150">150 (large posters)</option>
                <option :value="200">200 (balanced)</option>
                <option :value="300">300 (sharp)</option>
              </select>
            </label>

            <label class="ctl">
              <span>Format</span>
              <select v-model="format">
                <option value="png">PNG (raster)</option>
                <option value="pdf">PDF (raster on vector page)</option>
              </select>
              <slot name="format-extras" />
            </label>

            <label class="ctl">
              <span>Title</span>
              <input v-model="titleText" type="text" placeholder="Map title" />
            </label>

            <label class="ctl">
              <span>Subtitle</span>
              <input v-model="subtitleText" type="text" placeholder="(optional)" />
            </label>

            <fieldset class="ctl ctl--check">
              <legend>Slots</legend>
              <label><input v-model="enableLegend"   type="checkbox" /> Legend</label>
              <label><input v-model="enableScale"    type="checkbox" /> Scale bar</label>
              <label><input v-model="enableNorth"    type="checkbox" /> North arrow</label>
              <label class="muted"><input type="checkbox" checked disabled /> Footer (attribution required)</label>
            </fieldset>

            <div class="render-status" v-if="poster.isRendering.value">
              <strong>{{ poster.progress.value.phase }}</strong>
              <progress :max="poster.progress.value.total || 1" :value="poster.progress.value.completed" />
              <small>{{ poster.progress.value.message }}</small>
              <button class="btn btn--ghost" type="button" @click="poster.cancel">Cancel</button>
            </div>

            <div class="actions">
              <button class="btn btn--ghost" type="button" @click="onClose">Close</button>
              <button class="btn btn--primary" type="button" :disabled="poster.isRendering.value" @click="onRender">
                {{ poster.isRendering.value ? 'Rendering…' : `Render ${format.toUpperCase()}` }}
              </button>
            </div>
          </aside>

          <main class="poster-dlg__preview">
            <PosterPreview
              :spec="spec"
              :get-map="getMap"
              :legend-rows="legendRows"
              :metadata="metadata"
            />
          </main>
        </div>
      </section>
    </div>
  </transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import PosterPreview from './PosterPreview.vue';
import { useMapPoster } from '../../composables/useMapPoster.js';
import { listPosterSizes, getPosterSize, DEFAULT_POSTER_ID } from '../../config/posterSizes.js';
import { defaultPosterSpec, posterDefaults } from '../../config/posterDefaults.js';

const props = defineProps({
  /** Boolean v-model: dialog visibility. */
  modelValue: { type: Boolean, default: false },
  /** Function returning the live Mapbox map instance. */
  getMap:     { type: Function, required: true },
  /** Optional pre-built legend rows: [{ color, label }] */
  legendRows: { type: Array,    default: () => [] },
  /** Optional metadata for footer slot, e.g. { source, date, author } */
  metadata:   { type: Object,   default: () => ({}) },
  /** Optional initial size id. */
  initialSize: { type: String,  default: DEFAULT_POSTER_ID },
});

const emit = defineEmits(['update:modelValue', 'rendered', 'error']);

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const sizes        = listPosterSizes();
const sizeId       = ref(props.initialSize);
const orientation  = ref('portrait');
const dpi          = ref(300);
const format       = ref('png');
const titleText    = ref('');
const subtitleText = ref('');
const enableLegend = ref(true);
const enableScale  = ref(true);
const enableNorth  = ref(true);

watch(sizeId, (id) => {
  const s = getPosterSize(id);
  if (s) {
    dpi.value = s.recommendedDpi;
    if (s.orientation !== 'either') orientation.value = s.orientation;
  }
}, { immediate: true });

const spec = computed(() => {
  const s = getPosterSize(sizeId.value);
  if (!s) return defaultPosterSpec({ widthIn: 24, heightIn: 36 });
  const base = defaultPosterSpec({
    widthIn:  s.inches.w,
    heightIn: s.inches.h,
    dpi:      dpi.value,
    orientation: orientation.value,
  });
  base.slots.title = {
    ...base.slots.title,
    text: titleText.value,
    subtitle: subtitleText.value,
  };
  base.slots.legend   = enableLegend.value
    ? { ...base.slots.legend, rows: props.legendRows }
    : null;
  base.slots.scaleBar = enableScale.value;
  base.slots.north    = enableNorth.value;
  base.slots.footer   = {
    ...base.slots.footer,
    left:  props.metadata.source ? `Source: ${props.metadata.source}` : '',
    right: props.metadata.date   ? `${props.metadata.date}`           : new Date().toISOString().slice(0, 10),
    attribution: posterDefaults.footer.attribution,
  };
  return base;
});

const poster = useMapPoster(props.getMap);

async function onRender() {
  try {
    const blob = await poster.render(spec.value, format.value);
    const ext  = (format.value === 'pdf') ? 'pdf' : 'png';
    const name = (titleText.value || 'poster').replace(/\W+/g, '-').toLowerCase();
    _download(blob, `${name}.${ext}`);
    emit('rendered', { blob, format: format.value, spec: spec.value });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[PosterDialog] render failed', err);
    emit('error', err);
  }
}

function onClose() { visible.value = false; }

function _download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
</script>

<style scoped>
.poster-dlg-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
}
.poster-dlg {
  background: #fff;
  width: min(1100px, 95vw);
  height: min(800px, 92vh);
  border-radius: 8px;
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
}
.poster-dlg__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid #eee;
}
.poster-dlg__header h2 { margin: 0; font-size: 16px; font-weight: 600; }
.poster-dlg__close {
  background: none; border: 0; font-size: 22px; cursor: pointer; color: #555;
}
.poster-dlg__body {
  flex: 1; min-height: 0;
  display: grid;
  grid-template-columns: 280px 1fr;
}
.poster-dlg__controls {
  padding: 14px;
  border-right: 1px solid #eee;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 10px;
  background: #fafafa;
}
.poster-dlg__preview {
  padding: 14px;
  overflow: auto;
  background: #2b2b2b;
}
.ctl { display: flex; flex-direction: column; font-size: 12px; color: #444; gap: 4px; }
.ctl--check { border: 0; padding: 0; margin: 0; }
.ctl--check legend { font-size: 12px; color: #444; padding: 0 0 4px 0; }
.ctl--check label { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.ctl input, .ctl select { padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 13px; }
.muted { opacity: 0.65; }
.actions { display: flex; gap: 8px; margin-top: auto; }
.btn { padding: 8px 12px; border-radius: 4px; border: 1px solid #ccc; cursor: pointer; font-size: 13px; }
.btn--primary { background: #2266dd; color: #fff; border-color: #2266dd; }
.btn--primary:disabled { background: #88aae0; cursor: progress; }
.btn--ghost { background: transparent; }
.render-status { display: flex; flex-direction: column; gap: 6px; padding: 8px; background: #fff; border: 1px solid #eee; border-radius: 4px; font-size: 12px; }
.render-status progress { width: 100%; }
.poster-dlg-enter-active, .poster-dlg-leave-active { transition: opacity 0.15s ease; }
.poster-dlg-enter-from, .poster-dlg-leave-to { opacity: 0; }
</style>
