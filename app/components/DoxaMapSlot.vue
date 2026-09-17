<script setup lang="ts">
interface Props {
  mapId: string
  profileConfig: string
  /** Which IIFE bundle to load. Defaults to 'simple-map' to preserve
   *  existing call-sites (home, pray, adopt). Pass 'research-map' on the
   *  research page to load the 5-tab research-mfe bundle instead. */
  bundle?: 'simple-map' | 'research-map'
}

const props = withDefaults(defineProps<Props>(), { bundle: 'simple-map' })

useDoxaMap(props.bundle)

/* Each bundle registers a DIFFERENT custom element name so both IIFEs can
 * coexist on the same SPA. customElements.define() is one-shot per tag,
 * and a stale registration from a previously visited page cannot be
 * overwritten by the next one. Using a distinct tag per bundle eliminates
 * the "Profile not found" error that occurred when /research had loaded
 * its IIFE first and then the user navigated to /, /pray, or /adopt. */
const tagName = props.bundle === 'research-map' ? 'doxa-research-map' : 'doxa-map'
const isSimple = props.bundle === 'simple-map'
</script>

<template>
  <div class="doxa-map-slot">
    <component :is="tagName" :id="mapId" :profile-config="profileConfig" />
    <div v-if="isSimple" class="doxa-map-scroll-pad doxa-map-scroll-pad--top" />
    <slot />
  </div>
</template>

<style scoped>
.doxa-map-slot {
  display: block;
  position: relative;
  width: 100%;
  min-height: 780px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  /* Rounded clip that cannot race the compositor. `overflow: hidden` + `border-radius`
     alone is applied to a COMPOSITED child (the WebGL canvas, an iframe) only once
     Chrome has built a mask layer for it — so on a real GPU the map showed square
     corners until it loaded, then rounded ones (reported on /research, 2026-09-16).
     clip-path is applied at paint time regardless of compositing. The radius follows
     the host page's utility class on this element (rounded-md / rounded-xlg). */
  --slot-radius: 0px;
  clip-path: inset(0 round var(--slot-radius));
  isolation: isolate;
  /* Own compositor layer from the first frame: the rounded clip is then applied on the
     compositor side before the WebGL canvas ever arrives (Chrome, real GPU). */
  will-change: transform;
  transform: translateZ(0);
}
.doxa-map-slot.rounded-md  { --slot-radius: var(--border-radius-lg); }
.doxa-map-slot.rounded-xlg { --slot-radius: var(--border-radius-xlg); }

@media (max-width: 768px) {
  .doxa-map-slot {
    min-height: 0;
    /* Phone height: twice as tall as wide (~734px on a 390px phone) — 80px more map than the
       9/16 it replaced, with room for the search band, the toolbar and the legend sheet. The
       cap keeps the map inside one screen so the page below it stays reachable. */
    aspect-ratio: 1 / 2;
    max-height: 90svh;
  }
}

.doxa-map-slot :deep(doxa-map),
.doxa-map-slot :deep(doxa-research-map) {
  display: block;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* Inherit any border-radius the host page gave the slot (e.g. .rounded-md /
     .rounded-xlg on the research page). Without this, the bare custom element
     paints a rectangular background during the brief window between page
     render and IIFE registration / first map paint, producing the
     "square corners flash to rounded corners" flicker reported 2026-05-04.
     contain:paint forces a new paint-containment layer so any WebGL canvas
     or shadow-DOM content inside the host is clipped to the rounded box
     even before the inner Mapbox canvas finishes its first frame — without
     contain:paint some browsers paint the canvas past the rounded clip
     until the next composited repaint. */
  border-radius: inherit;
  overflow: hidden;
  contain: paint;
}

.doxa-map-scroll-pad {
  display: none;
}

@media (max-width: 768px) {
  .doxa-map-scroll-pad {
    display: block;
    position: absolute;
    left: 0;
    right: 0;
    height: 48px;
    z-index: 1500;
    touch-action: pan-y;
    pointer-events: auto;
  }
  .doxa-map-scroll-pad--top { top: 0; }
}

.doxa-map-slot :deep(doxa-map:fullscreen),
.doxa-map-slot :deep(doxa-map:-webkit-full-screen),
.doxa-map-slot :deep(doxa-research-map:fullscreen),
.doxa-map-slot :deep(doxa-research-map:-webkit-full-screen) {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
}
</style>
