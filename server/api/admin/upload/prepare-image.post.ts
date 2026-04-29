// Admin: get a presigned PUT URL for direct-to-S3 image upload (step 1).
// Mirrors the MCP `prepare_image_upload` tool; both call the same
// service. After PUTting the bytes, the client must call
// /api/admin/upload/finalize-image with the returned upload_token.

import { defineEventHandler, readBody, createError } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { prepareImageUpload } from '../../../services/cmsAssets'

interface Body {
  filename?: string
  mimeType?: string
  byte_size?: number
}

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.write')
  const body = await readBody<Body>(event)

  if (!body?.mimeType) {
    throw createError({ statusCode: 400, statusMessage: 'mimeType is required' })
  }
  if (!body?.byte_size || !Number.isFinite(body.byte_size) || body.byte_size <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'byte_size is required and must be positive' })
  }

  try {
    return await prepareImageUpload({
      filename: body.filename,
      mimeType: body.mimeType,
      byteSize: body.byte_size
    })
  } catch (e: any) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, statusMessage: e.statusMessage || e.message })
    }
    throw e
  }
})
