// TEMP DEBUG: inspect the Nitro cache storage from a browser/curl.
// Returns keys + a sample entry so we can verify the cached-handler
// actually wrote something and the storage is where we expect.
//
// Usage:
//   GET /api/__cache-debug             → keys only
//   GET /api/__cache-debug?peek=<key>  → dump entry for exact key
//
// Delete this file once the caching mystery is solved.

import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const peek = typeof q.peek === 'string' ? q.peek : null

  const rootStorage = useStorage()
  const cacheMount = useStorage('cache')

  // List everything under both the root mount and the "cache" mount to
  // see how unstorage is routing the defineCachedEventHandler writes.
  const rootKeys = await rootStorage.getKeys('')
  const mountKeys = await cacheMount.getKeys('')

  // Filter to the cms handler's namespace for a quick signal.
  const cmsInRoot = rootKeys.filter(k => k.includes('cms'))
  const cmsInMount = mountKeys.filter(k => k.includes('cms'))

  let peeked: any = null
  if (peek) {
    const fromMount = await cacheMount.getItem(peek)
    const fromRoot = await rootStorage.getItem(peek)
    peeked = {
      key: peek,
      fromMount: summarize(fromMount),
      fromRoot: summarize(fromRoot)
    }
  }

  return {
    now: new Date().toISOString(),
    counts: {
      rootTotal: rootKeys.length,
      cacheMountTotal: mountKeys.length,
      cmsInRoot: cmsInRoot.length,
      cmsInMount: cmsInMount.length
    },
    cmsKeys: {
      inRoot: cmsInRoot.slice(0, 20),
      inMount: cmsInMount.slice(0, 20)
    },
    peeked
  }
})

// Don't dump the full body into logs — a single cache entry can be
// hundreds of KB. Summarize shape + key fields so we can tell if the
// entry is well-formed.
function summarize(v: any) {
  if (v == null) return { present: false }
  if (typeof v !== 'object') return { present: true, type: typeof v, value: v }
  const keys = Object.keys(v)
  const summary: Record<string, any> = { present: true, keys }
  if ('value' in v) {
    summary.valueShape = v.value == null
      ? 'null'
      : typeof v.value === 'object'
        ? Object.keys(v.value)
        : typeof v.value
  }
  if ('mtime' in v) summary.mtime = v.mtime
  if ('integrity' in v) summary.integrity = v.integrity
  if ('expires' in v) summary.expires = v.expires
  return summary
}
