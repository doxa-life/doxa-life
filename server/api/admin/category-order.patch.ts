// Admin: apply a new menu_order to a set of sibling categories. The
// request body is the drag-and-drop order the admin committed in the
// UI: `{ parentId: string | null, categoryIds: [firstId, ...] }`.
// `parentId` scopes the move — null reorders the root level, otherwise
// it reorders the children of that parent. The handler writes index
// positions into `categories.menu_order` in a single transaction, then
// purges the affected subtree's cached pages (the sidebar nav tree and
// the parent landing-page grid both reflect category order).
//
// Lives at /api/admin/category-order rather than under categories/ on
// purpose: a static sibling of categories/[id] would make the typed
// $fetch for /api/admin/categories/${id} ambiguous and narrow its
// allowed methods. This mirrors page-order, which sidesteps that by
// living under the [id] segment — reorder can't (parentId may be null).

import { defineEventHandler, readBody, createError } from 'h3'
import { requirePermission } from '../../utils/rbac'
import { reorderCategories } from '../../database/categories'
import { purgeCmsCategory } from '../../utils/cmsCache'
import { logUpdate } from '../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.write')

  const body = await readBody<{ parentId?: unknown; categoryIds?: unknown }>(event)
  if (!Array.isArray(body?.categoryIds)) {
    throw createError({ statusCode: 400, statusMessage: 'categoryIds array required' })
  }

  const parentId =
    body.parentId === undefined || body.parentId === null
      ? null
      : String(body.parentId)

  const categoryIds = body.categoryIds
    .map(v => (typeof v === 'string' ? v : null))
    .filter((v): v is string => Boolean(v))

  if (categoryIds.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'categoryIds cannot be empty' })
  }

  try {
    await reorderCategories(parentId, categoryIds)
  } catch (e: any) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, statusMessage: e.message })
    }
    throw e
  }

  // Category order feeds the per-page sidebar (shared across the whole
  // top-level subtree) and the parent's landing-page grid. purgeCmsCategory
  // walks up to the top-level ancestor and purges that entire subtree, so
  // one call per affected top-level tree covers it. Reordering children of
  // a parent shares one tree; reordering roots touches each root's tree.
  if (parentId) {
    await purgeCmsCategory(parentId)
  } else {
    await Promise.all(categoryIds.map(id => purgeCmsCategory(id)))
  }

  logUpdate('categories', parentId ?? 'root', event, {
    event: 'reorder',
    parentId,
    categoryCount: categoryIds.length
  })
  return { ok: true, categoryIds }
})
