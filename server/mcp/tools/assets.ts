// Asset upload tools — two-step presigned PUT flow.
//
// Step 1: prepare_image_upload binds (mimeType, byte_size, key) into
// a presigned S3 PUT URL and an opaque HMAC-signed upload_token. The
// agent reads the file bytes and PUTs them directly to S3.
//
// Step 2: finalize_image_upload verifies the actual upload — checks
// Content-Length and Content-Type match what was bound, sniffs the
// first 12 bytes for the declared image's magic bytes, and returns
// the public final_url. If validation fails, the S3 object is
// deleted before the error returns. This brings parity with the
// admin multipart path's magic-byte defence (the Content-Type
// binding alone only constrains the response header S3 stores, not
// the payload itself).

import { defineMcpTool, mcpLog } from '#mcp-layer'
import { prepareImageUploadInput, finalizeImageUploadInput } from '../schemas'
import { prepareImageUpload, finalizeImageUpload } from '../../services/cmsAssets'

const PREPARE_DESCRIPTION = `Get a presigned URL to upload an image directly to S3 (step 1 of 2).

Two-step flow:
1. Call \`prepare_image_upload\` with \`mimeType\`, \`byte_size\` (the exact byte length of the file you're about to upload), and an optional \`filename\` hint. Receive \`upload_url\`, \`upload_token\`, and \`required_headers\`.
2. Issue an HTTP PUT to \`upload_url\` with the raw image bytes as the body. **Set both \`Content-Type\` AND \`Content-Length\` headers to exactly the values in \`required_headers\`** — the presigned URL signs both, so any mismatch fails with \`SignatureDoesNotMatch\`.
3. After the PUT returns 200, call \`finalize_image_upload\` with the \`upload_token\` to validate the upload and receive the public \`url\` you embed in pages.

The byte_size cap is 10 MB. The upload URL expires after \`expires_at\` (5 minutes from issue). The upload_token (returned alongside) is the only way to convert a successful PUT into a public URL — keep it for the finalize step.

Why two steps: validating that the bytes you uploaded are actually the image you said they were (magic-byte sniff) requires a server-side check after the PUT lands. Skipping that check would let a malformed payload masquerade as an image.`

export const prepareImageUploadTool = defineMcpTool({
  name: 'prepare_image_upload',
  description: PREPARE_DESCRIPTION,
  scope: 'pages.write',
  input: prepareImageUploadInput,
  async handler(input, ctx) {
    const result = await prepareImageUpload({
      filename: input.filename,
      mimeType: input.mimeType,
      byteSize: input.byte_size
    })

    await mcpLog('CREATE', 'assets.presigned', result.key, ctx, {
      mimeType: result.content_type,
      byte_size: result.byte_size,
      expires_at: result.expires_at
    })

    return {
      content: [{
        type: 'text',
        text: `PUT raw bytes to upload_url with Content-Type: ${result.content_type} and Content-Length: ${result.byte_size}. After 200, call finalize_image_upload with the upload_token.`
      }],
      structuredContent: result
    }
  }
})

const FINALIZE_DESCRIPTION = `Validate a presigned upload and return its public URL (step 2 of 2).

Call this after a successful PUT to the URL returned by \`prepare_image_upload\`. Pass the \`upload_token\` you received from prepare; optionally include \`alt\` text to round-trip alongside the URL.

The server verifies (in order): (1) the token signature; (2) the token has not expired; (3) the S3 object exists; (4) its byte size matches what was declared at prepare-time; (5) its Content-Type matches; (6) the first 12 bytes are real magic bytes for the declared image type. Any failure deletes the S3 object and returns an error.

On success returns \`{url, key, mimeType, byteSize, alt}\`. Use \`url\` as the \`src\` on a Tiptap image node when calling \`upsert_page_translation\`.`

export const finalizeImageUploadTool = defineMcpTool({
  name: 'finalize_image_upload',
  description: FINALIZE_DESCRIPTION,
  scope: 'pages.write',
  input: finalizeImageUploadInput,
  async handler(input, ctx) {
    const result = await finalizeImageUpload({
      upload_token: input.upload_token,
      alt: input.alt
    })

    await mcpLog('CREATE', 'assets', result.key, ctx, {
      mimeType: result.mimeType,
      byteSize: result.byteSize
    })

    return {
      content: [{
        type: 'text',
        text: `Validated upload: ${result.mimeType}, ${result.byteSize} bytes. URL: ${result.url}`
      }],
      structuredContent: {
        url: result.url,
        key: result.key,
        mimeType: result.mimeType,
        byteSize: result.byteSize,
        alt: result.alt
      }
    }
  }
})

export const ASSET_TOOLS = [prepareImageUploadTool, finalizeImageUploadTool] as const
