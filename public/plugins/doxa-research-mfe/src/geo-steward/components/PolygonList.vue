<script setup>
/**
 * PolygonList — selectable list of polygons, synchronized with map state.
 * Emits selection changes; parent can drive map highlight from there.
 */
import { computed } from 'vue';

const props = defineProps({
  polygons: { type: Array, required: true },     // [{ id, name, area? }]
  selected: { type: Array, default: () => [] },  // ids
  multi:    { type: Boolean, default: true },
});
const emit = defineEmits(['update:selected', 'hover']);

const selectedSet = computed(() => new Set(props.selected));

function toggle(id) {
  const next = new Set(selectedSet.value);
  if (props.multi) {
    if (next.has(id)) next.delete(id); else next.add(id);
  } else {
    next.clear(); next.add(id);
  }
  emit('update:selected', Array.from(next));
}
</script>

<template>
  <ul class="polygon-list">
    <li
      v-for="p in polygons"
      :key="p.id"
      class="polygon-list__item"
      :class="{ 'is-selected': selectedSet.has(p.id) }"
      @click="toggle(p.id)"
      @mouseenter="emit('hover', p.id)"
      @mouseleave="emit('hover', null)"
    >
      <span class="polygon-list__name">{{ p.name }}</span>
      <span v-if="p.area" class="polygon-list__area">{{ p.area }}</span>
    </li>
  </ul>
</template>

<style scoped>
.polygon-list { list-style: none; margin: 0; padding: 0; max-height: 60vh; overflow: auto; }
.polygon-list__item {
  display: flex; justify-content: space-between; gap: 1rem;
  padding: .5rem .75rem; cursor: pointer;
  border-bottom: 1px solid var(--wf-border, #f1f5f9);
}
.polygon-list__item:hover { background: var(--wf-hover, #f8fafc); }
.polygon-list__item.is-selected { background: var(--wf-sel, #dbeafe); }
.polygon-list__area { font-size: .75rem; color: var(--wf-muted, #6b7280); }
</style>
