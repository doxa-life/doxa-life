// Admin: delete a category. Blocked (409) if any pages still reference
// it — the admin must reassign or delete those pages first.

import { defineEventHandler, getRouterParam, createError, getHeader } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { deleteCmsCategory } from '../../../services/cmsCategories'
import { logEvent } from '../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'pages.write')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  try {
    const result = await deleteCmsCategory(id)
    if ('error' in result) {
      throw createError({
        statusCode: 409,
        statusMessage: 'This category still has pages. Move or delete them first.',
        data: {
          attached_page_count: result.attached_page_count,
          sample_slugs: result.sample_slugs
        }
      })
    }
    logEvent({
      eventType: 'DELETE',
      tableName: 'categories',
      recordId: id,
      userId: authUser.userId,
      userAgent: getHeader(event, 'user-agent') || undefined,
      metadata: { slug: result.slug, source: 'admin-ui' }
    })
    return { ok: true }
  } catch (e: any) {
    if (e?.statusCode) {
      throw createError({
        statusCode: e.statusCode,
        statusMessage: e.statusMessage || e.message,
        data: e.data
      })
    }
    throw e
  }
})
