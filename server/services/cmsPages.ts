// Shared service for CMS page operations. Called by MCP tools today;
// admin routes will follow under a separate service-extraction PR
// (Phase P1/P4 in plans/mcp-project/mcp-project.md).
//
// Each operation is responsible for: validation, DB writes (in a
// transaction when more than one row changes), activity logging
// (post-commit unless inside a transaction), and cache invalidation
// (always post-commit).

import { sql } from 'kysely'
import type { Kysely } from 'kysely'
import type { H3Error } from 'h3'
import { db } from '../utils/database'
import { purgeCmsPage, purgeCmsCategory } from '../utils/cmsCache'
import { ENABLED_LANGUAGE_CODES } from '~~/config/languages'
import type { Page, PageTranslation } from '../database/pages'
import type { Database } from '../database/schema'

export interface PageActor {
  userId: string
  source: 'admin-ui' | 'mcp'
  clientId?: string
}

export interface PageListItem {
  id: string
  slug: string
  category_id: string | null
  category_slug: string | null
  theme: 'default' | 'green'
  menu_order: number
  translations: Array<{
    locale: string
    title: string
    status: 'draft' | 'published'
    updated_at: string
  }>
}

export interface ListPagesOptions {
  category_id?: string | null
  status?: 'draft' | 'published' | 'any'
  locale?: string
  query?: string
  limit?: number
  cursor?: string
}

export interface ListPagesResult {
  pages: PageListItem[]
  nextCursor: string | null
}

interface CursorState {
  last_menu_order: number
  last_id: string
}

function encodeCursor(state: CursorState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64url')
}

function decodeCursor(cursor: string): CursorState | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    if (typeof parsed?.last_menu_order !== 'number' || typeof parsed?.last_id !== 'string') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export async function listCmsPages(opts: ListPagesOptions = {}): Promise<ListPagesResult> {
  const limit = Math.min(MAX_LIMIT, Math.max(1, opts.limit ?? DEFAULT_LIMIT))
  const cursor = opts.cursor ? decodeCursor(opts.cursor) : null

  let q = db
    .selectFrom('pages')
    .leftJoin('categories', 'categories.id', 'pages.category_id')
    .select([
      'pages.id',
      'pages.slug',
      'pages.category_id',
      'pages.menu_order',
      'pages.theme',
      'categories.slug as category_slug'
    ])

  if (opts.category_id !== undefined) {
    if (opts.category_id === null) {
      q = q.where('pages.category_id', 'is', null)
    } else {
      q = q.where('pages.category_id', '=', opts.category_id)
    }
  }
  if (opts.query) {
    const pattern = `%${opts.query.toLowerCase()}%`
    q = q.where(sql<boolean>`lower(pages.slug) like ${pattern}`)
  }
  if (cursor) {
    q = q.where(sql<boolean>`(pages.menu_order, pages.id) > (${cursor.last_menu_order}, ${cursor.last_id})`)
  }

  const rows = await q
    .orderBy('pages.menu_order', 'asc')
    .orderBy('pages.id', 'asc')
    .limit(limit + 1)
    .execute()

  const pageRows = rows.slice(0, limit)
  const hasMore = rows.length > limit
  const nextCursor = hasMore && pageRows.length > 0
    ? encodeCursor({
        last_menu_order: pageRows[pageRows.length - 1]!.menu_order,
        last_id: pageRows[pageRows.length - 1]!.id
      })
    : null

  if (pageRows.length === 0) return { pages: [], nextCursor: null }

  const pageIds = pageRows.map(r => r.id)
  let tQuery = db
    .selectFrom('page_translations')
    .select(['page_id', 'locale', 'title', 'status', 'updated'])
    .where('page_id', 'in', pageIds)

  if (opts.locale) {
    tQuery = tQuery.where('locale', '=', opts.locale)
    if (opts.status && opts.status !== 'any') {
      tQuery = tQuery.where('status', '=', opts.status)
    }
  }

  let translations = await tQuery.execute()

  // Title substring match: requires a translation row to exist for
  // the page (any locale). When a query is provided we also keep
  // pages whose slug matched (already filtered above).
  if (opts.query) {
    const pattern = opts.query.toLowerCase()
    translations = translations.filter(t => t.title.toLowerCase().includes(pattern))
  }

  const tByPage = new Map<string, Array<PageListItem['translations'][number]>>()
  for (const t of translations) {
    const list = tByPage.get(t.page_id) ?? []
    list.push({
      locale: t.locale,
      title: t.title,
      status: t.status,
      updated_at: new Date(t.updated as unknown as string).toISOString()
    })
    tByPage.set(t.page_id, list)
  }

  const out: PageListItem[] = pageRows.map(p => ({
    id: p.id,
    slug: p.slug,
    category_id: p.category_id,
    category_slug: p.category_slug ?? null,
    theme: p.theme as 'default' | 'green',
    menu_order: p.menu_order,
    translations: tByPage.get(p.id) ?? []
  }))

  return { pages: out, nextCursor }
}

