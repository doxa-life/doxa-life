<script setup lang="ts">
// doxa.life/doxa-maps — the DOXA maps SPA (every map, one app).
//
// Frames the bundler's single-page app (the app-wrapper shell) from the
// drop-in at public/js/doxa-maps-build/ — every map, table and dashboard the
// bundler ships, composed into one lazy-loaded app, always exactly as current
// as the build in this repo. Pointed to from the research page
// ("See all DOXA maps →").
//
// TOKEN: one spot, no new endpoints. The shell's own ladder accepts ?tk= (rung
// 2), so we pass the SAME public.mapboxToken every map page on this site
// already uses (NUXT_PUBLIC_MAPBOX_TOKEN).
const config = useRuntimeConfig()
const frameSrc = computed(() => {
  const tk = (config.public as { mapboxToken?: string }).mapboxToken || ''
  return '/js/doxa-maps-build/index.html' + (tk ? `?tk=${encodeURIComponent(tk)}` : '')
})
useHead({
  title: 'All DOXA Maps',
  meta: [{ name: 'robots', content: 'noindex' }],
})
</script>

<template>
  <div class="maps-room">
    <iframe
      :src="frameSrc"
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
