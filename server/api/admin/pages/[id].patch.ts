// Admin: update a page's metadata (slug, parent_slug, menu_order).

import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { db } from '../../../utils/database'
import { logUpdate } from '../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.manage')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<{ slug?: string; parent_slug?: string | null; menu_order?: number }>(event)

  const set: Record<string, unknown> = {}
  if (body?.slug != null) {
    const slug = String(body.slug).trim().replace(/^\/+|\/+$/g, '')
    if (!slug || !/^[a-z0-9][a-z0-9/-]*$/.test(slug)) {
      throw createError({ statusCode: 400, statusMessage: 'slug must be lowercase letters, digits, dashes, and slashes' })
    }
    set.slug = slug
  }
  if (body?.parent_slug !== undefined) {
    set.parent_slug = body.parent_slug ? String(body.parent_slug).trim() : null
  }
  if (body?.menu_order !== undefined) {
    set.menu_order = Number(body.menu_order) || 0
  }
  set.updated = new Date()

  try {
    const updated = await db
      .updateTable('pages')
      .set(set as any)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow()
    logUpdate('pages', id, event, { changes: set })
    return updated
  } catch (e: any) {
    if (e?.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'A page with that slug already exists' })
    }
    throw e
  }
})
