<script setup lang="ts">
// doxa.life/maps — the map room (an unlisted easter egg).
//
// Every map the doxa-maps bundler ships, in one place: this page frames the
// bundler's own staging index from the drop-in at public/js/doxa-maps-build/,
// so it is always exactly as current as the build in this repo — no separate
// gallery to maintain. Linked from nowhere on purpose; those who find it,
// find all the maps.
useHead({
  title: 'Maps — DOXA',
  meta: [{ name: 'robots', content: 'noindex' }],
})
</script>

<template>
  <div class="maps-room">
    <iframe
      src="/js/doxa-maps-build/doxa-maps/index.html"
      title="All DOXA maps"
      class="maps-room-frame"
      loading="eager"
      allowfullscreen
    />
  </div>
</template>

<style scoped>
.maps-room {
  /* Full-bleed room: the staging index brings its own chrome. */
  position: fixed;
  inset: 0;
  background: #0a0e15;
}
.maps-room-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}
</style>
