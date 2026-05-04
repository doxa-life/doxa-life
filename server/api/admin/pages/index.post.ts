// Admin: create a new CMS page (no translations). Returns the row.
// Translation is added separately via PUT /api/admin/pages/[id]/translations/[locale].
//
// Validation, slug rules, transactional audit, and cache invalidation
// are owned by the cmsPages service. The admin route stays thin: parse
// + auth + dispatch + project the response shape Vue expects.

import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import type { Kysely } from 'kysely'
import { requirePermission } from '../../../utils/rbac'
import {
  createCmsPage,
  applyPageInvalidations
} from '../../../services/cmsPages'
import { logEvent } from '../../../utils/activity-logger'
import type { Database } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'pages.write')
  const body = await readBody<{ slug?: string; category_id?: string | null; menu_order?: number }>(event)
  if (!body?.slug || !String(body.slug).trim()) {
    throw createError({ statusCode: 400, statusMessage: 'slug is required' })
  }

  const category_id = body?.category_id ? String(body.category_id) : null
  const menu_order = Number.isFinite(body?.menu_order) ? Number(body.menu_order) : 0

  try {
    const result = await createCmsPage(
      // Service normalizes the slug (trim + strip leading/trailing
      // slashes); pass the raw body value through.
      { slug: body?.slug ?? '', category_id, menu_order },
      async ({ pageId }, executor) => {
        // Admin route never passes an inline translation, so
        // translationId is always null here — page audit only.
        await logEvent(
          {
            eventType: 'CREATE',
            tableName: 'pages',
            recordId: pageId,
            userId: authUser.userId,
            userAgent: getHeader(event, 'user-agent') || undefined,
            metadata: { slug: body.slug, category_id, menu_order, source: 'admin-ui' }
          },
          executor as Kysely<Database>,
          { throwOnError: true }
        )
      }
    )
    await applyPageInvalidations(result.slugsToPurge, result.categoriesToPurge)
    return result.page
  } catch (e: any) {
    // Translate H3-shaped service errors back to the admin route's
    // legacy createError contract. The service's `err()` helper already
    // attaches statusCode/statusMessage so most cases pass through;
    // we just need the unique-violation special case.
    if (e?.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'A page with that slug already exists' })
    }
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, statusMessage: e.statusMessage || e.message })
    }
    throw e
  }
})
