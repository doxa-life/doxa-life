// Admin: create a new CMS category. Slug must be unique against other
// categories and must not collide with any uncategorized page slug.
// All validation lives in the cmsCategories service.

import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { createCmsCategory } from '../../../services/cmsCategories'
import { ENABLED_LANGUAGE_CODES } from '../../../../config/languages'
import { logEvent } from '../../../utils/activity-logger'

interface Body {
  slug?: string
  menu_order?: number
  translations?: Record<string, { name?: string }> | Array<{ locale: string; name: string }>
}

function normalizeTranslations(
  raw: Body['translations']
): Array<{ locale: string; name: string }> {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .filter(t => t && typeof t.locale === 'string' && typeof t.name === 'string')
      .map(t => ({ locale: t.locale, name: t.name.trim() }))
      .filter(t => ENABLED_LANGUAGE_CODES.includes(t.locale))
  }
  return Object.entries(raw)
    .filter(([locale]) => ENABLED_LANGUAGE_CODES.includes(locale))
    .map(([locale, value]) => ({
      locale,
      name: typeof value?.name === 'string' ? value.name.trim() : ''
    }))
    .filter(t => t.name)
}

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'pages.write')
  const body = await readBody<Body>(event)

  const translations = normalizeTranslations(body?.translations)

  try {
    const category = await createCmsCategory({
      slug: body?.slug ?? '',
      menu_order: Number.isFinite(body?.menu_order) ? Number(body.menu_order) : 0,
      translations
    })
    logEvent({
      eventType: 'CREATE',
      tableName: 'categories',
      recordId: category.id,
      userId: authUser.userId,
      userAgent: getHeader(event, 'user-agent') || undefined,
      metadata: { slug: category.slug, translations: translations.length, source: 'admin-ui' }
    })
    return category
  } catch (e: any) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, statusMessage: e.statusMessage || e.message })
    }
    throw e
  }
})
