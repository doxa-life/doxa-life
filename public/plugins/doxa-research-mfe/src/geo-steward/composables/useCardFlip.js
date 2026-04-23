/**
 * useCardFlip — Flip-card state + helpers. Used internally by CardFlip.vue
 * but also reusable for pages that build their own flip UI.
 *
 * @example
 *   const { flipped, toggle, flip, unflip } = useCardFlip(false);
 */
import { ref, readonly } from 'vue';

/**
 * @param {boolean} [initial=false]
 */
export function useCardFlip(initial = false) {
  const flipped = ref(!!initial);

  function toggle()  { flipped.value = !flipped.value; }
  function flip()    { flipped.value = true; }
  function unflip()  { flipped.value = false; }

  return {
    flipped: readonly(flipped),
    toggle,
    flip,
    unflip,
  };
}
