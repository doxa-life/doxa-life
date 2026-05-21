// Purge the Cloudflare edge cache when a fresh container boots — which is what
// every deploy triggers on this platform. The prerendered marketing HTML is
// edge-cached (Cache-Control s-maxage), but it references content-hashed
// /_nuxt assets that the new deploy just replaced. If stale HTML survived in
// the edge it would point at files that no longer exist, so it must be evicted.
//
// Fire-and-forget: a purge failure must never block the server from starting.
//
// Caveat: this also runs on plain restarts / scale-ups, which is harmless (it
// just re-warms the cache). If the app ever enters a crash loop, move the purge
// to a POST_DEPLOY job so the API can't be hammered.
export default defineNitroPlugin(() => {
  // Don't fire during local dev or the build-time prerender pass — only when a
  // real deployed container comes up.
  if (import.meta.dev || import.meta.prerender) return

  const { cfApiToken, cfZoneId } = useRuntimeConfig()
  if (!cfApiToken || !cfZoneId) return

  $fetch(`https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfApiToken}` },
    body: { purge_everything: true }
  })
    .then(() => console.log('[cf-purge] Cloudflare edge cache purged on boot'))
    .catch((err: unknown) => console.error('[cf-purge] purge failed:', err))
})
