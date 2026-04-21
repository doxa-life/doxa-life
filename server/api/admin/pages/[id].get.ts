// Admin: fetch a single page with all its translations (any status).

import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { db } from '../../../utils/database'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.view')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const page = await db
    .selectFrom('pages')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
  if (!page) throw createError({ statusCode: 404, statusMessage: 'Page not found' })

  const translations = await db
    .selectFrom('page_translations')
    .selectAll()
    .where('page_id', '=', id)
    .orderBy('locale', 'asc')
    .execute()

  return { page, translations }
})
