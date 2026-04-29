// Category service. List/get reuse existing helpers; the writes
// implement the validation + cache-purge contract MCP and admin both
// rely on. Delete encodes the "refuse if pages still attached" rule
// from plans/mcp-project/mcp-project.md (count + sample-slugs surface
// on the structuredContent the tool returns).

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
}

export async function listCmsCategories(): Promise<CategoryListItem[]> {
  return dbListCategoriesWithTranslations()
}

export async function getCmsCategory(id: string) {
  return dbGetCategory(id)
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

export interface CreateCategoryInput {
  slug: string
  menu_order?: number
  translations: Array<{ locale: string; name: string }>
}

export async function createCmsCategory(input: CreateCategoryInput): Promise<Category> {
  const slug = validateCategorySlug(input.slug)
  const translations = normalizeTranslations(input.translations)
  if (!translations.some(t => t.locale === 'en' && t.name)) {
    throw err(400, 'An English name is required')
  }

  // Block collision with an uncategorized page
  const collidingPage = await db
    .selectFrom('pages')
    .select('id')
    .where('slug', '=', slug)
    .where('category_id', 'is', null)
    .executeTakeFirst()
  if (collidingPage) {
    throw err(409, `A page already uses the slug "${slug}". Pick a different category slug or reassign that page.`)
  }

  try {
    return await dbCreateCategory({
      slug,
      menu_order: input.menu_order ?? 0,
      translations
    })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === '23505') {
      throw err(409, 'A category with that slug already exists')
    }
    throw e
  }
}

export interface UpdateCategoryInput {
  id: string
  slug?: string
  menu_order?: number
  translations?: Array<{ locale: string; name: string }>
}

export async function updateCmsCategory(input: UpdateCategoryInput): Promise<{ category: Category; slugsToPurge: string[] }> {
  const args: Parameters<typeof dbUpdateCategory>[1] = {}
  if (input.slug !== undefined) {
    const slug = validateCategorySlug(input.slug)
    const collidingPage = await db
      .selectFrom('pages')
      .select('id')
      .where('slug', '=', slug)
      .where('category_id', 'is', null)
      .executeTakeFirst()
    if (collidingPage) {
      throw err(409, `A page already uses the slug "${slug}".`)
    }
    args.slug = slug
  }
  if (input.menu_order !== undefined) args.menu_order = input.menu_order
  if (input.translations !== undefined) args.translations = normalizeTranslations(input.translations)

  try {
    return await dbUpdateCategory(input.id, args)
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === '23505') {
      throw err(409, 'A category with that slug already exists')
    }
    throw e
  }
}

export interface DeleteCategoryError {
  error: 'attached_pages_present'
  attached_page_count: number
  sample_slugs: string[]
}

// Returns null on success, or a structured error payload when pages
// are still attached. Uses the FK constraint to handle the rare race
// between count and delete (see plans/mcp-project/mcp-project.md).
export async function deleteCmsCategory(id: string): Promise<{ ok: true; slug: string } | DeleteCategoryError> {
  const existing = await db
    .selectFrom('categories')
    .select(['id', 'slug'])
    .where('id', '=', id)
    .executeTakeFirst()
  if (!existing) throw err(404, 'Category not found')

  const result = await db.transaction().execute(async (tx) => {
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
        // FK violation: race window — a page was just attached.
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
  return { ok: true, slug: result.slug }
}

export async function applyCategoryInvalidations(slugs: string[]): Promise<void> {
  if (slugs.length === 0) return
  await purgeSlugs(slugs)
}