export interface FullPage {
  page: Page
  translations: PageTranslation[]
  category_slug: string | null
}

export async function getCmsPage(input: { id?: string; slug?: string }): Promise<FullPage | null> {
  let pageQuery = db.selectFrom('pages').selectAll()
  if (input.id) pageQuery = pageQuery.where('id', '=', input.id)
  else if (input.slug) pageQuery = pageQuery.where('slug', '=', input.slug)
  else return null

  const page = await pageQuery.executeTakeFirst()
  if (!page) return null

  const [translations, category] = await Promise.all([
    db
      .selectFrom('page_translations')
      .selectAll()
      .where('page_id', '=', page.id)
      .orderBy('locale', 'asc')
      .execute(),
    page.category_id
      ? db
          .selectFrom('categories')
          .select('slug')
          .where('id', '=', page.category_id)
          .executeTakeFirst()
      : Promise.resolve(null)
  ])

  return {
    page,
    translations,
    category_slug: category?.slug ?? null
  }
}

// Validates a slug shape and uniqueness. Throws an H3-shaped error so
// the MCP layer's mcpError mapper can translate to a clean response.
function err(statusCode: number, message: string): H3Error {
  return Object.assign(new Error(message), {
    statusCode,
    statusMessage: message,
    data: { message }
  }) as unknown as H3Error
}

// Normalize slug input: trim whitespace, strip leading/trailing
// slashes. Single source of truth — admin routes and MCP tools both
// pass raw input; services normalize before validating. Empty result
// passes through; the regex check downstream rejects empty strings.
export function normalizeSlugInput(raw: string | null | undefined): string {
  return (raw ?? '').trim().replace(/^\/+|\/+$/g, '')
}

// Pass an `executor` (a Kysely transaction handle) when validation
// is part of a larger atomic operation — the read-side category
// existence/prefix check and the page-slug-uniqueness check then
// run on the same connection as the subsequent insert/update, so
// a concurrent category rename or page-slug change can't slip
// between validation and write.
export async function validatePageSlug(
  slug: string,
  opts: { categoryId: string | null; excludePageId?: string },
  executor: Kysely<Database> = db
): Promise<void> {
  if (!/^[a-z0-9][a-z0-9/-]*$/.test(slug)) {
    throw err(400, 'slug must be lowercase letters, digits, dashes, and slashes')
  }
  if (slug.endsWith('/')) {
    throw err(400, 'slug cannot end with /')
  }
  if (opts.categoryId) {
    const category = await executor
      .selectFrom('categories')
      .select(['slug'])
      .where('id', '=', opts.categoryId)
      .executeTakeFirst()
    if (!category) throw err(400, 'Category not found')
    if (!slug.startsWith(`${category.slug}/`)) {
      throw err(400, `Slug must start with "${category.slug}/"`)
    }
  } else {
    const collidingCategory = await executor
      .selectFrom('categories')
      .select('id')
      .where('slug', '=', slug)
      .executeTakeFirst()
    if (collidingCategory) {
      throw err(409, `"${slug}" is already used by a category.`)
    }
  }

  let pageQuery = executor
    .selectFrom('pages')
    .select('id')
    .where('slug', '=', slug)
  if (opts.excludePageId) {
    pageQuery = pageQuery.where('id', '!=', opts.excludePageId)
  }
  const collidingPage = await pageQuery.executeTakeFirst()
  if (collidingPage) {
    throw err(409, 'A page with that slug already exists')
  }
}

