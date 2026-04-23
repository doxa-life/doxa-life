// Admin: upsert a page's translation for a given locale. Saves as
// draft unless `status: 'published'` is passed. All fields optional
// except `title` and `body_json`.

import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requirePermission } from '../../../../../utils/rbac'
import { upsertTranslation } from '../../../../../database/pages'
import { ENABLED_LANGUAGE_CODES } from '../../../../../../config/languages'
import { logUpdate } from '../../../../../utils/activity-logger'
import { db } from '../../../../../utils/database'
import { purgeCmsPage } from '../../../../../utils/cmsCache'

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
  await requirePermission(event, 'pages.manage')
  const id = getRouterParam(event, 'id')
  const locale = getRouterParam(event, 'locale')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })
  if (!locale || !ENABLED_LANGUAGE_CODES.includes(locale)) {
    throw createError({ statusCode: 400, statusMessage: 'locale is not enabled' })
  }

  const page = await db
    .selectFrom('pages')
    .select(['id', 'slug'])
    .where('id', '=', id)
    .executeTakeFirst()
  if (!page) throw createError({ statusCode: 404, statusMessage: 'Page not found' })

  const body = await readBody<Body>(event)
  const title = (body?.title ?? '').trim()
  if (!title) throw createError({ statusCode: 400, statusMessage: 'title is required' })
  if (!body?.body_json || typeof body.body_json !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'body_json is required' })
  }
  if (body.status && body.status !== 'draft' && body.status !== 'published') {
    throw createError({ statusCode: 400, statusMessage: 'status must be draft or published' })
  }

  const translation = await upsertTranslation({
    page_id: id,
    locale,
    title,
    body_json: body.body_json,
    excerpt: body.excerpt ?? null,
    featured_image: body.featured_image ?? null,
    meta_title: body.meta_title ?? null,
    meta_description: body.meta_description ?? null,
    og_image: body.og_image ?? null,
    status: body.status
  })

  logUpdate('page_translations', translation.id, event, {
    page_id: id,
    locale,
    status: translation.status
  })

  await purgeCmsPage(page.slug, [locale])

  return translation
})
