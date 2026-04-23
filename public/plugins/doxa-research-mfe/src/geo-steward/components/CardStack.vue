<script setup>
/**
 * CardStack — vertical stack of CardFlip-like sections used to compose a
 * multi-step workflow. Each child is one card; only one is "active" at a
 * time. Provide() exposes activation context to children.
 *
 * @example
 *   <CardStack v-model:active="step">
 *     <CardFlip v-model:flipped="..."> ... </CardFlip>
 *     <CardFlip ...> ... </CardFlip>
 *   </CardStack>
 */
import { provide, computed, useSlots } from 'vue';

const props = defineProps({
  active: { type: Number, default: 0 },
  spacing: { type: String, default: '1rem' },
});
const emit = defineEmits(['update:active']);

const slots = useSlots();
const total = computed(() => slots.default ? slots.default().length : 0);

function activate(idx) {
  if (idx < 0 || idx >= total.value) return;
  emit('update:active', idx);
}

provide('cardStack', {
  active:   computed(() => props.active),
  total,
  activate,
});
</script>

<template>
  <div class="cardstack" :style="{ gap: spacing }">
    <slot />
  </div>
</template>

<style scoped>
.cardstack {
  display: flex;
  flex-direction: column;
}
</style>
