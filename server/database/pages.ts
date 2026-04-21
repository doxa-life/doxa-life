// Query helpers for the `pages` + `page_translations` tables (migration
// 005). All functions use Kysely against the shared `db` instance.
//
// Lookup semantics (`getPageBySlug`) mirror the plan: prefer the
// requested locale's published translation, fall back to English if
// that locale is missing/draft, return null when neither is published.

import { db } from '../utils/database'
import type { PagesTable, PageTranslationsTable } from './schema'
import type { Selectable } from 'kysely'

export type Page = Selectable<PagesTable>
export type PageTranslation = Selectable<PageTranslationsTable>

export interface LocalizedPage {
  page: Page
  translation: PageTranslation
  resolvedLocale: string          // locale actually rendered (may differ from requested when fallback kicked in)
  requestedLocale: string
}

export async function listPages(): Promise<Page[]> {
  return db
    .selectFrom('pages')
    .selectAll()
    .orderBy('parent_slug', 'asc')
    .orderBy('menu_order', 'asc')
    .orderBy('slug', 'asc')
    .execute()
}

export async function getPageChildren(parentSlug: string): Promise<Page[]> {
  return db
    .selectFrom('pages')
    .selectAll()
    .where('parent_slug', '=', parentSlug)
    .orderBy('menu_order', 'asc')
    .orderBy('slug', 'asc')
    .execute()
}

export async function getPageBySlug(
  slug: string,
  locale: string,
  options: { fallback?: string } = {}
): Promise<LocalizedPage | null> {
  const fallbackLocale = options.fallback ?? 'en'

  const page = await db
    .selectFrom('pages')
    .selectAll()
    .where('slug', '=', slug)
    .executeTakeFirst()
  if (!page) return null

  const translation = await db
    .selectFrom('page_translations')
    .selectAll()
    .where('page_id', '=', page.id)
    .where('locale', '=', locale)
    .where('status', '=', 'published')
    .executeTakeFirst()

  if (translation) {
    return { page, translation, resolvedLocale: locale, requestedLocale: locale }
  }

  // Fall back to published English if the requested locale isn't published
  if (locale !== fallbackLocale) {
    const fallback = await db
      .selectFrom('page_translations')
      .selectAll()
      .where('page_id', '=', page.id)
      .where('locale', '=', fallbackLocale)
      .where('status', '=', 'published')
      .executeTakeFirst()
    if (fallback) {
      return { page, translation: fallback, resolvedLocale: fallbackLocale, requestedLocale: locale }
    }
  }

  return null
}

export async function getChildTranslations(
  parentSlug: string,
  locale: string,
  fallbackLocale = 'en'
): Promise<Array<{ page: Page; translation: PageTranslation }>> {
  const children = await getPageChildren(parentSlug)
  if (children.length === 0) return []
  const ids = children.map(c => c.id)

  const preferred = await db
    .selectFrom('page_translations')
    .selectAll()
    .where('page_id', 'in', ids)
    .where('locale', '=', locale)
    .where('status', '=', 'published')
    .execute()
  const haveLocale = new Set(preferred.map(p => p.page_id))

  const missing = ids.filter(id => !haveLocale.has(id))
  let fallbacks: PageTranslation[] = []
  if (missing.length && locale !== fallbackLocale) {
    fallbacks = await db
      .selectFrom('page_translations')
      .selectAll()
      .where('page_id', 'in', missing)
      .where('locale', '=', fallbackLocale)
      .where('status', '=', 'published')
      .execute()
  }

  const byPageId = new Map<string, PageTranslation>()
  for (const t of preferred) byPageId.set(t.page_id, t)
  for (const t of fallbacks) byPageId.set(t.page_id, t)

  return children
    .map(page => ({ page, translation: byPageId.get(page.id)! }))
    .filter(entry => Boolean(entry.translation))
}

export async function createPage(input: {
  slug: string
  parent_slug?: string | null
  menu_order?: number
}): Promise<Page> {
  const row = await db
    .insertInto('pages')
    .values({
      slug: input.slug,
      parent_slug: input.parent_slug ?? null,
      menu_order: input.menu_order ?? 0
    })
    .returningAll()
    .executeTakeFirstOrThrow()
  return row
}

export async function deletePage(id: string): Promise<void> {
  await db.deleteFrom('pages').where('id', '=', id).execute()
}

export async function upsertTranslation(input: {
  page_id: string
  locale: string
  title: string
  body_json: Record<string, any>
  excerpt?: string | null
  featured_image?: string | null
  meta_title?: string | null
  meta_description?: string | null
  og_image?: string | null
  status?: 'draft' | 'published'
}): Promise<PageTranslation> {
  const existing = await db
    .selectFrom('page_translations')
    .selectAll()
    .where('page_id', '=', input.page_id)
    .where('locale', '=', input.locale)
    .executeTakeFirst()

  if (existing) {
    const updated = await db
      .updateTable('page_translations')
      .set({
        title: input.title,
        body_json: input.body_json,
        excerpt: input.excerpt ?? null,
        featured_image: input.featured_image ?? null,
        meta_title: input.meta_title ?? null,
        meta_description: input.meta_description ?? null,
        og_image: input.og_image ?? null,
        ...(input.status ? { status: input.status } : {}),
        updated: new Date()
      })
      .where('id', '=', existing.id)
      .returningAll()
      .executeTakeFirstOrThrow()
    return updated
  }

  const inserted = await db
    .insertInto('page_translations')
    .values({
      page_id: input.page_id,
      locale: input.locale,
      title: input.title,
      body_json: input.body_json,
      excerpt: input.excerpt ?? null,
      featured_image: input.featured_image ?? null,
      meta_title: input.meta_title ?? null,
      meta_description: input.meta_description ?? null,
      og_image: input.og_image ?? null,
      status: input.status ?? 'draft'
    })
    .returningAll()
    .executeTakeFirstOrThrow()
  return inserted
}

export async function setTranslationStatus(
  pageId: string,
  locale: string,
  status: 'draft' | 'published'
): Promise<void> {
  await db
    .updateTable('page_translations')
    .set({ status, updated: new Date() })
    .where('page_id', '=', pageId)
    .where('locale', '=', locale)
    .execute()
}
