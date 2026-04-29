// Admin: one-click translate an EN (or other source) translation of a
// CMS page into one or more target locales. Uses DeepL for title,
// excerpt, meta_title, meta_description, and body_json. Each target
// translation is upserted with the caller-chosen `status` (draft or
// published, default draft). `overwrite` controls whether to replace
// translations that already exist for a given locale.
//
// All workflow logic — DeepL calls, body walking, upsert with
// validation, per-locale cache purge — lives in cmsTranslate.translatePage.
// This route stays thin.

import { defineEventHandler, getRouterParam, readBody, createError, getHeader } from 'h3'
import { requirePermission } from '../../../../utils/rbac'
import { translatePage } from '../../../../services/cmsTranslate'
import { logEvent } from '../../../../utils/activity-logger'

interface Body {
  sourceLocale?: string
  targetLocales?: string[]
  overwrite?: boolean
  status?: 'draft' | 'published'
}

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'pages.write')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<Body>(event)

  try {
    const result = await translatePage({
      page_id: id,
      source_locale: body?.sourceLocale,
      target_locales: body?.targetLocales ?? [],
      overwrite: body?.overwrite,
      status: body?.status
    })

    logEvent({
      eventType: 'UPDATE',
      tableName: 'pages',
      recordId: id,
      userId: authUser.userId,
      userAgent: getHeader(event, 'user-agent') || undefined,
      metadata: {
        event: 'TRANSLATE',
        source_locale: result.source_locale,
        // Reflect what the service actually attempted, not what the
        // caller requested — the service silently filters out
        // disabled/self-targeted locales before translating.
        target_locales: result.results.map(r => r.locale),
        results: result.results,
        source: 'admin-ui'
      }
    })

    // Match the legacy admin response shape so the Vue UI doesn't
    // need to change. Map service's {ok, skipped, error} to the
    // wire shape the editor expects: {locale, skipped?, error?}.
    return {
      results: result.results.map(r => ({
        locale: r.locale,
        ...(r.skipped ? { skipped: true } : {}),
        ...(r.error ? { error: r.error } : {})
      }))
    }
  } catch (e: any) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, statusMessage: e.statusMessage || e.message })
    }
    throw e
  }
})
