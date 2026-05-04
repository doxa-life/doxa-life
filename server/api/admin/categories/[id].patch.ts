// Admin: update a category — slug (cascades to every member page
// slug), menu_order, and per-locale names. Returns the updated row.

import { defineEventHandler, getRouterParam, readBody, createError, getHeader } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import {
  updateCmsCategory,
  applyCategoryInvalidations
} from '../../../services/cmsCategories'
import { logEvent } from '../../../utils/activity-logger'
import { ENABLED_LANGUAGE_CODES } from '../../../../config/languages'

interface Body {
  slug?: string
  menu_order?: number
  translations?: Record<string, { name?: string }> | Array<{ locale: string; name: string }>
}

function normalizeTranslations(
  raw: Body['translations']
): Array<{ locale: string; name: string }> | undefined {
  if (!raw) return undefined
  if (Array.isArray(raw)) {
    return raw
      .filter(t => t && typeof t.locale === 'string' && ENABLED_LANGUAGE_CODES.includes(t.locale))
      .map(t => ({ locale: t.locale, name: typeof t.name === 'string' ? t.name.trim() : '' }))
  }
  return Object.entries(raw)
    .filter(([locale]) => ENABLED_LANGUAGE_CODES.includes(locale))
    .map(([locale, value]) => ({
      locale,
      name: typeof value?.name === 'string' ? value.name.trim() : ''
    }))
}

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'pages.write')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<Body>(event)
  const translations = normalizeTranslations(body?.translations)

  try {
    const result = await updateCmsCategory({
      id,
      slug: body?.slug != null ? String(body.slug) : undefined,
      menu_order: body?.menu_order !== undefined ? (Number(body.menu_order) || 0) : undefined,
      translations
    })
    await applyCategoryInvalidations(result.slugsToPurge)
    logEvent({
      eventType: 'UPDATE',
      tableName: 'categories',
      recordId: id,
      userId: authUser.userId,
      userAgent: getHeader(event, 'user-agent') || undefined,
      metadata: {
        changes: (['slug', 'menu_order', 'translations'] as const).filter(k => body?.[k] !== undefined),
        slugsPurged: result.slugsToPurge.length,
        source: 'admin-ui'
      }
    })
    return result.category
  } catch (e: any) {
    if (e?.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'A category with that slug already exists' })
    }
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, statusMessage: e.statusMessage || e.message })
    }
    throw e
  }
})
