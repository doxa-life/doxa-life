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
import {
  loadCategoryTree,
  categoryChain,
  descendantCategoryIds,
  pageUrlPath,
  categoryUrlPath
} from '../database/categoryTree'

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

// Purge every cached page across a category's whole top-level subtree,
// in all locales. Needed whenever a field that leaks into another cached
// response changes — titles, excerpts, featured images (embedded in
// `children[]` and the landing grid), menu_order (sort order), or a
// page's published state (whether a category appears in the menu/grid at
// all). The sidebar nav tree and the landing-page grids span the entire
// top-level subtree — every page under `/resources` shares one nav, and
// ancestor landings list their descendants — so the invalidation has to
// reach from the top-level ancestor down, not just this category's own
// subtree.
//
// `excludeUrls` skips entries already purged by the caller (avoids
// duplicate removeItem calls when `applyPageInvalidations` already
// handled the page-being-modified's old + new URL).
export async function purgeCmsCategory(
  categoryId: string,
  excludeUrls?: string | ReadonlyArray<string>
): Promise<void> {
  const skip = new Set<string>(
    excludeUrls === undefined
      ? []
      : (typeof excludeUrls === 'string' ? [excludeUrls] : excludeUrls)
  )
  const tree = await loadCategoryTree()
  const chain = categoryChain(tree, categoryId)
  const rootId = chain[0]?.id ?? categoryId
  const subtreeIds = descendantCategoryIds(tree, rootId)
  if (subtreeIds.length === 0) return
  const rows = await db
    .selectFrom('pages')
    .select(['slug', 'category_id'])
    .where('category_id', 'in', subtreeIds)
    .execute()
  const urls = new Set<string>()
  for (const r of rows) urls.add(pageUrlPath(tree, r))
  // Bare-category landings cache too (e.g. `/resources` resolves
  // through getCategoryDefaultPage); purge them along with the pages.
  for (const cid of subtreeIds) {
    const path = categoryUrlPath(tree, cid)
    if (path) urls.add(path)
  }
  const targets = [...urls].filter(u => !skip.has(u))
  await Promise.all(targets.map(u => purgeCmsPage(u)))
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
