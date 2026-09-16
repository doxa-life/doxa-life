// The doxa-maps SPA shell (served from public/js/doxa-maps-build/) resolves its
// Mapbox token from ./api/maps/token.json relative to itself — which is THIS
// route. Serving it from runtime config means the drop-in ships no secret and
// the site's own NUXT_PUBLIC_MAPBOX_TOKEN powers the whole SPA.
export default defineEventHandler((event) => {
  const token = (useRuntimeConfig(event).public as { mapboxToken?: string }).mapboxToken || ''
  return { token, type: token.slice(0, 2) }
})
