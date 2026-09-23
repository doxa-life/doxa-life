<script setup lang="ts">
// Accessible on/off switch styled to match the campaigns-server feedback form.
// Used instead of a checkbox for opt-ins where the control should read as a
// preference rather than a form field. The label is rendered by the caller and
// wired up through `label-id` so it stays part of the surrounding copy flow.

const model = defineModel<boolean>({ default: false })

defineProps<{
  /** id of the element labelling this switch, for `aria-labelledby`. */
  labelId?: string
}>()
</script>

<template>
  <button
    type="button"
    role="switch"
    class="toggle-switch"
    :class="{ 'is-on': model }"
    :aria-checked="model"
    :aria-labelledby="labelId"
    @click="model = !model"
  >
    <span class="toggle-switch__thumb" />
  </button>
</template>

<style scoped>
.toggle-switch {
  --toggle-width: 2.75rem;
  --toggle-height: 1.5rem;
  --toggle-padding: 0.2rem;
  flex: none;
  display: inline-flex;
  align-items: center;
  width: var(--toggle-width);
  height: var(--toggle-height);
  padding: var(--toggle-padding);
  border: none;
  border-radius: 100px;
  background-color: var(--color-brand-secondary);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.toggle-switch.is-on {
  background-color: var(--color-brand-primary);
}

.toggle-switch:focus-visible {
  outline: max(1px, 0.1em) solid var(--color-brand-dark);
  outline-offset: 2px;
}

.toggle-switch__thumb {
  width: calc(var(--toggle-height) - (2 * var(--toggle-padding)));
  height: calc(var(--toggle-height) - (2 * var(--toggle-padding)));
  border-radius: 50%;
  background-color: var(--color-surface-white);
  transition: transform 0.2s ease;
}

.toggle-switch.is-on .toggle-switch__thumb {
  transform: translateX(calc(var(--toggle-width) - var(--toggle-height)));
}

/* The thumb travels the other way in RTL, where the track is mirrored. */
[dir="rtl"] .toggle-switch.is-on .toggle-switch__thumb {
  transform: translateX(calc((var(--toggle-width) - var(--toggle-height)) * -1));
}
</style>
