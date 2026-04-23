<script setup>
/**
 * TilesetStatus — shows tileset build / upload status and progress.
 * Pure UI. Pair with useTilesetManager for state.
 */
const props = defineProps({
  status:  { type: String, default: 'idle' },     // 'idle' | 'uploading' | 'building' | 'ready' | 'error'
  progress:{ type: Number, default: null },       // 0..1
  message: { type: String, default: '' },
  tilesetId:{ type: String, default: '' },
});
</script>

<template>
  <div class="tileset-status" :data-status="status">
    <div class="tileset-status__row">
      <span class="tileset-status__dot" />
      <span class="tileset-status__label">{{ status }}</span>
      <span v-if="tilesetId" class="tileset-status__id">{{ tilesetId }}</span>
    </div>
    <div v-if="progress !== null" class="tileset-status__bar">
      <div class="tileset-status__fill" :style="{ width: (progress*100)+'%' }" />
    </div>
    <p v-if="message" class="tileset-status__msg">{{ message }}</p>
  </div>
</template>

<style scoped>
.tileset-status { padding: .5rem .75rem; border: 1px solid #e5e7eb; border-radius: 4px; }
.tileset-status__row { display:flex; align-items:center; gap:.5rem; }
.tileset-status__dot { width:8px; height:8px; border-radius:50%; background:#9ca3af; }
[data-status="uploading"] .tileset-status__dot { background:#f59e0b; }
[data-status="building"]  .tileset-status__dot { background:#3b82f6; animation: pulse 1.2s infinite; }
[data-status="ready"]     .tileset-status__dot { background:#10b981; }
[data-status="error"]     .tileset-status__dot { background:#ef4444; }
.tileset-status__label { text-transform: capitalize; font-weight: 600; font-size: .875rem; }
.tileset-status__id    { font-family: monospace; font-size: .75rem; color: #6b7280; margin-left:auto; }
.tileset-status__bar { height:4px; background:#f3f4f6; border-radius:2px; margin-top:.5rem; overflow:hidden; }
.tileset-status__fill { height:100%; background:#3b82f6; transition: width 200ms; }
.tileset-status__msg { font-size: .75rem; color:#6b7280; margin:.25rem 0 0; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
</style>
