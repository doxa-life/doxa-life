// Admin: create a new CMS page (no translations). Returns the row.
// Translation is added separately via PUT /api/admin/pages/[id]/translations/[locale].

import { defineEventHandler, readBody, createError } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { createPage } from '../../../database/pages'
import { logCreate } from '../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.manage')
  const body = await readBody<{ slug?: string; parent_slug?: string | null; menu_order?: number }>(event)

  const slug = (body?.slug ?? '').trim().replace(/^\/+|\/+$/g, '')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'slug is required' })
  }
  if (!/^[a-z0-9][a-z0-9/-]*$/.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'slug must be lowercase letters, digits, dashes, and slashes' })
  }

  const parent_slug = body?.parent_slug ? String(body.parent_slug).trim() : null
  const menu_order = Number.isFinite(body?.menu_order) ? Number(body.menu_order) : 0

  try {
    const page = await createPage({ slug, parent_slug, menu_order })
    logCreate('pages', page.id, event, { slug, parent_slug, menu_order })
    return page
  } catch (e: any) {
    if (e?.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'A page with that slug already exists' })
    }
    throw e
  }
})
