// Admin: list all CMS pages with counts of published/draft translations
// plus category slug + English name for the category column.

import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { db } from '../../../utils/database'
import { sql } from 'kysely'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.view')

  const rows = await db
    .selectFrom('pages')
    .leftJoin('page_translations', 'page_translations.page_id', 'pages.id')
    .leftJoin('categories', 'categories.id', 'pages.category_id')
    .leftJoin('category_translations', join =>
      join
        .onRef('category_translations.category_id', '=', 'categories.id')
        .on('category_translations.locale', '=', 'en')
    )
    .select([
      'pages.id',
      'pages.slug',
      'pages.category_id',
      'pages.menu_order',
      'pages.updated',
      'categories.slug as category_slug',
      sql<string | null>`MAX(category_translations.name)`.as('category_name_en'),
      sql<string | null>`MAX(CASE WHEN page_translations.locale = 'en' THEN page_translations.title END)`.as('title_en'),
      sql<number>`COUNT(page_translations.id)::int`.as('translation_count'),
      sql<number>`COUNT(CASE WHEN page_translations.status = 'published' THEN 1 END)::int`.as('published_count')
    ])
    .groupBy([
      'pages.id',
      'pages.slug',
      'pages.category_id',
      'pages.menu_order',
      'pages.updated',
      'categories.slug'
    ])
    .orderBy('categories.slug', 'asc')
    .orderBy('pages.menu_order', 'asc')
    .orderBy('pages.slug', 'asc')
    .execute()

  return { rows }
})
