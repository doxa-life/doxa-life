<!--
  MapToolbar.vue — Positioned layout shell for map control buttons.

  ONLY responsible for the visual column layout
  (position: absolute, flex-direction: column, gap, z-index).

  Contains NO button logic and NO map reference. Exposes a default slot so
  the application profile can place any combination of button components
  inside — each bound explicitly to their own map instance.

  Multi-map usage pattern (two separate maps in one profile):

    MapToolbar > ZoomInButton :map="mapA"  ...
    MapToolbar > ZoomInButton :map="mapB"  ...

  No props required — the slot contents own all state and map bindings.
-->
<script setup>
import { useShadowStyles } from '../../composables/useShadowStyles.js'

useShadowStyles(`
.map-toolbar {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: var(--map-toolbar-gap, 8px);
  z-index: 10;
}
@media (max-width: 767px) {
  /* Mobile: drop the toolbar well below the search bar so it doesn't sit
     flush against the search pill. Search = top:10, height ~36, bottom:46.
     top:80 leaves a comfortable ~34px gap. */
  .map-toolbar { top: 80px; gap: 6px; }
}
`, 'map-toolbar')
</script>

<template>
  <div class="map-toolbar">
    <slot />
  </div>
</template>