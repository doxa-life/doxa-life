// Admin: update a page's metadata (slug, category_id, menu_order,
// theme, custom_css). Changing `category_id` auto-rewrites the slug
// prefix to stay under the new category (old URL 404s), and both the
// old and new cached URLs are purged.

import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { db } from '../../../utils/database'
import { setPageCategory } from '../../../database/pages'
import { logUpdate } from '../../../utils/activity-logger'
import { purgeCmsPage } from '../../../utils/cmsCache'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.manage')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<{
    slug?: string
    category_id?: string | null
    menu_order?: number
    theme?: string
    custom_css?: string | null
  }>(event)

  const existing = await db
    .selectFrom('pages')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Page not found' })

  const slugsToPurge = new Set<string>([existing.slug])
  let currentCategoryId = existing.category_id

  // Category moves are handled via setPageCategory so the slug prefix
  // is rewritten in the same transaction. Skip if unchanged.
  if (body?.category_id !== undefined) {
    const nextCategoryId = body.category_id ? String(body.category_id) : null
    if (nextCategoryId !== existing.category_id) {
      const { page: moved, slugsToPurge: moveSlugs } = await setPageCategory(id, nextCategoryId)
      moveSlugs.forEach(s => slugsToPurge.add(s))
      currentCategoryId = moved.category_id
    }
  }

  const set: Record<string, unknown> = {}
  if (body?.slug != null) {
    const slug = String(body.slug).trim().replace(/^\/+|\/+$/g, '')
    if (!slug || !/^[a-z0-9][a-z0-9/-]*$/.test(slug)) {
      throw createError({ statusCode: 400, statusMessage: 'slug must be lowercase letters, digits, dashes, and slashes' })
    }

    if (currentCategoryId) {
      const category = await db
        .selectFrom('categories')
        .select('slug')
        .where('id', '=', currentCategoryId)
        .executeTakeFirst()
      if (category && !slug.startsWith(`${category.slug}/`)) {
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

    set.slug = slug
  }
  if (body?.menu_order !== undefined) {
    set.menu_order = Number(body.menu_order) || 0
  }
  if (body?.theme !== undefined) {
    const theme = String(body.theme)
    if (!['default', 'green'].includes(theme)) {
      throw createError({ statusCode: 400, statusMessage: 'theme must be one of: default, green' })
    }
    set.theme = theme
  }
  if (body?.custom_css !== undefined) {
    const raw = body.custom_css == null ? null : String(body.custom_css)
    set.custom_css = raw && raw.trim() ? raw : null
  }

  try {
    let updated = existing
    if (Object.keys(set).length > 0) {
      set.updated = new Date()
      updated = await db
        .updateTable('pages')
        .set(set as any)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirstOrThrow()
    } else {
      updated = await db
        .selectFrom('pages')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirstOrThrow()
    }

    slugsToPurge.add(updated.slug)
    logUpdate('pages', id, event, { changes: { ...set, category_id: updated.category_id } })
    await Promise.all(Array.from(slugsToPurge).map(s => purgeCmsPage(s)))
    return updated
  } catch (e: any) {
    if (e?.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'A page with that slug already exists' })
    }
    throw e
  }
})
