// Admin: create a new CMS page (no translations). Returns the row.
// Translation is added separately via PUT /api/admin/pages/[id]/translations/[locale].

import { defineEventHandler, readBody, createError } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { createPage } from '../../../database/pages'
import { db } from '../../../utils/database'
import { logCreate } from '../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.manage')
  const body = await readBody<{ slug?: string; category_id?: string | null; menu_order?: number }>(event)

  const slug = (body?.slug ?? '').trim().replace(/^\/+|\/+$/g, '')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'slug is required' })
  }
  if (!/^[a-z0-9][a-z0-9/-]*$/.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'slug must be lowercase letters, digits, dashes, and slashes' })
  }

  const category_id = body?.category_id ? String(body.category_id) : null
  const menu_order = Number.isFinite(body?.menu_order) ? Number(body.menu_order) : 0

  // When a category is picked, the slug must live under its prefix so
  // public URL resolution stays consistent. Uncategorized pages can
  // have any slug shape, but they can't collide with a category slug —
  // that would make `/contact` ambiguous.
  if (category_id) {
    const category = await db
      .selectFrom('categories')
      .select(['slug'])
      .where('id', '=', category_id)
      .executeTakeFirst()
    if (!category) {
      throw createError({ statusCode: 400, statusMessage: 'Category not found' })
    }
    if (!slug.startsWith(`${category.slug}/`)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Slug must start with "${category.slug}/"`
      })
    }
  } else {
    const collidingCategory = await db
      .selectFrom('categories')
      .select('id')
      .where('slug', '=', slug)
      .executeTakeFirst()
    if (collidingCategory) {
      throw createError({
        statusCode: 409,
        statusMessage: `"${slug}" is already used by a category.`
      })
    }
  }

  try {
    const page = await createPage({ slug, category_id, menu_order })
    logCreate('pages', page.id, event, { slug, category_id, menu_order })
    return page
  } catch (e: any) {
    if (e?.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'A page with that slug already exists' })
    }
    throw e
  }
})
