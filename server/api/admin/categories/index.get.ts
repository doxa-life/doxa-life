// Admin: list every category with its per-locale names and the number
// of pages currently attached, plus the computed URL path for each
// (so the admin UI can render a tree with breadcrumbs/parent labels
// without re-walking the chain client-side).

import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { listCmsCategories } from '../../../services/cmsCategories'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.view')
  const rows = await listCmsCategories()
  return { rows }
})
