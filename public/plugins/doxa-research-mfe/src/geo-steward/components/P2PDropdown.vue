<script setup>
/**
 * P2PDropdown — searchable parent-picker dropdown.
 * Extracted from `vue-geo-steward/src/components/ui/p2p-dropdown.js`.
 * Strips Pinia coupling: parent items + currently-selected children
 * arrive as props, the chosen parent is emitted.
 *
 * Props:
 *   parents     ({ id, name }[])  — selectable parents
 *   selectedId  (String|Number)   — current parent id (v-model)
 *   placeholder (String)
 *   excludeIds  (Array)           — ids to filter out
 *
 * Emits:
 *   update:selectedId
 *   change — { id, item }
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  parents:     { type: Array, required: true },
  placeholder: { type: String, default: 'Select parent…' },
  excludeIds:  { type: Array, default: () => [] },
});
const selectedId = defineModel('selectedId', { type: [String, Number, null], default: null });
const emit = defineEmits(['change']);

const isOpen = ref(false);
const query  = ref('');
const wrapperRef = ref(null);

const excludeSet = computed(() => new Set(props.excludeIds));

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return props.parents.filter((p) => {
    if (excludeSet.value.has(p.id)) return false;
    if (!q) return true;
    return (p.name || '').toLowerCase().includes(q);
  });
});

const selectedItem = computed(() =>
  props.parents.find((p) => p.id === selectedId.value) || null);

function pick(item) {
  selectedId.value = item.id;
  isOpen.value = false;
  query.value = '';
  emit('change', { id: item.id, item });
}

function clear() {
  selectedId.value = null;
  emit('change', { id: null, item: null });
}

function onDocClick(e) {
  if (!isOpen.value) return;
  if (wrapperRef.value && !wrapperRef.value.contains(e.target)) isOpen.value = false;
}
onMounted(() => document.addEventListener('mousedown', onDocClick));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick));
</script>

<template>
  <div ref="wrapperRef" class="gs-p2p">
    <button type="button" class="gs-p2p__trigger" @click="isOpen = !isOpen">
      <span v-if="selectedItem" class="gs-p2p__selected">{{ selectedItem.name }}</span>
      <span v-else class="gs-p2p__placeholder">{{ placeholder }}</span>
      <span class="gs-p2p__caret">▾</span>
    </button>
    <div v-if="isOpen" class="gs-p2p__menu" role="listbox">
      <input
        v-model="query"
        type="search"
        class="gs-p2p__search"
        placeholder="Search…"
      />
      <ul class="gs-p2p__list">
        <li v-if="filtered.length === 0" class="gs-p2p__empty">No matches</li>
        <li
          v-for="p in filtered"
          :key="p.id"
          class="gs-p2p__item"
          :class="{ 'is-selected': p.id === selectedId }"
          role="option"
          @click="pick(p)"
        >{{ p.name }}</li>
      </ul>
      <button v-if="selectedItem" type="button" class="gs-p2p__clear" @click="clear">Clear</button>
    </div>
  </div>
</template>

<style scoped>
.gs-p2p { position: relative; display: inline-block; min-width: 220px; }
.gs-p2p__trigger {
  display: flex; align-items: center; gap: .5rem;
  width: 100%; padding: .4rem .6rem;
  background: var(--gs-input-bg, #ffffff);
  border: 1px solid var(--gs-input-border, #d1d5db);
  border-radius: 6px;
  cursor: pointer;
  font-size: .85rem;
  color: inherit;
  text-align: left;
}
.gs-p2p__placeholder { color: var(--gs-muted, #9ca3af); }
.gs-p2p__caret       { margin-left: auto; color: var(--gs-muted, #6b7280); }
.gs-p2p__menu {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--gs-menu-bg, #ffffff);
  border: 1px solid var(--gs-menu-border, #e5e7eb);
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0,0,0,.12);
  z-index: 1100;
  display: flex; flex-direction: column;
  max-height: 320px;
}
.gs-p2p__search {
  margin: 6px; padding: .35rem .5rem;
  border: 1px solid var(--gs-input-border, #e5e7eb);
  border-radius: 4px;
  font-size: .85rem;
}
.gs-p2p__list { list-style: none; margin: 0; padding: 0; overflow: auto; flex: 1; }
.gs-p2p__item { padding: .35rem .6rem; cursor: pointer; font-size: .85rem; }
.gs-p2p__item:hover, .gs-p2p__item.is-selected {
  background: var(--gs-result-hover, #e0f2fe);
}
.gs-p2p__empty { padding: .5rem .6rem; color: var(--gs-muted, #6b7280); font-style: italic; }
.gs-p2p__clear {
  margin: 4px 6px; padding: .25rem .4rem;
  background: none; border: 1px solid var(--gs-input-border, #e5e7eb);
  border-radius: 4px; cursor: pointer; font-size: .75rem;
}
</style>
