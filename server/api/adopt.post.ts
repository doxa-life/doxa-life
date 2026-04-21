// Port of marketing-theme/functions/adopt-rest-api.php.
// Browser POSTs adoption form + Turnstile token here; we verify the
// token server-side and forward the sanitized payload to the
// campaigns-sever public endpoint at `{prayBaseUrl}/api/adopt` with
// X-API-Key. Response passes through `{ status: 'needs_verification' }`
// or `{ status: 'success' }` so the client shows the matching screen.

import { defineEventHandler, readBody, createError } from 'h3'

interface AdoptBody {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  role?: string
  church_name?: string
  country?: string
  people_group?: string
  permission_to_contact?: boolean
  confirm_public_display?: boolean
  confirm_adoption?: boolean
  language?: string
  cf_turnstile?: string
}

function sanitizeText(s: unknown): string {
  if (typeof s !== 'string') return ''
  return s.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 5000)
}

function sanitizeEmail(s: unknown): string {
  if (typeof s !== 'string') return ''
  return s.trim().toLowerCase().slice(0, 320)
}

export default defineEventHandler(async (event) => {
  const body = await readBody<AdoptBody>(event)
  const config = useRuntimeConfig()

  // 1. Turnstile verification.
  const token = body?.cf_turnstile
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid token' })
  }
  const turnstileResult = await verifyTurnstileToken(token)
  if (!turnstileResult?.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid token' })
  }

  // 2. Sanitize inputs (matches PHP sanitize_text_field / sanitize_email).
  const first_name = sanitizeText(body.first_name)
  const last_name = sanitizeText(body.last_name)
  const email = sanitizeEmail(body.email)
  const phone = sanitizeText(body.phone)
  const church_name = sanitizeText(body.church_name)
  const country = sanitizeText(body.country)
  const role = sanitizeText(body.role)
  const confirm_adoption = Boolean(body.confirm_adoption)
  const permission_to_contact = Boolean(body.permission_to_contact)
  const confirm_public_display = Boolean(body.confirm_public_display)
  const people_group = sanitizeText(body.people_group)
  const language = sanitizeText(body.language) || 'en'

  if (!email || !first_name || !last_name) {
    throw createError({ statusCode: 400, statusMessage: 'Name and email are required' })
  }
  if (!confirm_adoption) {
    throw createError({ statusCode: 400, statusMessage: 'Please confirm your adoption commitment' })
  }

  // 3. Forward to campaigns-sever (mirrors adopt-rest-api.php lines 88-107).
  if (!config.prayBaseUrl || !config.formApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Prayer Tools integration not configured' })
  }

  try {
    const upstream = await $fetch<{ needs_verification?: boolean }>(
      `${String(config.prayBaseUrl).replace(/\/$/, '')}/api/adopt`,
      {
        method: 'POST',
        headers: {
          'X-API-Key': config.formApiKey as string,
          'Content-Type': 'application/json'
        },
        body: {
          first_name,
          last_name,
          email,
          phone,
          role,
          church_name,
          country,
          people_group,
          permission_to_contact,
          confirm_public_display,
          language
        },
        timeout: 15_000
      }
    )

    if (upstream?.needs_verification) {
      return { status: 'needs_verification' as const }
    }
    return { status: 'success' as const }
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Failed to submit adoption. Please try again.' })
  }
})
