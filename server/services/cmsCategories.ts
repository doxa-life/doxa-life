// Category service. Categories form a tree (`parent_id`); a slug or
// parent change cascades to every URL beneath the affected node.

import type { H3Error } from 'h3'
import { sql } from 'kysely'
import { db } from '../utils/database'
import { ENABLED_LANGUAGE_CODES } from '~~/config/languages'
import {
  listCategoriesWithTranslations as dbListCategoriesWithTranslations,
  getCategory as dbGetCategory,
  createCategory as dbCreateCategory,
  updateCategory as dbUpdateCategory,
  purgeSlugs
} from '../database/categories'
import type { Category, CategoryTranslation } from '../database/categories'
import {
  loadCategoryTree,
  categoryUrlPath,
  wouldCreateCycle
} from '../database/categoryTree'

function err(statusCode: number, message: string, extra?: Record<string, unknown>): H3Error {
  return Object.assign(new Error(message), {
    statusCode,
    statusMessage: message,
    data: { message, ...extra }
  }) as unknown as H3Error
}

export interface CategoryListItem extends Category {
  translations: CategoryTranslation[]
  page_count: number
  url: string
  // Slug-joined ancestor URL (e.g. "resources" — usable in href).
  parent_path: string | null
  // Human-readable ancestor chain using each ancestor's English name
  // (e.g. "Resources" — for labels and dropdowns). Falls back to the
  // slug for any ancestor missing an EN translation.
  parent_label: string | null
}

// Joins a category's ancestor chain (root → immediate parent) using
// each ancestor's English translation, falling back to the slug.
function ancestorLabel(
  tree: Awaited<ReturnType<typeof loadCategoryTree>>,
  parentId: string | null,
  enNameByCategory: Map<string, string>
): string | null {
  if (!parentId) return null
  const labels: string[] = []
  let id: string | null = parentId
  for (let i = 0; i < 32 && id; i++) {
    const node = tree.byId.get(id)
    if (!node) break
    labels.unshift(enNameByCategory.get(id) ?? node.slug)
    id = node.parent_id
  }
  return labels.length ? labels.join(' / ') : null
}

export async function listCmsCategories(): Promise<CategoryListItem[]> {
  const rows = await dbListCategoriesWithTranslations()
  if (rows.length === 0) return []
  const tree = await loadCategoryTree()
  const enByCategory = new Map<string, string>()
  for (const row of rows) {
    const en = row.translations.find(t => t.locale === 'en')?.name
    if (en) enByCategory.set(row.id, en)
  }
  return rows.map(row => ({
    ...row,
    url: categoryUrlPath(tree, row.id),
    parent_path: row.parent_id ? categoryUrlPath(tree, row.parent_id) : null,
    parent_label: ancestorLabel(tree, row.parent_id, enByCategory)
  }))
}

export async function getCmsCategory(id: string) {
  const record = await dbGetCategory(id)
  if (!record) return null
  const tree = await loadCategoryTree()
  // Walk every ancestor's EN translation in one bulk query so the
  // label chain doesn't fan out into per-ancestor SELECTs.
  const ancestorIds: string[] = []
  let cursor: string | null = record.category.parent_id
  for (let i = 0; i < 32 && cursor; i++) {
    ancestorIds.push(cursor)
    cursor = tree.byId.get(cursor)?.parent_id ?? null
  }
  const enByCategory = new Map<string, string>()
  if (ancestorIds.length > 0) {
    const rows = await db
      .selectFrom('category_translations')
      .select(['category_id', 'name'])
      .where('category_id', 'in', ancestorIds)
      .where('locale', '=', 'en')
      .execute()
    for (const r of rows) enByCategory.set(r.category_id, r.name)
  }
  return {
    ...record,
    url: categoryUrlPath(tree, id),
    parent_path: record.category.parent_id ? categoryUrlPath(tree, record.category.parent_id) : null,
    parent_label: ancestorLabel(tree, record.category.parent_id, enByCategory)
  }
}

function validateCategorySlug(slug: string): string {
  const cleaned = slug.trim().replace(/^\/+|\/+$/g, '')
  if (!cleaned) throw err(400, 'slug is required')
  if (!/^[a-z0-9][a-z0-9-]*$/.test(cleaned)) {
    throw err(400, 'Category slug must be lowercase letters, digits, and dashes (no slashes)')
  }
  return cleaned
}

function normalizeTranslations(
  raw: Array<{ locale: string; name: string }> | undefined
): Array<{ locale: string; name: string }> {
  if (!raw) return []
  return raw
    .filter(t => t && typeof t.locale === 'string' && typeof t.name === 'string')
    .filter(t => ENABLED_LANGUAGE_CODES.includes(t.locale))
    .map(t => ({ locale: t.locale, name: t.name.trim() }))
}

// Sibling-collision check shared by create + update. A category and a
// page at the same level can't share a leaf slug (the URL would be
// ambiguous), nor can two sibling categories.
async function ensureNoSiblingCollision(
  slug: string,
  parentId: string | null,
  excludeCategoryId?: string
): Promise<void> {
  let catQ = db
    .selectFrom('categories')
    .select('id')
    .where('slug', '=', slug)
  catQ = parentId === null
    ? catQ.where('parent_id', 'is', null)
    : catQ.where('parent_id', '=', parentId)
  if (excludeCategoryId) catQ = catQ.where('id', '!=', excludeCategoryId)
  const collidingCat = await catQ.executeTakeFirst()
  if (collidingCat) {
    throw err(409, 'A category with that slug already exists at this level')
  }

  let pageQ = db
    .selectFrom('pages')
    .select('id')
    .where('slug', '=', slug)
  pageQ = parentId === null
    ? pageQ.where('category_id', 'is', null)
    : pageQ.where('category_id', '=', parentId)
  const collidingPage = await pageQ.executeTakeFirst()
  if (collidingPage) {
    throw err(409, `A page already uses the slug "${slug}" at this level. Pick a different slug or move that page.`)
  }
}

