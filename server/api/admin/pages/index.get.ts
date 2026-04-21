// Admin: list all CMS pages with counts of published/draft translations.
// Mirrors the columns the /admin/pages table needs.

import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { db } from '../../../utils/database'
import { sql } from 'kysely'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.view')

  const rows = await db
    .selectFrom('pages')
    .leftJoin('page_translations', 'page_translations.page_id', 'pages.id')
    .select([
      'pages.id',
      'pages.slug',
      'pages.parent_slug',
      'pages.menu_order',
      'pages.updated',
      sql<string | null>`MAX(CASE WHEN page_translations.locale = 'en' THEN page_translations.title END)`.as('title_en'),
      sql<number>`COUNT(page_translations.id)::int`.as('translation_count'),
      sql<number>`COUNT(CASE WHEN page_translations.status = 'published' THEN 1 END)::int`.as('published_count')
    ])
    .groupBy(['pages.id', 'pages.slug', 'pages.parent_slug', 'pages.menu_order', 'pages.updated'])
    .orderBy('pages.parent_slug', 'asc')
    .orderBy('pages.menu_order', 'asc')
    .orderBy('pages.slug', 'asc')
    .execute()

  return { rows }
})
