<script setup>
/**
 * ScanUploader — drag-and-drop image uploader with thumbnail grid.
 * Extracted from
 * `vue-geo-steward/src/components/dialogs/stewardship-scans-dialog.js`.
 * The store-write side-effect is removed; new scans are emitted to the
 * parent which decides where to persist them.
 *
 * Props:
 *   scans       ({ id, base64, filename }[])  — already-saved scans
 *   accept      (String)                      — file input `accept`
 *   multiple    (Boolean)
 *
 * Emits:
 *   add         — { filename, base64 } for each uploaded file
 *   remove      — { id } for a deleted scan
 *   open        — { id } when a thumbnail is clicked (full-screen view)
 */
import { ref } from 'vue';

const props = defineProps({
  scans:    { type: Array,   default: () => [] },
  accept:   { type: String,  default: 'image/*' },
  multiple: { type: Boolean, default: true },
});
const emit = defineEmits(['add', 'remove', 'open']);

const fileInput = ref(null);
const dragActive = ref(false);

function pick() { fileInput.value?.click(); }

function onChange(e) {
  const files = e.target.files;
  if (files?.length) ingest(files);
  e.target.value = '';
}

function onDrop(e) {
  e.preventDefault();
  dragActive.value = false;
  const files = e.dataTransfer?.files;
  if (files?.length) ingest(files);
}

function ingest(fileList) {
  Array.from(fileList).forEach((file) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => emit('add', { filename: file.name, base64: ev.target.result });
    reader.readAsDataURL(file);
  });
}
</script>

<template>
  <div class="gs-scan-uploader">
    <div
      class="gs-scan-uploader__drop"
      :class="{ 'is-active': dragActive }"
      @dragenter.prevent="dragActive = true"
      @dragover.prevent
      @dragleave.prevent="dragActive = false"
      @drop="onDrop"
      @click="pick"
    >
      <p class="gs-scan-uploader__hint">
        Drop images here or <span class="gs-scan-uploader__link">browse</span>
      </p>
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        :multiple="multiple"
        hidden
        @change="onChange"
      />
    </div>

    <ul v-if="scans.length" class="gs-scan-uploader__grid">
      <li
        v-for="s in scans"
        :key="s.id"
        class="gs-scan-uploader__thumb"
        @click="emit('open', { id: s.id })"
      >
        <img :src="s.base64" :alt="s.filename" />
        <button
          type="button"
          class="gs-scan-uploader__remove"
          aria-label="Remove"
          @click.stop="emit('remove', { id: s.id })"
        >&times;</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.gs-scan-uploader { display: flex; flex-direction: column; gap: .75rem; }
.gs-scan-uploader__drop {
  border: 2px dashed var(--gs-drop-border, #cbd5e1);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  background: var(--gs-drop-bg, #f8fafc);
  transition: background 150ms, border-color 150ms;
}
.gs-scan-uploader__drop.is-active {
  border-color: var(--gs-drop-active, #38bdf8);
  background:   var(--gs-drop-active-bg, #e0f2fe);
}
.gs-scan-uploader__hint { margin: 0; color: var(--gs-muted, #475569); font-size: .9rem; }
.gs-scan-uploader__link { color: var(--gs-link, #0369a1); text-decoration: underline; }
.gs-scan-uploader__grid {
  list-style: none; margin: 0; padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: .5rem;
}
.gs-scan-uploader__thumb {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--gs-thumb-border, #e5e7eb);
  cursor: pointer;
}
.gs-scan-uploader__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.gs-scan-uploader__remove {
  position: absolute; top: 2px; right: 2px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(0,0,0,.6);
  color: #fff; border: none; cursor: pointer;
  font-size: 14px; line-height: 1;
}
</style>