export interface CreatePageInput {
  slug: string
  category_id?: string | null
  menu_order?: number
  theme?: 'default' | 'green'
  custom_css?: string | null
  translation?: {
    locale: string
    title: string
    body_json: Record<string, unknown>
    excerpt?: string | null
    featured_image?: string | null
    meta_title?: string | null
    meta_description?: string | null
    og_image?: string | null
    status?: 'draft' | 'published'
  }
}

// Creates a page (and optionally an inline initial translation) in a
// single transaction. The audit hook receives the transaction's
// executor; callers (admin routes, MCP tools) are expected to pass a
// `throwOnError: true` to logEvent (or use mcpLog, which does this
// automatically when an executor is provided) so an audit-insert
// failure inside the transaction rolls back the page insert.
export interface CreateCmsPageAuditContext {
  pageId: string
  // The translation row id, set only when an inline translation was
  // created in the same transaction. Lets callers emit a separate
  // CREATE event on page_translations keyed by the actual row id so
  // audit-log greps on `record_id` find the translation.
  translationId: string | null
}

export async function createCmsPage(
  input: CreatePageInput,
  audit: (ctx: CreateCmsPageAuditContext, executor: unknown) => Promise<void>
): Promise<{ page: Page; translation: PageTranslation | null; slugsToPurge: string[]; categoriesToPurge: string[] }> {
  const slug = normalizeSlugInput(input.slug)
  if (!slug) throw err(400, 'slug is required')
  if (input.translation) {
    if (!ENABLED_LANGUAGE_CODES.includes(input.translation.locale)) {
      throw err(400, 'locale is not enabled')
    }
  }
  // Use the normalized form everywhere downstream — input.slug never
  // touches the DB after this point.
  input = { ...input, slug }

  const result = await db.transaction().execute(async (tx) => {
    // Validate the slug inside the transaction so the category-prefix
    // check and slug-uniqueness check run on the same connection as
    // the insert. Without this a concurrent category rename could
    // change the prefix between validation and write.
    await validatePageSlug(slug, { categoryId: input.category_id ?? null }, tx)

    const page = await tx
      .insertInto('pages')
      .values({
        slug: input.slug,
        category_id: input.category_id ?? null,
        menu_order: input.menu_order ?? 0,
        ...(input.theme ? { theme: input.theme } : {}),
        ...(input.custom_css !== undefined ? { custom_css: input.custom_css } : {})
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    let translation: PageTranslation | null = null
    if (input.translation) {
      const t = input.translation
      translation = await tx
        .insertInto('page_translations')
        .values({
          page_id: page.id,
          locale: t.locale,
          title: t.title,
          body_json: t.body_json,
          excerpt: t.excerpt ?? null,
          featured_image: t.featured_image ?? null,
          meta_title: t.meta_title ?? null,
          meta_description: t.meta_description ?? null,
          og_image: t.og_image ?? null,
          status: t.status ?? 'draft'
        })
        .returningAll()
        .executeTakeFirstOrThrow()
    }

    await audit({ pageId: page.id, translationId: translation?.id ?? null }, tx)

    return { page, translation }
  })

  const slugsToPurge = [result.page.slug]
  const categoriesToPurge: string[] = []
  if (result.page.category_id) categoriesToPurge.push(result.page.category_id)

  return { ...result, slugsToPurge, categoriesToPurge }
}

export interface UpdatePageInput {
  id: string
  slug?: string
  category_id?: string | null
  menu_order?: number
  theme?: 'default' | 'green'
  custom_css?: string | null
}

export interface UpdatePageResult {
  page: Page
  slugsToPurge: string[]
  categoriesToPurge: string[]
  changes: Record<string, unknown>
}

export async function updateCmsPage(input: UpdatePageInput): Promise<UpdatePageResult> {
  // Wrap reads + slug validation + UPDATE in one transaction so a
  // concurrent rename of the source or target category — or a
  // concurrent slug change on another page — can't slip between the
  // category-prefix calculation and the row write. The bare-UPDATE
  // version that lived here briefly had a race window where the
  // page would commit with a stale prefix relative to the category's
  // current slug.
  return await db.transaction().execute(async (tx) => {
    const existing = await tx
      .selectFrom('pages')
      .selectAll()
      .where('id', '=', input.id)
      .executeTakeFirst()
    if (!existing) throw err(404, 'Page not found')

    const slugsToPurge = new Set<string>([existing.slug])
    const categoriesToPurge = new Set<string>()
    const changes: Record<string, unknown> = {}

    let finalCategoryId = existing.category_id
    if (input.category_id !== undefined) {
      finalCategoryId = input.category_id ?? null
    }

    let finalSlug = existing.slug
    if (input.slug !== undefined) {
      finalSlug = normalizeSlugInput(input.slug)
    } else if (input.category_id !== undefined && finalCategoryId !== existing.category_id) {
      // Category change without slug change: rewrite the prefix.
      let leaf = existing.slug
      if (existing.category_id) {
        const oldCat = await tx
          .selectFrom('categories')
          .select('slug')
          .where('id', '=', existing.category_id)
          .executeTakeFirst()
        if (oldCat && existing.slug.startsWith(`${oldCat.slug}/`)) {
          leaf = existing.slug.slice(oldCat.slug.length + 1)
        }
      }
      if (finalCategoryId) {
        const newCat = await tx
          .selectFrom('categories')
          .select('slug')
          .where('id', '=', finalCategoryId)
          .executeTakeFirst()
        if (!newCat) throw err(400, 'Category not found')
        finalSlug = `${newCat.slug}/${leaf}`
      } else {
        finalSlug = leaf
      }
    }

    if (finalSlug !== existing.slug) {
      await validatePageSlug(finalSlug, { categoryId: finalCategoryId, excludePageId: input.id }, tx)
      changes.slug = finalSlug
    }
    if (finalCategoryId !== existing.category_id) {
      changes.category_id = finalCategoryId
    }

    if (input.menu_order !== undefined && input.menu_order !== existing.menu_order) {
      changes.menu_order = input.menu_order
    }
    if (input.theme !== undefined && input.theme !== existing.theme) {
      changes.theme = input.theme
    }
    if (input.custom_css !== undefined && input.custom_css !== existing.custom_css) {
      changes.custom_css = input.custom_css
    }

    if (Object.keys(changes).length === 0) {
      return {
        page: existing,
        slugsToPurge: Array.from(slugsToPurge),
        categoriesToPurge: Array.from(categoriesToPurge),
        changes
      }
    }

    const updated = await tx
      .updateTable('pages')
      .set({ ...changes, updated: sql`now()` })
      .where('id', '=', input.id)
      .returningAll()
      .executeTakeFirstOrThrow()

    slugsToPurge.add(updated.slug)
    if (updated.slug !== existing.slug || updated.menu_order !== existing.menu_order || updated.category_id !== existing.category_id) {
      if (existing.category_id) categoriesToPurge.add(existing.category_id)
      if (updated.category_id) categoriesToPurge.add(updated.category_id)
    }

    return {
      page: updated,
      slugsToPurge: Array.from(slugsToPurge),
      categoriesToPurge: Array.from(categoriesToPurge),
      changes
    }
  })
}

export async function deleteCmsPage(id: string): Promise<{ slug: string; categoryId: string | null }> {
  const existing = await db
    .selectFrom('pages')
    .select(['id', 'slug', 'category_id'])
    .where('id', '=', id)
    .executeTakeFirst()
  if (!existing) throw err(404, 'Page not found')

  await db.deleteFrom('pages').where('id', '=', id).execute()
  return { slug: existing.slug, categoryId: existing.category_id }
}

export async function applyPageInvalidations(slugs: string[], categoryIds: string[]): Promise<void> {
  await Promise.all(slugs.map(s => purgeCmsPage(s)))
  // Skip the slugs we just purged from the category-sibling fan-out;
  // otherwise purgeCmsCategory enumerates every member (including the
  // page we already touched) and re-purges keys for no benefit.
  await Promise.all(categoryIds.map(id => purgeCmsCategory(id, slugs)))
}
