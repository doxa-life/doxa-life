// Admin: fetch a single category with translations and its ordered
// member pages (each annotated with the English title for the admin
// reorder list).

import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { db } from '../../../utils/database'
import { getCategory, getCategoryPages } from '../../../database/categories'
import { sql } from 'kysely'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.view')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const record = await getCategory(id)
  if (!record) throw createError({ statusCode: 404, statusMessage: 'Category not found' })

  const pages = await getCategoryPages(id)
  if (pages.length === 0) {
    return { ...record, pages: [] }
  }

  const pageIds = pages.map(p => p.id)
  const titleRows = await db
    .selectFrom('page_translations')
    .select([
      'page_id',
      sql<string | null>`MAX(CASE WHEN locale = 'en' THEN title END)`.as('title_en'),
      sql<number>`COUNT(CASE WHEN status = 'published' THEN 1 END)::int`.as('published_count'),
      sql<number>`COUNT(*)::int`.as('translation_count')
    ])
    .where('page_id', 'in', pageIds)
    .groupBy('page_id')
    .execute()

  const byId = new Map<string, { title_en: string | null; published_count: number; translation_count: number }>()
  for (const t of titleRows) {
    byId.set(t.page_id, {
      title_en: t.title_en,
      published_count: Number(t.published_count),
      translation_count: Number(t.translation_count)
    })
  }

  return {
    ...record,
    pages: pages.map(p => ({
      id: p.id,
      slug: p.slug,
      menu_order: p.menu_order,
      title_en: byId.get(p.id)?.title_en ?? null,
      published_count: byId.get(p.id)?.published_count ?? 0,
      translation_count: byId.get(p.id)?.translation_count ?? 0
    }))
  }
})
