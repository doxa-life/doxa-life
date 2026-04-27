// Admin: one-click translate an EN (or other source) translation of a
// CMS page into one or more target locales. Uses DeepL for title,
// excerpt, meta_title, meta_description, and body_json. Each target
// translation is upserted as a draft (overwrite controllable via
// `overwrite` flag); the editor reviews + publishes manually.

import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requirePermission } from '../../../../utils/rbac'
import { db } from '../../../../utils/database'
import { upsertTranslation, getPageSlug } from '../../../../database/pages'
import { translateTexts, translateTiptapContent, isDeepLConfigured } from '../../../../utils/deepl'
import { ENABLED_LANGUAGE_CODES } from '../../../../../config/languages'
import { logUpdate } from '../../../../utils/activity-logger'
import { purgeCmsPage } from '../../../../utils/cmsCache'

interface Body {
  sourceLocale?: string
  targetLocales?: string[]
  overwrite?: boolean
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.write')
  if (!isDeepLConfigured()) {
    throw createError({ statusCode: 500, statusMessage: 'DEEPL_API_KEY is not configured' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<Body>(event)
  const sourceLocale = body?.sourceLocale ?? 'en'
  const targetLocales = (body?.targetLocales ?? []).filter(l => ENABLED_LANGUAGE_CODES.includes(l) && l !== sourceLocale)
  if (targetLocales.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'targetLocales is empty' })
  }

  const source = await db
    .selectFrom('page_translations')
    .selectAll()
    .where('page_id', '=', id)
    .where('locale', '=', sourceLocale)
    .executeTakeFirst()
  if (!source) {
    throw createError({ statusCode: 404, statusMessage: `No ${sourceLocale} translation to translate from` })
  }

  const results: Array<{ locale: string; skipped?: boolean; error?: string }> = []

  for (const target of targetLocales) {
    // Respect overwrite=false on existing non-draft translations so published content isn't silently replaced
    if (!body?.overwrite) {
      const existing = await db
        .selectFrom('page_translations')
        .select(['id', 'status'])
        .where('page_id', '=', id)
        .where('locale', '=', target)
        .executeTakeFirst()
      if (existing) {
        results.push({ locale: target, skipped: true })
        continue
      }
    }

    try {
      const textFields = [
        source.title ?? '',
        source.excerpt ?? '',
        source.meta_title ?? '',
        source.meta_description ?? ''
      ]
      const [translatedTitle, translatedExcerpt, translatedMetaTitle, translatedMetaDescription]
        = await translateTexts(textFields, target, sourceLocale)
      const translatedBody = await translateTiptapContent(source.body_json as any, target, sourceLocale)

      await upsertTranslation({
        page_id: id,
        locale: target,
        title: translatedTitle || source.title,
        body_json: translatedBody as any,
        excerpt: translatedExcerpt || null,
        featured_image: source.featured_image,
        meta_title: translatedMetaTitle || null,
        meta_description: translatedMetaDescription || null,
        og_image: source.og_image,
        status: 'draft'
      })
      results.push({ locale: target })
    } catch (e: any) {
      console.error(`[DeepL] translate page ${id} → ${target} failed:`, e?.message || e)
      results.push({ locale: target, error: e?.message || 'translation failed' })
    }
  }

  logUpdate('pages', id, event, {
    event: 'TRANSLATE',
    source_locale: sourceLocale,
    target_locales: targetLocales,
    results
  })

  // Only purge locales whose translations actually got written (skipped
  // ones didn't change; errored ones didn't commit).
  const purgedLocales = results.filter(r => !r.skipped && !r.error).map(r => r.locale)
  if (purgedLocales.length > 0) {
    const slug = await getPageSlug(id)
    if (slug) await purgeCmsPage(slug, purgedLocales)
  }

  return { results }
})
