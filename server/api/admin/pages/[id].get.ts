// Admin: fetch a single page with all its translations (any status).

import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { getCmsPage } from '../../../services/cmsPages'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.view')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const found = await getCmsPage({ id })
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Page not found' })

  // Match the legacy admin contract: `{page, translations}`. The
  // service additionally returns `category_slug`, but the Vue admin
  // doesn't read that field — drop it from the response.
  return { page: found.page, translations: found.translations }
})
