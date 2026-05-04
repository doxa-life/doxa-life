// Query helpers for the `categories` + `category_translations` tables.
// Categories are a first-class replacement for the old
// `pages.parent_slug` hierarchy: purely organizational groups that
// expose a shared URL prefix, a translated sidebar heading, and a
// drag-and-drop ordering for their member pages.

import { db } from '../utils/database'
import type {
  CategoriesTable,
  CategoryTranslationsTable,
  PagesTable,
  PageTranslationsTable
} from './schema'
import type { Selectable } from 'kysely'
import { sql } from 'kysely'
import { purgeCmsPage } from '../utils/cmsCache'

export type Category = Selectable<CategoriesTable>
export type CategoryTranslation = Selectable<CategoryTranslationsTable>

type Page = Selectable<PagesTable>
type PageTranslation = Selectable<PageTranslationsTable>

export interface CategoryWithTranslations {
  category: Category
  translations: CategoryTranslation[]
}

export async function listCategories(): Promise<Category[]> {
  return db
    .selectFrom('categories')
    .selectAll()
    .orderBy('menu_order', 'asc')
    .orderBy('slug', 'asc')
    .execute()
}

export async function listCategoriesWithTranslations(): Promise<
  Array<Category & { translations: CategoryTranslation[]; page_count: number }>
> {
  const categories = await listCategories()
  if (categories.length === 0) return []

  const ids = categories.map(c => c.id)
  const translations = await db
    .selectFrom('category_translations')
    .selectAll()
    .where('category_id', 'in', ids)
    .execute()

  const counts = await db
    .selectFrom('pages')
    .select(['category_id', sql<number>`COUNT(*)::int`.as('count')])
    .where('category_id', 'in', ids)
    .groupBy('category_id')
    .execute()

  const byCategory = new Map<string, CategoryTranslation[]>()
  for (const t of translations) {
    const list = byCategory.get(t.category_id) ?? []
    list.push(t)
    byCategory.set(t.category_id, list)
  }
  const countByCategory = new Map<string, number>()
  for (const c of counts) {
    if (c.category_id) countByCategory.set(c.category_id, Number(c.count))
  }

  return categories.map(c => ({
    ...c,
    translations: byCategory.get(c.id) ?? [],
    page_count: countByCategory.get(c.id) ?? 0
  }))
}

export async function getCategory(id: string): Promise<CategoryWithTranslations | null> {
  const category = await db
    .selectFrom('categories')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
  if (!category) return null

  const translations = await db
    .selectFrom('category_translations')
    .selectAll()
    .where('category_id', '=', id)
    .orderBy('locale', 'asc')
    .execute()

  return { category, translations }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const row = await db
    .selectFrom('categories')
    .selectAll()
    .where('slug', '=', slug)
    .executeTakeFirst()
  return row ?? null
}

export async function getCategoryName(
  categoryId: string,
  locale: string,
  fallbackLocale = 'en'
): Promise<string | null> {
  const preferred = await db
    .selectFrom('category_translations')
    .select('name')
    .where('category_id', '=', categoryId)
    .where('locale', '=', locale)
    .executeTakeFirst()
  if (preferred?.name) return preferred.name

  if (locale !== fallbackLocale) {
    const fallback = await db
      .selectFrom('category_translations')
      .select('name')
      .where('category_id', '=', categoryId)
      .where('locale', '=', fallbackLocale)
      .executeTakeFirst()
    if (fallback?.name) return fallback.name
  }
  return null
}

// Sidebar siblings for a category: every page in the category,
// ordered. Matches the old parent_slug-based sibling lookup but keyed
// on category_id.
export async function getCategoryPages(categoryId: string): Promise<Page[]> {
  return db
    .selectFrom('pages')
    .selectAll()
    .where('category_id', '=', categoryId)
    .orderBy('menu_order', 'asc')
    .orderBy('slug', 'asc')
    .execute()
}

export async function getCategoryPageTranslations(
  categoryId: string,
  locale: string,
  fallbackLocale = 'en'
): Promise<Array<{ page: Page; translation: PageTranslation }>> {
  const pages = await getCategoryPages(categoryId)
  if (pages.length === 0) return []
  const ids = pages.map(p => p.id)

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

  return pages
    .map(page => ({ page, translation: byPageId.get(page.id)! }))
    .filter(entry => Boolean(entry.translation))
}

// Public URL resolution for `/about` → first page in About. Picks
// whichever page has the lowest menu_order (ties broken by slug) and
// has at least one published translation, so bare category slugs never
// resolve to something the visitor can't read.
export async function getCategoryDefaultPage(
  categoryId: string,
  locale: string,
  fallbackLocale = 'en'
): Promise<{ page: Page; translation: PageTranslation } | null> {
  const translations = await getCategoryPageTranslations(categoryId, locale, fallbackLocale)
  return translations[0] ?? null
}

export interface CreateCategoryInput {
  slug: string
  menu_order?: number
  translations: Array<{ locale: string; name: string }>
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  return db.transaction().execute(async trx => {
    const row = await trx
      .insertInto('categories')
      .values({
        slug: input.slug,
        menu_order: input.menu_order ?? 0
      })
      .returningAll()
      .executeTakeFirstOrThrow()

    for (const t of input.translations) {
      if (!t.name.trim()) continue
      await trx
        .insertInto('category_translations')
        .values({
          category_id: row.id,
          locale: t.locale,
          name: t.name.trim()
        })
        .execute()
    }

    return row
  })
}

