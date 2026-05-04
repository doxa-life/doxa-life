// Asset-upload service. Two flows go through here:
//
// 1. uploadImage(): admin multipart route hands a decoded Buffer to
//    the server, which sniffs magic bytes, validates type/size, and
//    uploads to S3 in a single step.
//
// 2. prepareImageUpload() + finalizeImageUpload(): MCP agents bypass
//    base64 encoding by getting a presigned S3 PUT URL, uploading
//    bytes directly, then asking the server to validate the result.
//    The presign signs Content-Type *and* Content-Length into the URL
//    (caps size at the value the agent declared); finalize HEADs the
//    object and reads the first 12 bytes via a Range GET to confirm
//    the actual payload matches the declared MIME (defends against
//    a non-image masquerading as an image past the Content-Type
//    binding). On validation failure, finalize deletes the object
//    before returning the error.

import type { H3Error } from 'h3'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import {
  uploadToS3,
  validateImageType,
  validateFileSize,
  createPresignedUploadUrl,
  getPublicUrl,
  getObjectByteRange,
  headObject,
  deleteFromS3
} from '../utils/storage'

const MAX_IMAGE_MB = 10
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024

function err(statusCode: number, message: string): H3Error {
  return Object.assign(new Error(message), {
    statusCode,
    statusMessage: message,
    data: { message }
  }) as unknown as H3Error
}

// Sniff the image MIME type from the first few bytes. Defends against
// the client lying about Content-Type: an attacker can claim
// `image/jpeg` and ship a script; magic-byte checking is the only
// reliable signal.
//
// Recognises JPEG, PNG, WebP — the same set validateImageType() admits.
// Returns null when the bytes don't match any allowed type.
function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png'

  // WebP: 'RIFF' .... 'WEBP'
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
    && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp'

  return null
}

export interface UploadImageInput {
  buffer: Buffer
  filename?: string
  // The client-supplied MIME type. Only used as a hint; the actual
  // type comes from sniffImageMime() and must match.
  declaredMimeType?: string
  alt?: string
}

export interface UploadImageResult {
  url: string
  key: string
  filename: string
  mimeType: string
  byteSize: number
  alt?: string
}

export async function uploadImage(input: UploadImageInput): Promise<UploadImageResult> {
  const { buffer } = input
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw err(400, 'image bytes are required')
  }

  if (!validateFileSize(buffer.length, MAX_IMAGE_MB)) {
    throw err(413, `Image exceeds ${MAX_IMAGE_MB}MB limit`)
  }

  const sniffed = sniffImageMime(buffer)
  if (!sniffed) {
    throw err(415, 'Unsupported image type — only JPEG, PNG, and WebP are accepted')
  }
  // Defensive double-check: if the client declared a different type, refuse.
  // Catches accidental mismatches between Claude's content-block claim and
  // the bytes; preserves the admin path's validateImageType() guarantee.
  if (input.declaredMimeType && input.declaredMimeType !== sniffed && !validateImageType(input.declaredMimeType)) {
    throw err(415, `Declared MIME type "${input.declaredMimeType}" does not match the file contents`)
  }

  const filename = (input.filename || 'upload').replace(/[^\w.\-]+/g, '_')
  const result = await uploadToS3(buffer, filename, sniffed, 'public')

  return {
    url: result.url,
    key: result.key,
    filename: result.filename,
    mimeType: sniffed,
    byteSize: buffer.length,
    alt: input.alt
  }
}

// ── Presigned PUT flow ──────────────────────────────────────────────

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
}

const PRESIGN_TTL_SECONDS = 5 * 60
const TOKEN_TTL_SECONDS = 30 * 60 // longer than presign — the agent's
                                  // PUT might race the URL expiry, so
                                  // give the finalize step a wider
                                  // window before the token itself
                                  // becomes unverifiable.

// HMAC-signed token binding key + mimeType + byteSize + expiry. The
// agent treats it as opaque; finalize verifies the signature before
// trusting any of the bound values.
//
// Using jwtSecret as the HMAC key (already required for the auth
// surface) with a domain-separator prefix so a leak in one direction
// doesn't help forge the other. If a dedicated assetUploadSecret is
// added later, swap the secret source — the signing format itself
// is stable.
function getSigningKey(): Buffer {
  const secret = (useRuntimeConfig().jwtSecret as string) || ''
  if (!secret) {
    throw err(500, 'jwtSecret is not configured — cannot sign upload tokens')
  }
  return createHmac('sha256', `asset-upload:${secret}`).update('').digest()
}

interface UploadTokenPayload {
  k: string  // s3 key
  m: string  // mimeType
  s: number  // byteSize
  e: number  // expires-at (unix seconds)
}

function signUploadToken(payload: UploadTokenPayload): string {
  const json = JSON.stringify(payload)
  const body = Buffer.from(json, 'utf8').toString('base64url')
  const sig = createHmac('sha256', getSigningKey()).update(body).digest('base64url')
  return `${body}.${sig}`
}

function verifyUploadToken(token: string): UploadTokenPayload {
  const dot = token.indexOf('.')
  if (dot < 1) throw err(400, 'malformed upload_token')
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  const expected = createHmac('sha256', getSigningKey()).update(body).digest('base64url')
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw err(401, 'upload_token signature is invalid')
  }

  let payload: UploadTokenPayload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    throw err(400, 'upload_token payload is malformed')
  }
  if (typeof payload.k !== 'string' || typeof payload.m !== 'string' || typeof payload.s !== 'number' || typeof payload.e !== 'number') {
    throw err(400, 'upload_token payload is incomplete')
  }
  if (Math.floor(Date.now() / 1000) > payload.e) {
    throw err(401, 'upload_token has expired')
  }
  return payload
}

