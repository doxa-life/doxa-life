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
</script>

<template>
  <div class="doxa-map-slot">
    <doxa-map :id="mapId" :profile-config="profileConfig" />
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
}

@media (max-width: 768px) {
  .doxa-map-slot {
    min-height: 0;
    aspect-ratio: 1 / 2;
  }
}

doxa-map {
  display: block;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

doxa-map:fullscreen,
doxa-map:-webkit-full-screen {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
}
</style>
