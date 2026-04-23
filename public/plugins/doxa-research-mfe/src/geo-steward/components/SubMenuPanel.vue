<script setup>
/**
 * SubMenuPanel — resizable, dismissable side panel that anchors next to
 * the SideMenu. Extracted from
 * `vue-geo-steward/src/components/layout/submenu.js`. Stripped of all
 * Pinia/dialog coupling — it is now a pure visual container with a
 * single default slot.
 *
 * Props:
 *   visible  (Boolean)        — show / hide
 *   title    (String)         — header label
 *   position ({x,y})          — top-left in px
 *   width    (Number, px)     — initial width (also persisted to LS)
 *   storageKey (String)       — localStorage key for width persistence
 *
 * Emits:
 *   close — user clicked × or pressed Escape
 *
 * Slots:
 *   default — panel body
 *   header  — optional custom header (overrides title)
 */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  visible:    { type: Boolean, default: false },
  title:      { type: String,  default: '' },
  position:   { type: Object,  default: () => ({ x: 64, y: 0 }) },
  width:      { type: Number,  default: 350 },
  storageKey: { type: String,  default: 'gs-submenu-width' },
});
const emit = defineEmits(['close']);

const panelRef = ref(null);
const panelWidth = ref(props.width);
const isResizing = ref(false);

onMounted(() => {
  const saved = parseInt(localStorage.getItem(props.storageKey) || '', 10);
  if (!Number.isNaN(saved)) panelWidth.value = Math.max(240, Math.min(2000, saved));
  document.addEventListener('keydown', onEscape);
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onEscape);
});

const panelStyle = computed(() => ({
  left:   props.position.x + 'px',
  top:    props.position.y + 'px',
  width:  panelWidth.value + 'px',
  height: `calc(100% - ${props.position.y}px)`,
}));

function onEscape(e) {
  if (e.key === 'Escape' && props.visible && !isResizing.value) emit('close');
}

function startResize(e) {
  e.preventDefault();
  isResizing.value = true;
  const startX = e.clientX;
  const startW = panelWidth.value;
  const onMove = (m) => {
    const w = Math.max(240, Math.min(2000, startW + (m.clientX - startX)));
    panelWidth.value = w;
    localStorage.setItem(props.storageKey, String(w));
  };
  const onUp = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
</script>

<template>
  <aside
    v-if="visible"
    ref="panelRef"
    class="gs-submenu"
    :class="{ 'is-resizing': isResizing }"
    :style="panelStyle"
  >
    <header class="gs-submenu__header">
      <slot name="header">
        <h3 class="gs-submenu__title">{{ title }}</h3>
      </slot>
      <button
        type="button"
        class="gs-submenu__close"
        aria-label="Close"
        @click="emit('close')"
      >&times;</button>
    </header>
    <div class="gs-submenu__body">
      <slot />
    </div>
    <span class="gs-submenu__resize" @mousedown="startResize" />
  </aside>
</template>

<style scoped>
.gs-submenu {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--gs-panel-bg, #ffffff);
  color: var(--gs-panel-fg, #111827);
  border-right: 1px solid var(--gs-panel-border, #e5e7eb);
  box-shadow: 4px 0 12px rgba(0,0,0,.08);
  z-index: 210;
  overflow: hidden;
}
.gs-submenu.is-resizing { user-select: none; }
.gs-submenu__header {
  display: flex; align-items: center; gap: .5rem;
  padding: .5rem .75rem;
  background: var(--gs-panel-header-bg, #f1f5f9);
  border-bottom: 1px solid var(--gs-panel-border, #e5e7eb);
}
.gs-submenu__title { margin: 0; font-size: .9rem; font-weight: 600; flex: 1; }
.gs-submenu__close {
  background: none; border: none; cursor: pointer;
  font-size: 1.25rem; line-height: 1; color: inherit;
}
.gs-submenu__body { flex: 1; overflow: auto; padding: .75rem; }
.gs-submenu__resize {
  position: absolute; top: 0; right: 0;
  width: 6px; height: 100%; cursor: col-resize;
  background: transparent;
}
.gs-submenu__resize:hover { background: var(--gs-resize-hover, rgba(56,189,248,.3)); }
</style>
