// Admin: list every category with its per-locale names and the number
// of pages currently attached. Powers the category dropdown on the
// page editor and the categories admin list.

import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { listCategoriesWithTranslations } from '../../../database/categories'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.view')
  const rows = await listCategoriesWithTranslations()
  return { rows }
})
