<script setup>
/**
 * TilesetPopup — small popup card that displays a tileset feature's
 * properties at a screen position. Ported from
 * `vue-geo-steward/src/components/mapbox/tileset-popup.js`.
 *
 * Props:
 *   visible            (Boolean)
 *   position           ({x, y})       — screen px, top-left of popup
 *   featureProperties  (Object)       — key/value pairs to render
 *   tilesetData        (Object)       — { name, id, ... }
 *   attributeDefinitions (Object)     — optional key→help-text dictionary
 *
 * Emits:
 *   close
 */
import { computed } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  position: { type: Object, default: () => ({ x: 0, y: 0 }) },
  featureProperties: { type: Object, default: () => ({}) },
  tilesetData: { type: Object, default: () => ({}) },
  attributeDefinitions: { type: Object, default: () => ({}) },
});
const emit = defineEmits(['close']);

const style = computed(() => ({
  left: props.position.x + 'px',
  top:  props.position.y + 'px',
}));

const entries = computed(() =>
  Object.entries(props.featureProperties || {}).filter(([, v]) => v !== null && v !== undefined));
</script>

<template>
  <div v-if="visible" class="gs-tileset-popup" :style="style" role="dialog">
    <header class="gs-tileset-popup__header">
      <span class="gs-tileset-popup__title">
        {{ tilesetData.name || 'Tileset feature' }}
      </span>
      <button
        type="button"
        class="gs-tileset-popup__close"
        aria-label="Close"
        @click="emit('close')"
      >&times;</button>
    </header>
    <div class="gs-tileset-popup__body">
      <div v-if="entries.length === 0" class="gs-tileset-popup__empty">
        No properties available.
      </div>
      <dl v-else class="gs-tileset-popup__props">
        <template v-for="[key, value] in entries" :key="key">
          <dt :title="attributeDefinitions[key] || ''">{{ key }}</dt>
          <dd>{{ value }}</dd>
        </template>
      </dl>
    </div>
  </div>
</template>

<style scoped>
.gs-tileset-popup {
  position: fixed;
  min-width: 280px;
  max-width: 360px;
  max-height: 360px;
  display: flex;
  flex-direction: column;
  background: var(--gs-popup-bg, rgba(20,20,20,.96));
  color:      var(--gs-popup-fg, #f8fafc);
  border: 1px solid var(--gs-popup-border, rgba(56,189,248,.4));
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,.5);
  z-index: 10001;
  font-size: .85rem;
}
.gs-tileset-popup__header {
  display: flex; align-items: center;
  padding: .4rem .6rem;
  border-bottom: 1px solid var(--gs-popup-border, rgba(56,189,248,.25));
}
.gs-tileset-popup__title { flex: 1; font-weight: 600; }
.gs-tileset-popup__close {
  background: none; border: none; color: inherit; cursor: pointer;
  font-size: 1.1rem; line-height: 1;
}
.gs-tileset-popup__body { overflow: auto; padding: .5rem .6rem; }
.gs-tileset-popup__empty { color: var(--gs-muted, #94a3b8); font-style: italic; }
.gs-tileset-popup__props {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: .25rem .75rem;
  margin: 0;
}
.gs-tileset-popup__props dt { color: var(--gs-popup-key, #38bdf8); cursor: help; }
.gs-tileset-popup__props dd { margin: 0; word-break: break-word; }
</style>
