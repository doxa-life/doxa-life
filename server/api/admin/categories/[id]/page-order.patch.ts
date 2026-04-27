// Admin: apply a new menu_order to a category's member pages. The
// request body is the drag-and-drop order the admin committed in the
// UI: `{ pageIds: [firstId, secondId, ...] }`. The handler writes
// index positions into `pages.menu_order` in a single transaction and
// purges cache for every affected slug.

import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requirePermission } from '../../../../utils/rbac'
import { reorderCategoryPages, getCategoryPages, purgeSlugs } from '../../../../database/categories'
import { logUpdate } from '../../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.write')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<{ pageIds?: unknown }>(event)
  if (!Array.isArray(body?.pageIds)) {
    throw createError({ statusCode: 400, statusMessage: 'pageIds array required' })
  }

  const pageIds = body.pageIds
    .map(v => (typeof v === 'string' ? v : null))
    .filter((v): v is string => Boolean(v))

  if (pageIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'pageIds cannot be empty' })
  }

  try {
    await reorderCategoryPages(id, pageIds)
  } catch (e: any) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, statusMessage: e.message })
    }
    throw e
  }

  const pages = await getCategoryPages(id)
  await purgeSlugs(pages.map(p => p.slug))
  logUpdate('categories', id, event, { event: 'reorder', pageCount: pageIds.length })
  return { ok: true, pageIds }
})
