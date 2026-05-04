// Admin: image upload endpoint. Accepts a multipart form-data POST with
// the file under field `file`, dispatches into the canonical
// cmsAssets.uploadImage() service (shared with the MCP upload_image
// tool), and returns the {url, key, filename} contract that
// campaigns-sever's useImageUpload composable expects.

import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { uploadImage } from '../../../services/cmsAssets'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.write')

  const form = await readMultipartFormData(event)
  const file = form?.find(p => p.name === 'file')
  if (!file || !file.data) {
    throw createError({ statusCode: 400, statusMessage: 'file is required' })
  }

  try {
    const result = await uploadImage({
      buffer: file.data,
      filename: file.filename,
      declaredMimeType: file.type
    })
    return { url: result.url, key: result.key, filename: result.filename }
  } catch (e: any) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, statusMessage: e.statusMessage || e.message })
    }
    throw e
  }
})
