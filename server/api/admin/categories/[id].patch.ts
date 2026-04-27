// Admin: update a category — slug (cascades to every member page
// slug), menu_order, and per-locale names. Returns the updated row.

import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { db } from '../../../utils/database'
import { updateCategory, purgeSlugs } from '../../../database/categories'
import { logUpdate } from '../../../utils/activity-logger'
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
  await requirePermission(event, 'pages.write')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<Body>(event)

  const input: Parameters<typeof updateCategory>[1] = {}
  if (body?.slug != null) {
    const slug = String(body.slug).trim().replace(/^\/+|\/+$/g, '')
    if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Category slug must be lowercase letters, digits, and dashes (no slashes)'
      })
    }

    const collidingPage = await db
      .selectFrom('pages')
      .select('id')
      .where('slug', '=', slug)
      .where('category_id', 'is', null)
      .executeTakeFirst()
    if (collidingPage) {
      throw createError({
        statusCode: 409,
        statusMessage: `A page already uses the slug "${slug}".`
      })
    }

    input.slug = slug
  }
  if (body?.menu_order !== undefined) {
    input.menu_order = Number(body.menu_order) || 0
  }
  const translations = normalizeTranslations(body?.translations)
  if (translations) input.translations = translations

  try {
    const result = await updateCategory(id, input)
    await purgeSlugs(result.slugsToPurge)
    logUpdate('categories', id, event, {
      changes: Object.keys(input),
      slugsPurged: result.slugsToPurge.length
    })
    return result.category
  } catch (e: any) {
    if (e?.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'A category with that slug already exists' })
    }
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, statusMessage: e.message })
    }
    throw e
  }
})
