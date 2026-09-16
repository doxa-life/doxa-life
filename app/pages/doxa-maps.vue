<script setup lang="ts">
// doxa.life/doxa-maps — the DOXA maps SPA (every map, one app).
//
// Frames the bundler's single-page app (the app-wrapper shell) from the
// drop-in at public/js/doxa-maps-build/ — every map, table and dashboard the
// bundler ships, composed into one lazy-loaded app, always exactly as current
// as the build in this repo. Pointed to from the research page
// ("See all DOXA maps →").
//
// TOKEN: the site's EXISTING endpoint, nothing new. /api/maps/token (see
// server/api/maps/token.get.ts) passes a pk.* through or mints a 1-hour tk.*
// from a secret key — the single source of truth built for embeds like this.
// We fetch it once and hand it to the shell via its native ?tk= rung.
const frameSrc = ref('')
onMounted(async () => {
  let tk = ''
  try {
    const r = await $fetch<{ token?: string }>('/api/maps/token')
    tk = r?.token || ''
  } catch { /* endpoint down → shell falls back to its own ladder */ }
  frameSrc.value = '/js/doxa-maps-build/index.html' + (tk ? `?tk=${encodeURIComponent(tk)}` : '')
})
useHead({
  title: 'All DOXA Maps',
  meta: [{ name: 'robots', content: 'noindex' }],
})
</script>

<template>
  <div class="maps-room">
    <iframe
      v-if="frameSrc"
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
