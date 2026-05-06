// Admin: fetch a single version snapshot by id. Returns the full
// content (body_json + all metadata) so the editor's restore action
// can hydrate the form fields without writing anything to the DB.

import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requirePermission } from '../../../../../../../utils/rbac'
import { db } from '../../../../../../../utils/database'
import { renderTiptap } from '../../../../../../../utils/renderTiptap'
import { ENABLED_LANGUAGE_CODES } from '~~/config/languages'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.view')

  const id = getRouterParam(event, 'id')
  const locale = getRouterParam(event, 'locale')
  const versionId = getRouterParam(event, 'versionId')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })
  if (!locale) throw createError({ statusCode: 400, statusMessage: 'locale is required' })
  if (!versionId) throw createError({ statusCode: 400, statusMessage: 'versionId is required' })
  if (!ENABLED_LANGUAGE_CODES.includes(locale)) {
    throw createError({ statusCode: 400, statusMessage: 'locale is not enabled' })
  }

  const row = await db
    .selectFrom('page_translation_versions as v')
    .leftJoin('users as u', 'u.id', 'v.created_by_user_id')
    .select([
      'v.id',
      'v.page_id',
      'v.locale',
      'v.title',
      'v.body_json',
      'v.excerpt',
      'v.featured_image',
      'v.meta_title',
      'v.meta_description',
      'v.og_image',
      'v.status',
      'v.source',
      'v.user_agent',
      'v.created',
      'v.created_by_user_id',
      'u.display_name as created_by_name'
    ])
    .where('v.id', '=', versionId)
    .where('v.page_id', '=', id)
    .where('v.locale', '=', locale)
    .executeTakeFirst()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Version not found' })

  return {
    id: row.id,
    page_id: row.page_id,
    locale: row.locale,
    title: row.title,
    body_json: row.body_json,
    body_html: renderTiptap(row.body_json),
    excerpt: row.excerpt,
    featured_image: row.featured_image,
    meta_title: row.meta_title,
    meta_description: row.meta_description,
    og_image: row.og_image,
    status: row.status,
    source: row.source,
    user_agent: row.user_agent,
    created: row.created,
    created_by: row.created_by_user_id
      ? { id: row.created_by_user_id, name: row.created_by_name ?? 'Unknown user' }
      : null
  }
})
