// Admin: upsert a page's translation for a given locale. Saves as
// draft unless `status: 'published'` is passed.
//
// Calls upsertCmsPageTranslation, which now applies tiptapValidate
// (the XSS allowlist) and the lossy-overwrite guard. Admin clients
// only ever pass body_json (no markdown), so the lossy guard is
// effectively inert here — it only fires when body_markdown is the
// input branch.

import { defineEventHandler, getRouterParam, readBody, createError, getHeader } from 'h3'
import { requirePermission } from '../../../../../utils/rbac'
import {
  upsertCmsPageTranslation,
  applyTranslationInvalidations
} from '../../../../../services/cmsTranslations'
import { logEvent } from '../../../../../utils/activity-logger'

interface Body {
  title?: string
  body_json?: Record<string, any>
  excerpt?: string | null
  featured_image?: string | null
  meta_title?: string | null
  meta_description?: string | null
  og_image?: string | null
  status?: 'draft' | 'published'
}

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'pages.write')
  const id = getRouterParam(event, 'id')
  const locale = getRouterParam(event, 'locale')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })
  if (!locale) throw createError({ statusCode: 400, statusMessage: 'locale is required' })

  const body = await readBody<Body>(event)
  if (!body?.body_json || typeof body.body_json !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'body_json is required' })
  }

  try {
    const result = await upsertCmsPageTranslation({
      page_id: id,
      locale,
      title: (body.title ?? '').trim(),
      body_json: body.body_json,
      excerpt: body.excerpt ?? null,
      featured_image: body.featured_image ?? null,
      meta_title: body.meta_title ?? null,
      meta_description: body.meta_description ?? null,
      og_image: body.og_image ?? null,
      status: body.status
    })

    logEvent({
      eventType: 'UPDATE',
      tableName: 'page_translations',
      recordId: result.translation.id,
      userId: authUser.userId,
      userAgent: getHeader(event, 'user-agent') || undefined,
      metadata: { page_id: id, locale, status: result.translation.status, source: 'admin-ui' }
    })

    await applyTranslationInvalidations(result.pageSlug, result.categoryId, locale)
    return result.translation
  } catch (e: any) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, statusMessage: e.statusMessage || e.message })
    }
    console.error('[admin/pages/[id]/translations/[locale].put] unhandled error', { id, locale, error: e })
    const message = e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 500, statusMessage: message || 'Unexpected server error' })
  }
})
