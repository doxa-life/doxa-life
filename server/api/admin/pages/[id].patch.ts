// Admin: update a page's metadata (slug, category_id, menu_order,
// theme, custom_css). Changing `category_id` auto-rewrites the slug
// prefix to stay under the new category (old URL 404s), and both the
// old and new cached URLs are purged.
//
// All slug-rewrite, validation, and cache fan-out logic lives in the
// cmsPages service; the route stays thin.

import { defineEventHandler, getRouterParam, readBody, createError, getHeader } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import {
  updateCmsPage,
  applyPageInvalidations
} from '../../../services/cmsPages'
import { logEvent } from '../../../utils/activity-logger'

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'pages.write')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody<{
    slug?: string
    category_id?: string | null
    menu_order?: number
    theme?: string
    custom_css?: string | null
  }>(event)

  if (body?.theme !== undefined && !['default', 'green'].includes(body.theme)) {
    throw createError({ statusCode: 400, statusMessage: 'theme must be one of: default, green' })
  }

  // Service normalizes the slug; admin just forwards. Empty/whitespace
  // custom_css folds to null at this boundary (matches legacy admin
  // behavior); a non-empty custom_css keeps its original form,
  // including any leading/trailing whitespace the author wrote.
  const slugIn = body?.slug != null ? String(body.slug) : undefined
  let customCssIn: string | null | undefined
  if (body?.custom_css === undefined) {
    customCssIn = undefined
  } else if (body.custom_css == null) {
    customCssIn = null
  } else {
    const raw = String(body.custom_css)
    customCssIn = raw && raw.trim() ? raw : null
  }

  try {
    const result = await updateCmsPage({
      id,
      slug: slugIn,
      category_id: body?.category_id === undefined ? undefined : (body.category_id ? String(body.category_id) : null),
      menu_order: body?.menu_order !== undefined ? (Number(body.menu_order) || 0) : undefined,
      theme: body?.theme as 'default' | 'green' | undefined,
      custom_css: customCssIn
    })

    if (Object.keys(result.changes).length > 0) {
      // Fire-and-forget audit (matches legacy admin behavior; the audit
      // runs after the data write commits).
      logEvent({
        eventType: 'UPDATE',
        tableName: 'pages',
        recordId: id,
        userId: authUser.userId,
        userAgent: getHeader(event, 'user-agent') || undefined,
        metadata: { changes: result.changes, source: 'admin-ui' }
      })
    }
    await applyPageInvalidations(result.slugsToPurge, result.categoriesToPurge)
    return result.page
  } catch (e: any) {
    if (e?.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'A page with that slug already exists' })
    }
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, statusMessage: e.statusMessage || e.message })
    }
    throw e
  }
})
