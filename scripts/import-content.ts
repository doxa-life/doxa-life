// Phase 7 importer: walks scripts/scraped/ and upserts each JSON into
// the `pages` + `page_translations` tables. Pages are created if they
// don't exist (using the parent_slug + menu_order from pageList.ts).
// Translations are written with `status: 'draft'` so editors verify
// before publishing.
//
// Run: `bun scripts/import-content.ts [slug...]`
// With no args, imports every slug directory that has scraped files.
// Args filter by slug.

import { readdir, readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Kysely, sql } from 'kysely'
import { PostgresJSDialect } from 'kysely-postgres-js'
import postgres from 'postgres'
import type { Database } from '../server/database/schema'
import { SCRAPE_TARGETS } from './lib/pageList'

const SCRAPED_DIR = new URL('../scripts/scraped/', import.meta.url).pathname

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL not set. Abort.')
  process.exit(1)
}

const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')

const db = new Kysely<Database>({
  dialect: new PostgresJSDialect({
    postgres: postgres(databaseUrl, isLocal ? {} : { ssl: 'require' })
  })
})

interface ScrapedDoc {
  sourceUrl: string
  slug: string
  locale: string
  title: string
  excerpt: string | null
  meta_description: string | null
  og_image: string | null
  featured_image: string | null
  custom_css?: string | null
  body_json: Record<string, any>
}

async function ensurePage(slug: string): Promise<string> {
  const target = SCRAPE_TARGETS.find(t => t.slug === slug)
  const existing = await db
    .selectFrom('pages')
    .select(['id', 'parent_slug', 'menu_order'])
    .where('slug', '=', slug)
    .executeTakeFirst()

  if (existing) return existing.id

  const row = await db
    .insertInto('pages')
    .values({
      slug,
      parent_slug: target?.parentSlug ?? null,
      menu_order: target?.menuOrder ?? 0
    })
    .returning('id')
    .executeTakeFirstOrThrow()
  return row.id
}

async function upsertTranslation(pageId: string, doc: ScrapedDoc) {
  const existing = await db
    .selectFrom('page_translations')
    .select('id')
    .where('page_id', '=', pageId)
    .where('locale', '=', doc.locale)
    .executeTakeFirst()

  if (existing) {
    await db
      .updateTable('page_translations')
      .set({
        title: doc.title || 'Untitled',
        body_json: doc.body_json,
        excerpt: doc.excerpt,
        featured_image: doc.featured_image,
        meta_description: doc.meta_description,
        og_image: doc.og_image,
        updated: new Date()
        // status intentionally left alone on re-import so editors don't
        // lose their publish state; first-time imports hit the INSERT
        // branch and default to 'draft' via the column default.
      })
      .where('id', '=', existing.id)
      .execute()
  } else {
    await db
      .insertInto('page_translations')
      .values({
        page_id: pageId,
        locale: doc.locale,
        title: doc.title || 'Untitled',
        body_json: doc.body_json,
        excerpt: doc.excerpt,
        featured_image: doc.featured_image,
        meta_description: doc.meta_description,
        og_image: doc.og_image,
        status: 'draft'
      })
      .execute()
  }
}

async function walkSlugs(dir: string, prefix = ''): Promise<string[]> {
  if (!existsSync(dir)) return []
  const entries = await readdir(dir, { withFileTypes: true })
  const out: string[] = []
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const full = join(dir, e.name)
    const sub = await readdir(full)
    if (sub.some(f => f.endsWith('.json'))) {
      out.push(prefix ? `${prefix}/${e.name}` : e.name)
    }
    out.push(...(await walkSlugs(full, prefix ? `${prefix}/${e.name}` : e.name)))
  }
  return out
}

async function main() {
  const filter = process.argv.slice(2)
  const allSlugs = await walkSlugs(SCRAPED_DIR)
  const slugs = filter.length ? allSlugs.filter(s => filter.includes(s)) : allSlugs

  if (!slugs.length) {
    console.error(`No scraped content found in ${SCRAPED_DIR}`)
    console.error('Run `bun scripts/scrape-content.ts` first.')
    process.exit(1)
  }

  console.log(`Importing ${slugs.length} slug(s) from ${SCRAPED_DIR}…`)
  let imported = 0
  let errored = 0

  for (const slug of slugs) {
    const dir = join(SCRAPED_DIR, slug)
    const files = (await readdir(dir)).filter(f => f.endsWith('.json'))
    if (!files.length) continue

    console.log(`\n→ ${slug}`)
    const pageId = await ensurePage(slug)

    // Update page-level fields (custom_css) from whichever scraped
    // locale has it — WP stores _page_custom_css per-translation but
    // in practice it's the same rule across locales. Read the first
    // non-null value and write it once on the page.
    const firstDoc = JSON.parse(await readFile(join(dir, files[0]!), 'utf8')) as ScrapedDoc
    if (firstDoc.custom_css !== undefined) {
      await db.updateTable('pages')
        .set({ custom_css: firstDoc.custom_css, updated: new Date() })
        .where('id', '=', pageId)
        .execute()
    }

    for (const file of files.sort()) {
      const path = join(dir, file)
      const raw = await readFile(path, 'utf8')
      try {
        const doc = JSON.parse(raw) as ScrapedDoc
        if (!doc.slug || !doc.locale) {
          console.warn(`  ! ${file} missing slug/locale — skipped`)
          continue
        }
        await upsertTranslation(pageId, doc)
        console.log(`  ✓ ${doc.locale}`)
        imported++
      } catch (e: any) {
        console.warn(`  ! ${file} failed: ${e?.message ?? e}`)
        errored++
      }
    }
  }

  console.log(`\nDone. ${imported} translation(s) upserted, ${errored} errored.`)
  await db.destroy()
}

main().catch(async (e) => {
  console.error(e)
  await db.destroy()
  process.exit(1)
})
