<script setup>
/**
 * MapToolbarButton — shared base for the round/square map-overlay buttons
 * (delete, batch-select, etc.) used by the original
 * `vue-geo-steward/src/components/mapbox/*-button.js` files.
 *
 * Pure visual: no map injection, no stores. Caller wires `@click`
 * and toggles `active` / `disabled` props from outside.
 *
 * Props:
 *   icon     (String)  — html / unicode glyph
 *   label    (String)  — short caption (under icon)
 *   title    (String)  — tooltip
 *   active   (Boolean) — highlighted "on" state
 *   disabled (Boolean) — non-interactive
 *   variant  (String)  — 'default' | 'danger' | 'info'
 *
 * Emits:
 *   click — native click
 */
defineProps({
  icon:     { type: String, default: '' },
  label:    { type: String, default: '' },
  title:    { type: String, default: '' },
  active:   { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  variant:  { type: String, default: 'default' },
});
const emit = defineEmits(['click']);
</script>

<template>
  <button
    type="button"
    class="gs-tbtn"
    :class="[`gs-tbtn--${variant}`, { 'is-active': active, 'is-disabled': disabled }]"
    :disabled="disabled"
    :title="title"
    @click="emit('click', $event)"
  >
    <span v-if="icon" class="gs-tbtn__icon" v-html="icon" />
    <span v-if="label" class="gs-tbtn__label">{{ label }}</span>
    <slot />
  </button>
</template>

<style scoped>
.gs-tbtn {
  width: 44px;
  height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: var(--gs-tbtn-bg, rgba(0,0,0,.85));
  color: var(--gs-tbtn-fg, #ffffff);
  border: 2px solid var(--gs-tbtn-border, rgba(255,255,255,.2));
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 9px;
  user-select: none;
  transition: background 150ms, border-color 150ms, transform 100ms;
}
.gs-tbtn:hover:not(.is-disabled) { transform: translateY(-1px); }
.gs-tbtn.is-active {
  background: var(--gs-tbtn-active-bg, #1e293b);
  border-color: var(--gs-tbtn-active-border, #38bdf8);
}
.gs-tbtn.is-disabled { opacity: .4; cursor: not-allowed; }
.gs-tbtn--danger.is-active { border-color: var(--gs-tbtn-danger, #ef4444); }
.gs-tbtn--info.is-active   { border-color: var(--gs-tbtn-info,   #3b82f6); }
.gs-tbtn__icon  { font-size: 16px; line-height: 1; }
.gs-tbtn__label { font-size: 9px; line-height: 1; letter-spacing: .02em; }
</style>
