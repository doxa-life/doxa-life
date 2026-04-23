<script setup>
/**
 * LayersMenuButton — opens a layers/tilesets menu (slot-driven).
 * Extracted from `vue-geo-steward/src/components/mapbox/layers-button.js`.
 * Acts as a popover trigger: parent provides menu content via slot.
 *
 * Props:
 *   open  (Boolean) — externally-controlled open state (v-model:open)
 *   label (String)
 *
 * Slots:
 *   menu — popover panel content
 *
 * Emits:
 *   update:open
 */
import { onMounted, onBeforeUnmount, ref } from 'vue';
import MapToolbarButton from './MapToolbarButton.vue';

const open  = defineModel('open', { type: Boolean, default: false });
defineProps({
  label: { type: String, default: 'Layers' },
});

const wrapperRef = ref(null);

function toggle() { open.value = !open.value; }

function onDocClick(e) {
  if (!open.value) return;
  if (wrapperRef.value && !wrapperRef.value.contains(e.target)) open.value = false;
}
onMounted(() => document.addEventListener('mousedown', onDocClick));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick));
</script>

<template>
  <div ref="wrapperRef" class="gs-layers-wrap">
    <MapToolbarButton
      icon="≡"
      :label="label"
      title="Layers"
      :active="open"
      @click="toggle"
    />
    <div v-if="open" class="gs-layers-menu" role="menu">
      <slot name="menu">
        <div class="gs-layers-menu__empty">No layers configured.</div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.gs-layers-wrap { position: relative; display: inline-block; }
.gs-layers-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 240px;
  max-height: 60vh;
  overflow: auto;
  background: var(--gs-menu-bg, #ffffff);
  color:      var(--gs-menu-fg, #111827);
  border: 1px solid var(--gs-menu-border, #e5e7eb);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15);
  padding: .5rem;
  z-index: 1100;
}
.gs-layers-menu__empty { padding: .5rem; color: var(--gs-muted, #6b7280); font-size: .85rem; }
</style>
