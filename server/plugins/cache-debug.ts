// TEMP DEBUG: boot-time log dumping storage mounts + driver names.
// Tells us whether the `cache` mount we configured in nuxt.config.ts
// actually made it into the production Nitro bundle, and which driver
// it wound up using. Delete once the caching mystery is resolved.

export default defineNitroPlugin(async () => {
  try {
    const rootStorage = useStorage()
    const cacheMount = useStorage('cache')

    // `mounts` isn't publicly typed on unstorage but exists at runtime.
    const mounts = (rootStorage as any).getMounts?.() ?? (rootStorage as any).mounts
    const mountInfo = mounts
      ? Object.fromEntries(
          Object.entries(mounts).map(([base, m]: [string, any]) => [
            base || '<root>',
            { driver: m?.driver?.name || m?.name || 'unknown' }
          ])
        )
      : '(mounts introspection unavailable)'

    console.log('[cache-debug] boot — storage mounts:', JSON.stringify(mountInfo, null, 2))

    // Exercise the cache mount to confirm it round-trips.
    const probeKey = '__debug:boot-probe'
    const probeValue = { stamp: Date.now(), marker: 'cache-debug-boot' }
    await cacheMount.setItem(probeKey, probeValue)
    const read = await cacheMount.getItem(probeKey)
    console.log('[cache-debug] round-trip probe:', JSON.stringify({
      wrote: probeValue,
      read,
      match: JSON.stringify(read) === JSON.stringify(probeValue)
    }))
    await cacheMount.removeItem(probeKey)
  } catch (e: any) {
    console.error('[cache-debug] boot plugin failed:', e?.message, e?.stack)
  }
})
