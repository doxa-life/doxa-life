<script setup>
/**
 * CardFlip — 3D flip card with #front and #back named slots.
 *
 * Stateless / slot-driven. v-model:flipped binds the controlled state.
 * No external CSS, no theme variables — colors and sizes are owned by the
 * surrounding profile or workflow.
 *
 * @example
 *   <CardFlip v-model:flipped="isFlipped">
 *     <template #front>...</template>
 *     <template #back>...</template>
 *   </CardFlip>
 */
import { computed, ref } from 'vue';

const props = defineProps({
  flipped:     { type: Boolean, default: undefined },
  duration:    { type: Number,  default: 600 },
  perspective: { type: Number,  default: 800 },
  disabled:    { type: Boolean, default: false },
});

const emit = defineEmits(['update:flipped', 'flip']);

const internalFlipped = ref(false);
const isFlipped = computed({
  get: () => (props.flipped !== undefined ? props.flipped : internalFlipped.value),
  set: (v) => {
    if (props.flipped !== undefined) emit('update:flipped', v);
    else internalFlipped.value = v;
  },
});

function toggle() {
  if (props.disabled) return;
  isFlipped.value = !isFlipped.value;
}
function onTransitionEnd() {
  emit('flip', isFlipped.value);
}

defineExpose({ toggle });
</script>

<template>
  <div class="cardflip" :style="{ perspective: perspective + 'px' }" @click="toggle">
    <div
      class="cardflip__inner"
      :class="{ 'is-flipped': isFlipped }"
      :style="{ transitionDuration: duration + 'ms' }"
      @transitionend.self="onTransitionEnd"
    >
      <div class="cardflip__face cardflip__face--front">
        <slot name="front" />
      </div>
      <div class="cardflip__face cardflip__face--back">
        <slot name="back" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.cardflip {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.cardflip__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform var(--cardflip-easing, cubic-bezier(.2, .8, .2, 1));
}
.cardflip__inner.is-flipped {
  transform: rotateY(180deg);
}
.cardflip__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}
.cardflip__face--back {
  transform: rotateY(180deg);
}
</style>
