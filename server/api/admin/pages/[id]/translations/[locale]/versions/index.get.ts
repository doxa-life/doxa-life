// Admin: list version snapshots for a (page, locale), newest first.
// Lightweight summary — body_json is omitted to keep the list small;
// the detail endpoint fetches the full snapshot when the editor opens
// a single version.

import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requirePermission } from '../../../../../../../utils/rbac'
import { db } from '../../../../../../../utils/database'
import { ENABLED_LANGUAGE_CODES } from '~~/config/languages'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.view')

  const id = getRouterParam(event, 'id')
  const locale = getRouterParam(event, 'locale')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })
  if (!locale) throw createError({ statusCode: 400, statusMessage: 'locale is required' })
  if (!ENABLED_LANGUAGE_CODES.includes(locale)) {
    throw createError({ statusCode: 400, statusMessage: 'locale is not enabled' })
  }

  const rows = await db
    .selectFrom('page_translation_versions as v')
    .leftJoin('users as u', 'u.id', 'v.created_by_user_id')
    .select([
      'v.id',
      'v.created',
      'v.status',
      'v.source',
      'v.title',
      'v.created_by_user_id',
      'u.display_name as created_by_name'
    ])
    .where('v.page_id', '=', id)
    .where('v.locale', '=', locale)
    .orderBy('v.created', 'desc')
    .execute()

  return {
    versions: rows.map(r => ({
      id: r.id,
      created: r.created,
      status: r.status,
      source: r.source,
      title: r.title,
      created_by: r.created_by_user_id
        ? { id: r.created_by_user_id, name: r.created_by_name ?? 'Unknown user' }
        : null
    }))
  }
})
