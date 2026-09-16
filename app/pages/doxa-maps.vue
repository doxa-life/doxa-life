<script setup lang="ts">
// doxa.life/doxa-maps — the DOXA maps SPA (every map, one app).
//
// Frames the bundler's single-page app (the app-wrapper shell) from the
// drop-in at public/js/doxa-maps-build/ — every map, table and dashboard the
// bundler ships, composed into one lazy-loaded app, always exactly as current
// as the build in this repo. Pointed to from the research page
// ("See all DOXA maps →"). The shell resolves its Mapbox token from
// ./api/maps/token.json, which this site serves from its own runtime config
// (see server/routes/js/doxa-maps-build/api/maps/token.json.get.ts).
useHead({
  title: 'All DOXA Maps',
  meta: [{ name: 'robots', content: 'noindex' }],
})
</script>

<template>
  <div class="maps-room">
    <iframe
      src="/js/doxa-maps-build/index.html"
      title="The DOXA maps app"
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
