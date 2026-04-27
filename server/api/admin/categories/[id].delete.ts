// Admin: delete a category. Blocked (409) if any pages still reference
// it — the admin must reassign or delete those pages first.

import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { db } from '../../../utils/database'
import { deleteCategory } from '../../../database/categories'
import { logDelete } from '../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.write')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const existing = await db
    .selectFrom('categories')
    .select(['id', 'slug'])
    .where('id', '=', id)
    .executeTakeFirst()
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Category not found' })

  try {
    await deleteCategory(id)
    logDelete('categories', id, event, { slug: existing.slug })
    return { ok: true }
  } catch (e: any) {
    if (e?.statusCode === 409) {
      throw createError({
        statusCode: 409,
        statusMessage: 'This category still has pages. Move or delete them first.'
      })
    }
    throw e
  }
})
