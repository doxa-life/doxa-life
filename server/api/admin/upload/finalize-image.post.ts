// Admin: validate a presigned upload and return the public URL (step 2).
// Dispatches into the same cmsAssets.finalizeImageUpload service the
// MCP `finalize_image_upload` tool calls.

import { defineEventHandler, readBody, createError } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { finalizeImageUpload } from '../../../services/cmsAssets'

interface Body {
  upload_token?: string
  alt?: string
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.write')
  const body = await readBody<Body>(event)

  if (!body?.upload_token) {
    throw createError({ statusCode: 400, statusMessage: 'upload_token is required' })
  }

  try {
    return await finalizeImageUpload({
      upload_token: body.upload_token,
      alt: body.alt
    })
  } catch (e: any) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, statusMessage: e.statusMessage || e.message })
    }
    throw e
  }
})
