// Shared URL safety check, used by:
//   - server/utils/tiptapValidate.ts (rejects unsafe link.href / image.src
//     in body_json on every write)
//   - server/services/cmsTranslations.ts (rejects unsafe featured_image /
//     og_image on translation upsert)
//
// Single source of truth so the two surfaces don't drift. Any change
// to the policy (new accepted scheme, additional rejection) must
// happen here.

const SAFE_SCHEMES = new Set(['https:', 'http:'])
const REJECTED_SCHEMES = new Set([
  'javascript:', 'data:', 'vbscript:', 'file:', 'blob:'
])

// True when a URL string is safe to render. Accepts:
//   - https:, http: (any host)
//   - site-relative paths starting with /
//   - anchors starting with #
//   - empty string (treated as "no link")
//
// Rejected: javascript:, data:, vbscript:, file:, blob: (case-insensitive
// prefix match, defeats `JaVaScRiPt:` tricks); any other scheme; any
// string that fails URL parsing.
export function isSafeHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (v === '') return true
  if (v.startsWith('#')) return true
  if (v.startsWith('/') && !v.startsWith('//')) return true
  const lower = v.toLowerCase()
  for (const bad of REJECTED_SCHEMES) {
    if (lower.startsWith(bad)) return false
  }
  try {
    const parsed = new URL(v)
    return SAFE_SCHEMES.has(parsed.protocol)
  } catch {
    return false
  }
}