export interface CreateCategoryInput {
  slug: string
  parent_id?: string | null
  menu_order?: number
  translations: Array<{ locale: string; name: string }>
}

export async function createCmsCategory(input: CreateCategoryInput): Promise<Category> {
  const slug = validateCategorySlug(input.slug)
  const translations = normalizeTranslations(input.translations)
  if (!translations.some(t => t.locale === 'en' && t.name)) {
    throw err(400, 'An English name is required')
  }

  const parentId = input.parent_id ?? null
  if (parentId) {
    const parent = await db
      .selectFrom('categories')
      .select('id')
      .where('id', '=', parentId)
      .executeTakeFirst()
    if (!parent) throw err(400, 'Parent category not found')
  }

  await ensureNoSiblingCollision(slug, parentId)

  try {
    return await dbCreateCategory({
      slug,
      parent_id: parentId,
      menu_order: input.menu_order ?? 0,
      translations
    })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === '23505') {
      throw err(409, 'A category with that slug already exists at this level')
    }
    throw e
  }
}

export interface UpdateCategoryInput {
  id: string
  slug?: string
  parent_id?: string | null
  menu_order?: number
  translations?: Array<{ locale: string; name: string }>
}

export async function updateCmsCategory(input: UpdateCategoryInput): Promise<{ category: Category; slugsToPurge: string[] }> {
  const existing = await db
    .selectFrom('categories')
    .selectAll()
    .where('id', '=', input.id)
    .executeTakeFirst()
  if (!existing) throw err(404, 'Category not found')

  const args: Parameters<typeof dbUpdateCategory>[1] = {}
  let nextSlug = existing.slug
  let nextParentId: string | null = existing.parent_id

  if (input.slug !== undefined) {
    nextSlug = validateCategorySlug(input.slug)
    args.slug = nextSlug
  }
  if (input.parent_id !== undefined) {
    nextParentId = input.parent_id ?? null
    if (nextParentId) {
      const tree = await loadCategoryTree()
      if (wouldCreateCycle(tree, input.id, nextParentId)) {
        throw err(400, 'Parent must not be the category itself or one of its descendants')
      }
      const parent = await db
        .selectFrom('categories')
        .select('id')
        .where('id', '=', nextParentId)
        .executeTakeFirst()
      if (!parent) throw err(400, 'Parent category not found')
    }
    args.parent_id = nextParentId
  }
  if ((args.slug !== undefined && nextSlug !== existing.slug) ||
      (args.parent_id !== undefined && nextParentId !== existing.parent_id)) {
    await ensureNoSiblingCollision(nextSlug, nextParentId, input.id)
  }
  if (input.menu_order !== undefined) args.menu_order = input.menu_order
  if (input.translations !== undefined) args.translations = normalizeTranslations(input.translations)

  try {
    return await dbUpdateCategory(input.id, args)
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === '23505') {
      throw err(409, 'A category with that slug already exists at this level')
    }
    throw e
  }
}

export interface DeleteCategoryError {
  error: 'attached_pages_present' | 'child_categories_present'
  attached_page_count: number
  sample_slugs: string[]
}

// Returns null on success, or a structured error payload when the
// category still has pages or child categories.
export async function deleteCmsCategory(id: string): Promise<{ ok: true; slug: string } | DeleteCategoryError> {
  const existing = await db
    .selectFrom('categories')
    .select(['id', 'slug'])
    .where('id', '=', id)
    .executeTakeFirst()
  if (!existing) throw err(404, 'Category not found')

  const result = await db.transaction().execute(async (tx) => {
    const childCountRow = await tx
      .selectFrom('categories')
      .select(sql<number>`COUNT(*)::int`.as('count'))
      .where('parent_id', '=', id)
      .executeTakeFirstOrThrow()
    if (Number(childCountRow.count) > 0) {
      const sample = await tx
        .selectFrom('categories')
        .select('slug')
        .where('parent_id', '=', id)
        .limit(5)
        .execute()
      return {
        kind: 'children' as const,
        attached_page_count: Number(childCountRow.count),
        sample_slugs: sample.map(s => s.slug)
      }
    }

    const countRow = await tx
      .selectFrom('pages')
      .select(sql<number>`COUNT(*)::int`.as('count'))
      .where('category_id', '=', id)
      .executeTakeFirstOrThrow()
    const count = Number(countRow.count)

    if (count > 0) {
      const sample = await tx
        .selectFrom('pages')
        .select('slug')
        .where('category_id', '=', id)
        .limit(5)
        .execute()
      return {
        kind: 'attached' as const,
        attached_page_count: count,
        sample_slugs: sample.map(s => s.slug)
      }
    }

    try {
      await tx.deleteFrom('categories').where('id', '=', id).execute()
      return { kind: 'deleted' as const, slug: existing.slug }
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === '23503') {
        return {
          kind: 'attached' as const,
          attached_page_count: 1,
          sample_slugs: []
        }
      }
      throw e
    }
  })

  if (result.kind === 'attached') {
    return {
      error: 'attached_pages_present',
      attached_page_count: result.attached_page_count,
      sample_slugs: result.sample_slugs
    }
  }
  if (result.kind === 'children') {
    return {
      error: 'child_categories_present',
      attached_page_count: result.attached_page_count,
      sample_slugs: result.sample_slugs
    }
  }
  return { ok: true, slug: result.slug }
}

export async function applyCategoryInvalidations(slugs: string[]): Promise<void> {
  if (slugs.length === 0) return
  await purgeSlugs(slugs)
}
