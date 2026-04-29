// Admin: set a translation's status to published / draft.

import { defineEventHandler, getRouterParam, readBody, createError, getHeader } from 'h3'
import { requirePermission } from '../../../../utils/rbac'
import {
  setCmsTranslationStatus,
  applyTranslationInvalidations
} from '../../../../services/cmsTranslations'
import { logEvent } from '../../../../utils/activity-logger'

interface Body {
  locale?: string
  status?: 'draft' | 'published'
}

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'pages.publish')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<Body>(event)
  const locale = body?.locale
  const status = body?.status
  if (!locale) throw createError({ statusCode: 400, statusMessage: 'locale is required' })
  if (status !== 'draft' && status !== 'published') {
    throw createError({ statusCode: 400, statusMessage: 'status must be draft or published' })
  }

  try {
    const result = await setCmsTranslationStatus({ page_id: id, locale, status })
    logEvent({
      eventType: 'UPDATE',
      tableName: 'page_translations',
      recordId: result.translation.id,
      userId: authUser.userId,
      userAgent: getHeader(event, 'user-agent') || undefined,
      metadata: {
        event: status === 'published' ? 'PUBLISH' : 'UNPUBLISH',
        locale,
        source: 'admin-ui'
      }
    })
    await applyTranslationInvalidations(result.pageSlug, result.categoryId, locale)
    return { ok: true }
  } catch (e: any) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, statusMessage: e.statusMessage || e.message })
    }
    throw e
  }
})
