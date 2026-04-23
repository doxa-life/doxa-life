<script setup>
/**
 * SideMenu — vertical icon rail that emits item-click events.
 * Extracted from `vue-geo-steward/src/components/layout/sidemenu.js`
 * (which was ~2200 lines of Pinia + dialog wiring). This shell only
 * keeps the slanted-rail visual + activation state, and exposes
 * `items` as a prop so the host app drives behavior.
 *
 * Props:
 *   items     ({ id, label, icon }[]) — rail items
 *   activeId  (String)                — currently-active item id
 *   width     (Number, px)            — fixed rail width
 *
 * Emits:
 *   select — id of clicked item
 */
import { ref, watch } from 'vue';

const props = defineProps({
  items:    { type: Array, required: true },
  activeId: { type: String, default: null },
  width:    { type: Number, default: 64 },
});
const emit = defineEmits(['select']);

const internalActive = ref(props.activeId);
watch(() => props.activeId, (v) => { internalActive.value = v; });

function pick(id) {
  internalActive.value = id;
  emit('select', id);
}
</script>

<template>
  <nav
    class="gs-sidemenu"
    :style="{ width: width + 'px' }"
    aria-label="Geo Steward navigation"
  >
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="gs-sidemenu__item"
      :class="{ 'is-active': internalActive === item.id }"
      :title="item.label"
      @click="pick(item.id)"
    >
      <span v-if="item.icon" class="gs-sidemenu__icon" v-html="item.icon" />
      <span class="gs-sidemenu__label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.gs-sidemenu {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 4px;
  background: var(--gs-side-bg, #0f172a);
  color: var(--gs-side-fg, #cbd5e1);
  height: 100%;
  overflow-y: auto;
}
.gs-sidemenu__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: inherit;
  cursor: pointer;
  font-size: 10px;
  transition: background 150ms, border-color 150ms;
}
.gs-sidemenu__item:hover {
  background: var(--gs-side-hover, rgba(255,255,255,.06));
  border-color: var(--gs-side-border, rgba(255,255,255,.12));
}
.gs-sidemenu__item.is-active {
  background: var(--gs-side-active, #1e293b);
  border-color: var(--gs-side-active-border, #38bdf8);
  color: var(--gs-side-active-fg, #f8fafc);
}
.gs-sidemenu__icon { font-size: 18px; }
.gs-sidemenu__label { font-size: 10px; }
</style>
