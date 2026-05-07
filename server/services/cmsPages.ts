// Shared service for CMS page operations. Called by MCP tools and admin
// routes. Each operation owns: validation, DB writes (transactional
// when more than one row changes), activity logging (post-commit unless
// inside a transaction), and cache invalidation (always post-commit).
//
// Slugs are leaves only — the public URL is derived from the page's
// category chain at request time. Cache purges therefore work in terms
// of *URLs* (`pageUrl`), not the raw `slug` column. Service callers get
// the URL back in `slugsToPurge` (kept that name for compatibility with
// the cache layer's API).

import { sql } from 'kysely'
import type { Kysely } from 'kysely'
import type { H3Error } from 'h3'
import { db } from '../utils/database'
import { purgeCmsPage, purgeCmsCategory } from '../utils/cmsCache'
import { ENABLED_LANGUAGE_CODES } from '~~/config/languages'
import type { Page, PageTranslation } from '../database/pages'
import type { Database } from '../database/schema'
import {
  loadCategoryTree,
  pageUrlPath,
  categoryUrlPath
} from '../database/categoryTree'

export interface PageActor {
  userId: string
  source: 'admin-ui' | 'mcp'
  clientId?: string
}

export interface PageListItem {
  id: string
  slug: string
  url: string
  category_id: string | null
  category_slug: string | null
  category_path: string | null
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

  const tree = await loadCategoryTree()
  const out: PageListItem[] = pageRows.map(p => {
    const categoryPath = p.category_id ? categoryUrlPath(tree, p.category_id) : null
    return {
      id: p.id,
      slug: p.slug,
      url: pageUrlPath(tree, { slug: p.slug, category_id: p.category_id }),
      category_id: p.category_id,
      category_slug: p.category_slug ?? null,
      category_path: categoryPath || null,
      theme: p.theme as 'default' | 'green',
      menu_order: p.menu_order,
      translations: tByPage.get(p.id) ?? []
    }
  })

  return { pages: out, nextCursor }
}

export interface FullPage {
  page: Page
  translations: PageTranslation[]
  category_slug: string | null
  category_path: string | null
  url: string
}

export async function getCmsPage(input: { id?: string; slug?: string; category_id?: string | null }): Promise<FullPage | null> {
  let pageQuery = db.selectFrom('pages').selectAll()
  if (input.id) {
    pageQuery = pageQuery.where('id', '=', input.id)
  } else if (input.slug) {
    // Backwards-compatible by-slug lookup. Without a category id this
    // can match more than one row across categories — pick the first
    // deterministically (lowest menu_order, then created) so old MCP
    // callers that pass a leaf slug don't crash.
    pageQuery = pageQuery.where('slug', '=', input.slug)
    if (input.category_id !== undefined) {
      pageQuery = input.category_id === null
        ? pageQuery.where('category_id', 'is', null)
        : pageQuery.where('category_id', '=', input.category_id)
    }
  } else {
    return null
  }

  const page = await pageQuery
    .orderBy('menu_order', 'asc')
    .orderBy('created', 'asc')
    .executeTakeFirst()
  if (!page) return null

  const [translations, tree] = await Promise.all([
    db
      .selectFrom('page_translations')
      .selectAll()
      .where('page_id', '=', page.id)
      .orderBy('locale', 'asc')
      .execute(),
    loadCategoryTree()
  ])

  const categoryPath = page.category_id ? categoryUrlPath(tree, page.category_id) : null
  const categorySlug = page.category_id ? (tree.byId.get(page.category_id)?.slug ?? null) : null
  return {
    page,
    translations,
    category_slug: categorySlug,
    category_path: categoryPath || null,
    url: pageUrlPath(tree, page)
  }
}

function err(statusCode: number, message: string): H3Error {
  return Object.assign(new Error(message), {
    statusCode,
    statusMessage: message,
    data: { message }
  }) as unknown as H3Error
}

// Normalize slug input: trim whitespace, strip any slashes (slugs are
// leaves — slashes were valid only in the old prefix-as-slug model).
export function normalizeSlugInput(raw: string | null | undefined): string {
  return (raw ?? '').trim().replace(/^\/+|\/+$/g, '').replace(/\/+/g, '-')
}

