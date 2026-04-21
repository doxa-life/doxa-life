// Admin: set a translation's status to published / draft.

import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requirePermission } from '../../../../utils/rbac'
import { setTranslationStatus } from '../../../../database/pages'
import { ENABLED_LANGUAGE_CODES } from '../../../../../config/languages'
import { logUpdate } from '../../../../utils/activity-logger'

interface Body {
  locale?: string
  status?: 'draft' | 'published'
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.manage')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<Body>(event)
  const locale = body?.locale
  const status = body?.status
  if (!locale || !ENABLED_LANGUAGE_CODES.includes(locale)) {
    throw createError({ statusCode: 400, statusMessage: 'locale is not enabled' })
  }
  if (status !== 'draft' && status !== 'published') {
    throw createError({ statusCode: 400, statusMessage: 'status must be draft or published' })
  }

  await setTranslationStatus(id, locale, status)
  logUpdate('page_translations', id, event, {
    event: status === 'published' ? 'PUBLISH' : 'UNPUBLISH',
    locale
  })
  return { ok: true }
})
