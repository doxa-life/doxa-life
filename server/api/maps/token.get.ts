/**
 * GET /api/maps/token
 *
 * Returns a Mapbox token suitable for client-side use:
 *   - If NUXT_MAPBOX_KEY (or NUXT_PUBLIC_MAPBOX_TOKEN) is a public key (`pk.*`)
 *     → returns it directly
 *   - If NUXT_MAPBOX_KEY is a secret key (`sk.*`)
 *     → JWT-decodes the SK to extract the username, calls Mapbox Tokens API
 *       to mint a 1-hour temporary token (`tk.*`) with read-only scopes,
 *       caches it server-side, returns the TK
 *
 * Pattern ported from `dt-geo-steward/geo-steward.php :: get_temp_key()`
 *
 * Why a server endpoint instead of `runtimeConfig.public.mapboxToken`?
 *   1. Static HTML pages in /public/ can't read runtimeConfig — they need
 *      to fetch the token over HTTP at page load.
 *   2. Lets us hold an SK in `.env` and never ship it (or any value
 *      derived from it) to the client; the TK we send back auto-expires
 *      in 1 hour and can be revoked by rotating the SK.
 *   3. Centralizes token logic for any embed (research page, PPLR data
 *      maps page, future MFEs) — single source of truth.
 *
 * Security notes:
 *   - Returns a token to ANY caller. That's fine because:
 *     * `pk.` tokens are designed for public exposure.
 *     * `tk.` tokens are minted with read-only scopes
 *       (styles:read, fonts:read, styles:tiles).
 *     * Mapbox dashboard URL-referer restrictions provide the actual
 *       access control.
 *   - The SK is read from a SERVER-ONLY runtime config entry (`mapboxKey`,
 *     not under `public:`) so it never leaks to the client bundle.
 *
 * Cache: TK tokens are cached in-process until 5 minutes before expiry.
 * Multiple Nitro workers will each cache independently — fine, just
 * means a few extra Mapbox API calls per cold-start.
 */

interface TokenResponse {
  token: string
  type: 'pk' | 'tk'
  expires_in?: number
}

interface MapboxTokenApiResponse {
  token: string
  scopes?: string[]
  note?: string
  client?: string
  usage?: string
  id?: string
  default?: boolean
  created?: string
  modified?: string
}

// In-memory cache (per Nitro worker). Resets on cold start.
let cachedTk: { token: string; expiresAt: number } | null = null

const TK_LIFETIME_MS = 60 * 60 * 1000           // 1 hour
const TK_CACHE_BUFFER_MS = 5 * 60 * 1000        // refresh 5 min before expiry

const CLIENT_SCOPES = [
  'styles:read',     // load map styles
  'fonts:read',      // render labels
  'styles:tiles',    // serve tile requests
]

export default defineEventHandler(async (event): Promise<TokenResponse> => {
  const config = useRuntimeConfig(event)
  // Prefer the server-only key if present; fall back to the public token
  // so existing setups (just NUXT_PUBLIC_MAPBOX_TOKEN) keep working.
  const key = (config as { mapboxKey?: string }).mapboxKey
            || config.public.mapboxToken
            || ''

  if (!key) {
    throw createError({ statusCode: 500, statusMessage: 'No Mapbox key configured (set NUXT_MAPBOX_KEY or NUXT_PUBLIC_MAPBOX_TOKEN)' })
  }

  // Public token → return as-is
  if (key.startsWith('pk.')) {
    return { token: key, type: 'pk' }
  }

  // Anything else must be a secret key
  if (!key.startsWith('sk.')) {
    throw createError({ statusCode: 500, statusMessage: 'Mapbox key must start with pk. or sk.' })
  }

  // Cached TK that's still fresh? Reuse.
  const now = Date.now()
  if (cachedTk && cachedTk.expiresAt > now + TK_CACHE_BUFFER_MS) {
    return {
      token: cachedTk.token,
      type: 'tk',
      expires_in: Math.floor((cachedTk.expiresAt - now) / 1000),
    }
  }

  // SK → mint a fresh TK
  const username = extractUsernameFromSk(key)
  if (!username) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to parse SK JWT — no username field' })
  }

  let response: MapboxTokenApiResponse
  try {
    response = await $fetch<MapboxTokenApiResponse>(`https://api.mapbox.com/tokens/v2/${username}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'User-Agent': 'doxa-life/maps-token-endpoint',
      },
      body: {
        expires: new Date(now + TK_LIFETIME_MS).toISOString(),
        scopes: CLIENT_SCOPES,
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 502, statusMessage: `Mapbox Tokens API call failed: ${msg}` })
  }

  if (!response?.token || !response.token.startsWith('tk.')) {
    throw createError({ statusCode: 502, statusMessage: 'Mapbox API returned an invalid TK' })
  }

  cachedTk = { token: response.token, expiresAt: now + TK_LIFETIME_MS }
  return { token: response.token, type: 'tk', expires_in: Math.floor(TK_LIFETIME_MS / 1000) }
})

/**
 * Extract the Mapbox username from a JWT-formatted secret key.
 * Mapbox SKs are JWTs with the username under the `u` field of the payload.
 */
function extractUsernameFromSk(sk: string): string | null {
  const parts = sk.split('.')
  if (parts.length !== 3) return null
  try {
    // Pad base64 if needed
    let payload = parts[1]
    const pad = payload.length % 4
    if (pad) payload += '='.repeat(4 - pad)
    const decoded = Buffer.from(payload, 'base64').toString('utf8')
    const parsed = JSON.parse(decoded) as { u?: string }
    return parsed.u || null
  } catch {
    return null
  }
}