export interface PrepareImageUploadInput {
  filename?: string
  mimeType: string
  byteSize: number
}

export interface PrepareImageUploadResult {
  upload_url: string
  upload_token: string
  key: string
  expires_at: string
  required_headers: Record<string, string>
  byte_size: number
  content_type: string
}

// Generates an S3 key + a presigned PUT URL bound to the agent's
// declared mimeType + byteSize. The agent uploads bytes directly to
// S3 (no base64 roundtrip), then calls finalizeImageUpload() with
// the returned upload_token to validate the actual payload and
// receive the public final_url.
//
// The presigned URL won't accept a PUT whose Content-Length or
// Content-Type header doesn't match what was signed; this caps the
// upload size at the declared value (no runaway uploads to a public
// bucket) and binds the declared MIME to the response Content-Type
// S3 stores. Magic-byte validation of the actual payload is deferred
// to finalize.
export async function prepareImageUpload(input: PrepareImageUploadInput): Promise<PrepareImageUploadResult> {
  const mimeType = input.mimeType?.toLowerCase()
  if (!mimeType || !validateImageType(mimeType)) {
    throw err(415, 'mimeType must be image/jpeg, image/png, or image/webp')
  }
  const ext = MIME_TO_EXT[mimeType]
  if (!ext) {
    throw err(415, 'mimeType must be image/jpeg, image/png, or image/webp')
  }

  const byteSize = Math.floor(input.byteSize)
  if (!Number.isFinite(byteSize) || byteSize <= 0) {
    throw err(400, 'byte_size must be a positive integer')
  }
  if (byteSize > MAX_IMAGE_BYTES) {
    throw err(413, `byte_size exceeds ${MAX_IMAGE_MB}MB limit`)
  }

  const random = randomBytes(16).toString('hex')
  const key = `uploads/${random}.${ext}`
  const expiresUnix = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS

  const upload_url = await createPresignedUploadUrl(key, mimeType, byteSize, PRESIGN_TTL_SECONDS)
  const upload_token = signUploadToken({ k: key, m: mimeType, s: byteSize, e: expiresUnix })

  // PRESIGN_TTL is the more aggressive of the two — that's when the
  // PUT itself stops working. Surface it as the visible expiry.
  const presignExpiresAt = new Date(Date.now() + PRESIGN_TTL_SECONDS * 1000).toISOString()

  return {
    upload_url,
    upload_token,
    key,
    expires_at: presignExpiresAt,
    required_headers: {
      // The presign signs both into the URL; the client MUST send
      // these exact headers in the PUT or S3 rejects with
      // SignatureDoesNotMatch.
      'Content-Type': mimeType,
      'Content-Length': String(byteSize)
    },
    byte_size: byteSize,
    content_type: mimeType
  }
}

export interface FinalizeImageUploadInput {
  upload_token: string
  alt?: string
}

export interface FinalizeImageUploadResult {
  url: string
  key: string
  mimeType: string
  byteSize: number
  alt?: string
}

// Verifies that a presigned upload completed correctly. Agent calls
// this after their PUT to convert the upload_token into a public URL.
//
// Validates, in order:
//   1. Token signature (HMAC against jwtSecret + domain separator).
//   2. Token has not expired.
//   3. The S3 object exists at the bound key.
//   4. The object's Content-Length matches the bound byteSize.
//   5. The object's Content-Type matches the bound mimeType.
//   6. The first 12 bytes are real image magic bytes for the
//      declared MIME (defends against a non-image PUT'd with an
//      image Content-Type header).
//
// On any failure: the S3 object is deleted (best-effort) and the
// error is thrown. On success: returns the public final_url.
export async function finalizeImageUpload(input: FinalizeImageUploadInput): Promise<FinalizeImageUploadResult> {
  const payload = verifyUploadToken(input.upload_token)

  const head = await headObject(payload.k)
  if (!head) {
    throw err(404, 'no upload found for this token — did the PUT complete?')
  }

  const bail = async (status: number, message: string) => {
    // Best-effort delete; ignore failures so we surface the original
    // validation error rather than a delete error.
    try { await deleteFromS3(payload.k) } catch { /* ignore */ }
    throw err(status, message)
  }

  if (head.contentLength !== payload.s) {
    return await bail(409, `uploaded byte size (${head.contentLength}) does not match declared (${payload.s})`)
  }
  if (head.contentType && head.contentType !== payload.m) {
    return await bail(409, `uploaded Content-Type (${head.contentType}) does not match declared (${payload.m})`)
  }

  // Magic-byte sniff. Range GET the first 12 bytes; sniffImageMime
  // requires that exact length to recognise WebP.
  const headerBytes = await getObjectByteRange(payload.k, 0, 11)
  const sniffed = sniffImageMime(headerBytes)
  if (!sniffed) {
    return await bail(415, 'uploaded bytes are not a recognised image (JPEG, PNG, or WebP)')
  }
  if (sniffed !== payload.m) {
    return await bail(415, `actual image type (${sniffed}) does not match declared (${payload.m})`)
  }

  return {
    url: getPublicUrl(payload.k),
    key: payload.k,
    mimeType: sniffed,
    byteSize: payload.s,
    alt: input.alt
  }
}