export interface UpdateCategoryInput {
  slug?: string
  menu_order?: number
  translations?: Array<{ locale: string; name: string }>
}

// Returns the set of slugs whose cached rendering needs busting (old
// and new URLs for every renamed member page).
export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<{ category: Category; slugsToPurge: string[] }> {
  return db.transaction().execute(async trx => {
    const existing = await trx
      .selectFrom('categories')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()
    if (!existing) {
      throw Object.assign(new Error('Category not found'), { statusCode: 404 })
    }

    const slugsToPurge: string[] = []

    // Slug rename cascades to every member page so their stored slugs
    // stay `{category.slug}/...` — the app relies on that prefix for
    // URL resolution.
    if (input.slug && input.slug !== existing.slug) {
      const newSlug = input.slug

      const memberPages = await trx
        .selectFrom('pages')
        .select(['id', 'slug'])
        .where('category_id', '=', id)
        .execute()

      for (const page of memberPages) {
        const suffix = page.slug.startsWith(`${existing.slug}/`)
          ? page.slug.slice(existing.slug.length + 1)
          : page.slug
        const updatedSlug = `${newSlug}/${suffix}`
        slugsToPurge.push(page.slug)
        slugsToPurge.push(updatedSlug)
        await trx
          .updateTable('pages')
          .set({ slug: updatedSlug, updated: sql`now()` })
          .where('id', '=', page.id)
          .execute()
      }

      await trx
        .updateTable('categories')
        .set({ slug: newSlug, updated: sql`now()` })
        .where('id', '=', id)
        .execute()
    }

    if (input.menu_order !== undefined) {
      await trx
        .updateTable('categories')
        .set({ menu_order: input.menu_order, updated: sql`now()` })
        .where('id', '=', id)
        .execute()
    }

    if (input.translations) {
      let translationsChanged = false
      for (const t of input.translations) {
        const name = t.name.trim()
        const priorRow = await trx
          .selectFrom('category_translations')
          .select(['id', 'name'])
          .where('category_id', '=', id)
          .where('locale', '=', t.locale)
          .executeTakeFirst()

        if (!name) {
          if (priorRow) {
            await trx
              .deleteFrom('category_translations')
              .where('id', '=', priorRow.id)
              .execute()
            translationsChanged = true
          }
          continue
        }

        if (priorRow) {
          if (priorRow.name !== name) {
            await trx
              .updateTable('category_translations')
              .set({ name, updated: sql`now()` })
              .where('id', '=', priorRow.id)
              .execute()
            translationsChanged = true
          }
        } else {
          await trx
            .insertInto('category_translations')
            .values({ category_id: id, locale: t.locale, name })
            .execute()
          translationsChanged = true
        }
      }

      // Every member page's cached response embeds the category's name
      // as its `menu_parent.title`. When the category name changes in
      // any locale, purge every member so readers see the new label.
      if (translationsChanged) {
        const memberSlugs = await trx
          .selectFrom('pages')
          .select('slug')
          .where('category_id', '=', id)
          .execute()
        for (const { slug } of memberSlugs) {
          slugsToPurge.push(slug)
        }
      }
    }

    const fresh = await trx
      .selectFrom('categories')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirstOrThrow()

    return { category: fresh, slugsToPurge }
  })
}

export async function deleteCategory(id: string): Promise<void> {
  const pageCount = await db
    .selectFrom('pages')
    .select(sql<number>`COUNT(*)::int`.as('count'))
    .where('category_id', '=', id)
    .executeTakeFirstOrThrow()
  if (pageCount.count > 0) {
    throw Object.assign(new Error('Category still has pages'), { statusCode: 409 })
  }
  await db.deleteFrom('categories').where('id', '=', id).execute()
}

// Bulk-reorder pages within a category. Enforces that every passed id
// belongs to the target category so a malformed client payload can't
// reassign menu_order across categories.
export async function reorderCategoryPages(
  categoryId: string,
  pageIds: string[]
): Promise<void> {
  if (pageIds.length === 0) return

  await db.transaction().execute(async trx => {
    const existing = await trx
      .selectFrom('pages')
      .select('id')
      .where('category_id', '=', categoryId)
      .where('id', 'in', pageIds)
      .execute()
    if (existing.length !== pageIds.length) {
      throw Object.assign(
        new Error('Some page IDs do not belong to this category'),
        { statusCode: 400 }
      )
    }

    for (let i = 0; i < pageIds.length; i++) {
      const pageId = pageIds[i]
      if (!pageId) continue
      await trx
        .updateTable('pages')
        .set({ menu_order: i, updated: sql`now()` })
        .where('id', '=', pageId)
        .execute()
    }
  })
}

// Convenience helper for mutation endpoints that may touch many slugs
// at once (category rename cascades, bulk reorders, cross-category
// moves). Dedupes and purges each slug across all enabled locales.
export async function purgeSlugs(slugs: string[]): Promise<void> {
  const unique = Array.from(new Set(slugs.filter(Boolean)))
  await Promise.all(unique.map(s => purgeCmsPage(s)))
}
