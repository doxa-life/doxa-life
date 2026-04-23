// Admin: delete a CMS page and (via cascade) all its translations.

import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { deletePage } from '../../../database/pages'
import { db } from '../../../utils/database'
import { logDelete } from '../../../utils/activity-logger'
import { purgeCmsPage, purgeCmsCategory } from '../../../utils/cmsCache'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.manage')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const existing = await db
    .selectFrom('pages')
    .select(['id', 'slug', 'category_id'])
    .where('id', '=', id)
    .executeTakeFirst()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Page not found' })

  await deletePage(id)
  logDelete('pages', id, event, { slug: existing.slug })
  await purgeCmsPage(existing.slug)
  // Removed entry leaves stale `children[]` on every surviving sibling.
  if (existing.category_id) {
    await purgeCmsCategory(existing.category_id, existing.slug)
  }
  return { ok: true }
})
