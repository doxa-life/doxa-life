// Query helpers for the `pages` + `page_translations` tables.
// `pages.slug` stores only the leaf segment of the URL; the full URL
// is derived by walking `pages.category_id` up the category tree.
//
// Translation lookup semantics: prefer the requested locale's
// published translation, fall back to English if that locale is
// missing/draft, return null when neither is published.

import { db } from '../utils/database'
import type { PagesTable, PageTranslationsTable } from './schema'
import type { Selectable } from 'kysely'
import { sql } from 'kysely'

export type Page = Selectable<PagesTable>
export type PageTranslation = Selectable<PageTranslationsTable>

export interface LocalizedPage {
  page: Page
  translation: PageTranslation
  resolvedLocale: string          // locale actually rendered (may differ from requested when fallback kicked in)
  requestedLocale: string
}

export async function getPageSlug(id: string): Promise<string | null> {
  const row = await db
    .selectFrom('pages')
    .select('slug')
    .where('id', '=', id)
    .executeTakeFirst()
  return row?.slug ?? null
}

export async function listPages(): Promise<Page[]> {
  return db
    .selectFrom('pages')
    .selectAll()
    .orderBy('category_id', 'asc')
    .orderBy('menu_order', 'asc')
    .orderBy('slug', 'asc')
    .execute()
}

// Find a page by its leaf slug + parent category. Pass `null` for
// `categoryId` to look up an uncategorized (top-level) page. Returns
// the page row regardless of translation state — translation lookup
// is split out into `getLocalizedTranslation` so callers can decide
// whether to surface unpublished pages (the public endpoint won't).
export async function findPageInCategory(
  categoryId: string | null,
  leafSlug: string
): Promise<Page | null> {
  let q = db
    .selectFrom('pages')
    .selectAll()
    .where('slug', '=', leafSlug)
  q = categoryId === null
    ? q.where('category_id', 'is', null)
    : q.where('category_id', '=', categoryId)
  const row = await q.executeTakeFirst()
  return row ?? null
}

export async function getLocalizedTranslation(
  pageId: string,
  locale: string,
  options: { fallback?: string } = {}
): Promise<LocalizedPage | null> {
  const fallbackLocale = options.fallback ?? 'en'

  const page = await db
    .selectFrom('pages')
    .selectAll()
    .where('id', '=', pageId)
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

export async function createPage(input: {
  slug: string
  category_id?: string | null
  menu_order?: number
}): Promise<Page> {
  const row = await db
    .insertInto('pages')
    .values({
      slug: input.slug,
      category_id: input.category_id ?? null,
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
