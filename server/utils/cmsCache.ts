// Cache-busting for the public CMS page API (`/api/pages/[...slug]`,
// wrapped with defineCachedEventHandler). Call purgeCmsPage() after any
// mutation that changes a page's rendered response so the next request
// re-populates from Postgres.
//
// Scope: current page only — siblings/parent entries stay cached until
// their own TTL expires. Fine for now; a future archive/category
// feature will formalize the tree and give us cleaner invalidation.

import { ENABLED_LANGUAGE_CODES } from '~~/config/languages'

// Key format matches what defineCachedEventHandler writes in
// server/api/pages/[...slug].get.ts. Nitro composes
//   {base}:{group}:{name}:{escapeKey(getKey(event))}.json
// and escapeKey() strips non-word characters, so the handler's getKey
// hex-encodes the slug to stay collision-free. We mirror that here.
const KEY_PREFIX = 'nitro:handlers:cms'

function storageKey(slug: string, locale: string) {
  return `${KEY_PREFIX}:${locale}_${Buffer.from(slug).toString('hex')}.json`
}

export async function purgeCmsPage(slug: string, locales?: string[]) {
  const storage = useStorage('cache')
  const targets = locales ?? ENABLED_LANGUAGE_CODES
  await Promise.all(
    targets.map(locale => storage.removeItem(storageKey(slug, locale)))
  )
}
