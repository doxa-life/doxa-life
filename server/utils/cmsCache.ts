// Cache-busting for the public CMS page API (`/api/pages/[...slug]`,
// wrapped with defineCachedEventHandler). Call purgeCmsPage() after any
// mutation that changes a page's rendered response so the next request
// re-populates from Postgres.
//
// Scope: current page only — siblings/parent entries stay cached until
// their own TTL expires. Fine for now; a future archive/category
// feature will formalize the tree and give us cleaner invalidation.

import { ENABLED_LANGUAGE_CODES } from '~~/config/languages'
import { db } from './database'

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

// Purge every page in a category across all locales. Needed whenever a
// field that leaks into a sibling's cached response changes — titles,
// excerpts, featured images (all embedded in `children[]`) and
// menu_order (alters sibling sort order). `excludeSlugs` lets the
// caller skip pages whose entries were already purged independently
// (avoids duplicate removeItem calls + lets `applyPageInvalidations`
// pass the page-being-modified's slug — and its old slug, on a
// category move — through).
export async function purgeCmsCategory(
  categoryId: string,
  excludeSlugs?: string | ReadonlyArray<string>
): Promise<void> {
  const skip = new Set<string>(
    excludeSlugs === undefined
      ? []
      : (typeof excludeSlugs === 'string' ? [excludeSlugs] : excludeSlugs)
  )
  const rows = await db
    .selectFrom('pages')
    .select('slug')
    .where('category_id', '=', categoryId)
    .execute()
  const slugs = rows.map(r => r.slug).filter(s => !skip.has(s))
  await Promise.all(slugs.map(s => purgeCmsPage(s)))
}

// Wipe every cached CMS page response. Used by the admin "Flush Cache"
// action when targeted per-slug purges aren't enough (e.g. after a
// direct DB seed or when the editor wants a hard reset). Returns the
// number of keys removed so the UI can show a confirmation.
export async function purgeAllCmsCache(): Promise<number> {
  const storage = useStorage('cache')
  const keys = await storage.getKeys(KEY_PREFIX)
  await Promise.all(keys.map(k => storage.removeItem(k)))
  return keys.length
}
