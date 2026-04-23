// Admin: create a new category. Takes a slug and an optional set of
// per-locale names. Slug must be unique against other categories and
// must not collide with any top-level (uncategorized) page slug —
// otherwise the public router can't tell `/contact` (a page) apart from
// `/contact` (a bare category URL).

import { defineEventHandler, readBody, createError } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { db } from '../../../utils/database'
import { createCategory } from '../../../database/categories'
import { logCreate } from '../../../utils/activity-logger'
import { ENABLED_LANGUAGE_CODES } from '../../../../config/languages'

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
  await requirePermission(event, 'pages.manage')
  const body = await readBody<Body>(event)

  const slug = (body?.slug ?? '').trim().replace(/^\/+|\/+$/g, '')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'slug is required' })
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Category slug must be lowercase letters, digits, and dashes (no slashes)'
    })
  }

  const translations = normalizeTranslations(body?.translations)
  if (!translations.some(t => t.locale === 'en' && t.name)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'An English name is required'
    })
  }

  // Guard against collision with an uncategorized page that owns the
  // same slug at the URL root (the public router would ambiguously
  // resolve `/contact`).
  const collidingPage = await db
    .selectFrom('pages')
    .select('id')
    .where('slug', '=', slug)
    .where('category_id', 'is', null)
    .executeTakeFirst()
  if (collidingPage) {
    throw createError({
      statusCode: 409,
      statusMessage: `A page already uses the slug "${slug}". Pick a different category slug or reassign that page.`
    })
  }

  try {
    const category = await createCategory({
      slug,
      menu_order: Number.isFinite(body?.menu_order) ? Number(body.menu_order) : 0,
      translations
    })
    logCreate('categories', category.id, event, { slug, translations: translations.length })
    return category
  } catch (e: any) {
    if (e?.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'A category with that slug already exists' })
    }
    throw e
  }
})
