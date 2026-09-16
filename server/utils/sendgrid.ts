/**
 * Twilio SendGrid transport for transactional email. Sends via a direct fetch
 * to the v3 mail/send JSON API (no SDK); the response's X-Message-Id header is
 * the id SendGrid shows in its Activity Feed and echoes in event webhooks.
 */

export function getSendgridConfig() {
  let apiKey = ''
  let host = ''
  try {
    const config = useRuntimeConfig()
    apiKey = config.sendgridApiKey
    host = config.sendgridHost
  } catch {
    // Outside the Nitro context (scripts) fall through to process.env
  }
  return {
    apiKey: apiKey || process.env.SENDGRID_API_KEY || '',
    host: host || process.env.SENDGRID_HOST || 'api.sendgrid.com'
  }
}

export function isSendgridConfigured(): boolean {
  return Boolean(getSendgridConfig().apiKey)
}

export interface SendgridSendOptions {
  from: string // full address, e.g. '"Doxa" <noreply@mail.doxa.life>'
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  headers?: Record<string, string>
  // Per-request cap; default 30s.
  timeoutMs?: number
}

/** Bare lowercase address from a `"Name" <a@b>` or plain `a@b` value. */
function extractEmailAddress(value: string): string | null {
  const angle = value.match(/<([^>]+)>/)
  const bare = (angle ? angle[1]! : value).trim().toLowerCase()
  const match = bare.match(/[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/)
  return match ? match[0] : null
}

/** Display name before the angle brackets of a `"Name" <a@b>` value, if any. */
function extractDisplayName(value: string): string | null {
  const angle = value.match(/^\s*"?([^"<]*?)"?\s*</)
  const name = angle?.[1]?.trim()
  return name || null
}

/** Split a `"Name" <a@b>` style address into SendGrid's {email, name} shape. */
function toAddressObject(value: string): { email: string, name?: string } {
  const email = extractEmailAddress(value) || value
  const name = extractDisplayName(value)
  return name ? { email, name } : { email }
}

/**
 * Send one message via the SendGrid v3 API. Throws on a non-2xx response;
 * returns the X-Message-Id SendGrid assigned.
 */
export async function sendViaSendgrid(options: SendgridSendOptions): Promise<{ messageId?: string }> {
  const { apiKey, host } = getSendgridConfig()
  if (!apiKey) {
    throw new Error('SendGrid configuration incomplete. Set SENDGRID_API_KEY.')
  }

  const recipients = (Array.isArray(options.to) ? options.to : [options.to]).map(toAddressObject)

  const payload: Record<string, unknown> = {
    personalizations: [{ to: recipients }],
    from: toAddressObject(options.from),
    subject: options.subject,
    content: [
      { type: 'text/plain', value: options.text || options.html.replace(/<[^>]*>/g, '') },
      { type: 'text/html', value: options.html }
    ]
  }
  if (options.replyTo) payload.reply_to = toAddressObject(options.replyTo)
  if (options.headers && Object.keys(options.headers).length) payload.headers = options.headers

  // Bound the request with a manually-cleared AbortController rather than
  // AbortSignal.timeout(): under Bun the latter's per-call timer is never
  // reclaimed, so each send leaks memory.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 30000)
  try {
    const res = await fetch(`https://${host}/v3/mail/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`SendGrid responded ${res.status}: ${body}`)
    }
    return { messageId: res.headers.get('x-message-id') || undefined }
  } finally {
    clearTimeout(timeout)
  }
}
