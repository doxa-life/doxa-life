// Port of marketing-theme/functions/contact-rest-api.php.
// Browser POSTs form data + Turnstile token here; we verify the token
// server-side and forward the sanitized payload to the campaigns-sever
// public endpoint at `{prayBaseUrl}/api/contact` with X-API-Key.

import { defineEventHandler, readBody, createError } from 'h3'

interface ContactBody {
  name?: string
  email?: string
  country?: string
  message?: string
  consent_doxa_general?: boolean
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
  const body = await readBody<ContactBody>(event)
  const config = useRuntimeConfig()

  // 1. Turnstile verification (server-side). `verifyTurnstileToken` is
  //    auto-imported by @nuxtjs/turnstile.
  const token = body?.cf_turnstile
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid token' })
  }
  const turnstileResult = await verifyTurnstileToken(token)
  if (!turnstileResult?.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid token' })
  }

  // 2. Sanitize inputs (matches PHP sanitize_text_field / sanitize_email)
  const name = sanitizeText(body.name)
  const email = sanitizeEmail(body.email)
  const country = sanitizeText(body.country)
  const message = sanitizeText(body.message)
  const consent = Boolean(body.consent_doxa_general)
  const language = sanitizeText(body.language) || 'en'

  if (!email || !message) {
    throw createError({ statusCode: 400, statusMessage: 'Email and message are required' })
  }

  // 3. Forward to campaigns-sever (mirrors contact-rest-api.php)
  if (!config.prayBaseUrl || !config.formApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Prayer Tools integration not configured' })
  }

  try {
    await $fetch(`${String(config.prayBaseUrl).replace(/\/$/, '')}/api/contact`, {
      method: 'POST',
      headers: {
        'X-API-Key': config.formApiKey as string,
        'Content-Type': 'application/json'
      },
      body: {
        name,
        email,
        country,
        message,
        consent_doxa_general: consent,
        language
      },
      timeout: 15_000
    })
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Failed to send message. Please try again.' })
  }

  return { status: 'success' }
})