// Validates a leaf slug: shape, no collision with a sibling category
// at the same level (a category and a page can't share a leaf because
// `/parent/leaf` would be ambiguous), and no collision with another
// page in the same category.
export async function validatePageSlug(
  slug: string,
  opts: { categoryId: string | null; excludePageId?: string },
  executor: Kysely<Database> = db
): Promise<void> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw err(400, 'slug must be lowercase letters, digits, and dashes (no slashes)')
  }

  // Sibling-category collision: a category whose `parent_id` matches
  // this page's category would render at the same URL level.
  let categoryQuery = executor
    .selectFrom('categories')
    .select('id')
    .where('slug', '=', slug)
  categoryQuery = opts.categoryId === null
    ? categoryQuery.where('parent_id', 'is', null)
    : categoryQuery.where('parent_id', '=', opts.categoryId)
  const collidingCategory = await categoryQuery.executeTakeFirst()
  if (collidingCategory) {
    throw err(409, `"${slug}" is already used by a category at this level.`)
  }

  // Sibling-page collision in the same category.
  let pageQuery = executor
    .selectFrom('pages')
    .select('id')
    .where('slug', '=', slug)
  pageQuery = opts.categoryId === null
    ? pageQuery.where('category_id', 'is', null)
    : pageQuery.where('category_id', '=', opts.categoryId)
  if (opts.excludePageId) {
    pageQuery = pageQuery.where('id', '!=', opts.excludePageId)
  }
  const collidingPage = await pageQuery.executeTakeFirst()
  if (collidingPage) {
    throw err(409, 'A page with that slug already exists in this category')
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

export interface CreateCmsPageAuditContext {
  pageId: string
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
  input = { ...input, slug }

  const result = await db.transaction().execute(async (tx) => {
    if (input.category_id) {
      const cat = await tx
        .selectFrom('categories')
        .select('id')
        .where('id', '=', input.category_id)
        .executeTakeFirst()
      if (!cat) throw err(400, 'Category not found')
    }
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

  // Compute the full public URL so the cache layer purges by the same
  // key the lookup endpoint writes (full path, hex-encoded).
  const tree = await loadCategoryTree()
  const url = pageUrlPath(tree, result.page)
  const slugsToPurge = [url]
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
  return await db.transaction().execute(async (tx) => {
    const existing = await tx
      .selectFrom('pages')
      .selectAll()
      .where('id', '=', input.id)
      .executeTakeFirst()
    if (!existing) throw err(404, 'Page not found')

    // Snapshot the page's current full URL before any changes so we
    // can purge the old key after the update commits.
    const treeBefore = await loadCategoryTree(tx)
    const oldUrl = pageUrlPath(treeBefore, existing)

    const slugsToPurge = new Set<string>([oldUrl])
    const categoriesToPurge = new Set<string>()
    const changes: Record<string, unknown> = {}

    let finalCategoryId = existing.category_id
    if (input.category_id !== undefined) {
      finalCategoryId = input.category_id ?? null
    }

    let finalSlug = existing.slug
    if (input.slug !== undefined) {
      finalSlug = normalizeSlugInput(input.slug)
    }

    if (finalSlug !== existing.slug) {
      changes.slug = finalSlug
    }
    if (finalCategoryId !== existing.category_id) {
      changes.category_id = finalCategoryId
    }

    // Validate the (slug, category) pair when either changed. Done in
    // the same transaction so a concurrent rename can't slip between
    // validation and write.
    if (changes.slug !== undefined || changes.category_id !== undefined) {
      if (finalCategoryId) {
        const cat = await tx
          .selectFrom('categories')
          .select('id')
          .where('id', '=', finalCategoryId)
          .executeTakeFirst()
        if (!cat) throw err(400, 'Category not found')
      }
      await validatePageSlug(finalSlug, { categoryId: finalCategoryId, excludePageId: input.id }, tx)
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

    const treeAfter = await loadCategoryTree(tx)
    slugsToPurge.add(pageUrlPath(treeAfter, updated))
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

export async function deleteCmsPage(id: string): Promise<{ slug: string; url: string; categoryId: string | null }> {
  const existing = await db
    .selectFrom('pages')
    .select(['id', 'slug', 'category_id'])
    .where('id', '=', id)
    .executeTakeFirst()
  if (!existing) throw err(404, 'Page not found')

  const tree = await loadCategoryTree()
  const url = pageUrlPath(tree, existing)

  await db.deleteFrom('pages').where('id', '=', id).execute()
  return { slug: existing.slug, url, categoryId: existing.category_id }
}

export async function applyPageInvalidations(slugs: string[], categoryIds: string[]): Promise<void> {
  await Promise.all(slugs.map(s => purgeCmsPage(s)))
  await Promise.all(categoryIds.map(id => purgeCmsCategory(id, slugs)))
}
