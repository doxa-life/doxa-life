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

  Props:
    has-geocoder (Boolean, default true) — whether a geocoder/search pill is
    rendered above the toolbar on mobile. When false, the mobile top offset
    collapses to the same 10px used on desktop (no wasted space above the
    first control button). Default preserves the legacy mobile layout for
    profiles that DO mount a geocoder.
-->
<script setup>
import { useShadowStyles } from '../../composables/useShadowStyles.js'

defineProps({
  hasGeocoder: { type: Boolean, default: true },
})

useShadowStyles(`
.map-toolbar {
  position: absolute;
  top: 6px;
  /* Sit the control column near the edge with a small symmetric padding (3px) —
     same value works whether the toolbar is swapped to the left or right side, and
     it lines up with the search bar's 3px side inset. coder 2026-06-24. */
  right: 3px;
  display: flex;
  flex-direction: column;
  gap: var(--map-toolbar-gap, 8px);
  z-index: 10;
}
/* Slim every toolbar control to a fixed 32px (coder 2026-06-24: "buttons can be
   smaller"): smaller but still tappable, and uniform so they all align. The icons
   inside stay their own fixed px sizes (they don't scale with the button), so they
   remain legible — "icons fixed in their sizing". Caps the responsive
   --map-btn-size (40/36/32). FullscreenButton.vue is not edited; it slims here too. */
.map-toolbar .mcb,
.map-toolbar .hbg-btn { width: 32px; height: 32px; }
.map-toolbar .hbg-ctrl { margin: 10px 0 0 0; }  /* drop the 6px left offset so it lines up with the rest */
@media (max-width: 767px) {
  /* Mobile (with geocoder): drop the toolbar well below the search bar so
     it doesn't sit flush against the search pill. Search = top:10,
     height ~36, bottom:46. top:80 leaves a comfortable ~34px gap. */
  .map-toolbar { top: 72px; gap: 6px; }
  /* Mobile (no geocoder): collapse the reserved gap — controls sit flush
     to the top of the map area with the same 6px inset used on desktop. */
  .map-toolbar.map-toolbar--no-geocoder { top: 6px; gap: 6px; }
}
`, 'map-toolbar')
</script>

<template>
  <div class="map-toolbar" :class="{ 'map-toolbar--no-geocoder': !hasGeocoder }">
    <slot />
  </div>
</template>