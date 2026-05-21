// Admin: delete a CMS page and (via cascade) all its translations.

import { defineEventHandler, getRouterParam, createError, getHeader } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import {
  deleteCmsPage,
  applyPageInvalidations
} from '../../../services/cmsPages'
import { logEvent } from '../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'pages.write')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  try {
    const { slug, url, categoryId } = await deleteCmsPage(id)
    logEvent({
      eventType: 'DELETE',
      tableName: 'pages',
      recordId: id,
      userId: authUser.userId,
      userAgent: getHeader(event, 'user-agent') || undefined,
      metadata: { slug, url, source: 'admin-ui' }
    })
    await applyPageInvalidations([url], categoryId ? [categoryId] : [])
    return { ok: true }
  } catch (e: any) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, statusMessage: e.statusMessage || e.message })
    }
    throw e
  }
})
