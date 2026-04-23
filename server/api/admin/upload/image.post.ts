// Admin: image upload endpoint. Accepts a multipart form-data POST with
// the file under field `file`, uploads to S3 via the existing storage
// util, and returns a signed URL + S3 key so the Tiptap editor can
// insert the image. Mirrors the contract campaigns-sever's
// useImageUpload composable expects.

import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { uploadToS3, validateImageType, validateFileSize } from '../../../utils/storage'

const MAX_IMAGE_MB = 10

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.manage')

  const form = await readMultipartFormData(event)
  const file = form?.find(p => p.name === 'file')
  if (!file || !file.data) {
    throw createError({ statusCode: 400, statusMessage: 'file is required' })
  }

  const contentType = file.type || 'application/octet-stream'
  if (!validateImageType(contentType)) {
    throw createError({ statusCode: 415, statusMessage: 'Unsupported image type' })
  }
  if (!validateFileSize(file.data.length, MAX_IMAGE_MB)) {
    throw createError({ statusCode: 413, statusMessage: `Image exceeds ${MAX_IMAGE_MB}MB limit` })
  }

  const filename = file.filename || 'upload'
  const result = await uploadToS3(file.data, filename, contentType, 'public')
  return { url: result.url, key: result.key, filename: result.filename }
})
