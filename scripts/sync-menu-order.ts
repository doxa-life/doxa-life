// Sync the `pages.menu_order` column from the live WP site's rendered
// sidebar. The WP theme orders children by `wp_posts.menu_order` and
// renders them in that order inside <aside class="sidebar"><ul>…</ul>.
// We fetch each parent page, read the child slugs in DOM order, and
// update our DB rows so the same ordering appears on our sidebar.
//
// Run: `bun scripts/sync-menu-order.ts [parent-slug...]`
// With no args, syncs every distinct parent_slug found in the DB.

import { JSDOM } from 'jsdom'
import { Kysely } from 'kysely'
import { PostgresJSDialect } from 'kysely-postgres-js'
import postgres from 'postgres'
import type { Database } from '../server/database/schema'

const LIVE_ORIGIN = 'https://doxa.life'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL not set.')
  process.exit(1)
}
const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
const db = new Kysely<Database>({
  dialect: new PostgresJSDialect({
    postgres: postgres(databaseUrl, isLocal ? {} : { ssl: 'require' })
  })
})

async function fetchSidebarOrder(parentSlug: string): Promise<string[]> {
  const url = `${LIVE_ORIGIN}/${parentSlug}/`
  const res = await fetch(url, { headers: { 'User-Agent': 'doxa-menu-sync/1.0' } })
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  const html = await res.text()
  const dom = new JSDOM(html)
  const anchors = dom.window.document.querySelectorAll<HTMLAnchorElement>('aside.sidebar nav ul li a[href]')
  const slugs: string[] = []
  for (const a of anchors) {
    try {
      const u = new URL(a.getAttribute('href')!, LIVE_ORIGIN)
      if (u.hostname !== 'doxa.life') continue
      const slug = u.pathname.replace(/^\/+|\/+$/g, '')
      if (!slug || slug === parentSlug) continue
      slugs.push(slug)
    } catch {}
  }
  return slugs
}

async function syncParent(parentSlug: string) {
  console.log(`\n→ ${parentSlug}`)
  let order: string[]
  try {
    order = await fetchSidebarOrder(parentSlug)
  } catch (e: any) {
    console.warn(`  ! fetch failed: ${e?.message ?? e}`)
    return
  }
  if (!order.length) {
    console.log('  – no sidebar found on live site')
    return
  }

  for (let i = 0; i < order.length; i++) {
    const childSlug = order[i]!
    const result = await db
      .updateTable('pages')
      .set({ menu_order: i + 1, updated: new Date() })
      .where('slug', '=', childSlug)
      .where('parent_slug', '=', parentSlug)
      .execute()
    const changed = Number(result[0]?.numUpdatedRows ?? 0)
    console.log(`  ${changed ? '✓' : '–'} ${i + 1}. ${childSlug}${changed ? '' : ' (no matching row)'}`)
  }
}

async function main() {
  const filter = process.argv.slice(2)
  let parents: string[]
  if (filter.length) {
    parents = filter
  } else {
    const rows = await db
      .selectFrom('pages')
      .select('parent_slug')
      .where('parent_slug', 'is not', null)
      .distinct()
      .execute()
    parents = rows.map(r => r.parent_slug!).filter(Boolean)
  }

  if (!parents.length) {
    console.error('No parent slugs found.')
    process.exit(1)
  }

  for (const p of parents) await syncParent(p)

  console.log('\nDone.')
  await db.destroy()
}

main().catch(async (e) => {
  console.error(e)
  await db.destroy()
  process.exit(1)
})
