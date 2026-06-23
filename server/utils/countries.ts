// Server-side accessor for the per-country summary used by /api/countries.
// Fetches the full people-groups list from the prayer API and reduces it to one
// CountrySummary per country (see config/countries-meta.ts).
//
// The result is cached per language for an hour: every prerendered country page
// (175 countries × 8 locales) calls this during build, and the upstream list is
// ~2,100 rows. Without caching each page would re-fetch the whole list.

import https from 'node:https'
import { summarizeCountries, type CountrySummary } from '~~/config/countries-meta'
import { LANGUAGE_CODES } from '~~/config/languages'

const LIST_FIELDS = 'country_code,wagf_region,latitude,longitude'

// $fetch / undici manage their own connection stack and ignore both NODE_OPTIONS and
// dns.setDefaultResultOrder. On dev networks where IPv6 to Cloudflare times out, the
// $fetch call throws AggregateError ETIMEDOUT. Using node:https directly with
// family:4 forces IPv4 at the TCP connection layer — confirmed working.
async function fetchCountriesSummary(lang: string): Promise<CountrySummary[]> {
  const base = useRuntimeConfig().prayBaseUrl as string
  const url = new URL(`${base}/api/people-groups/list`)
  url.searchParams.set('fields', LIST_FIELDS)
  url.searchParams.set('lang', lang)

  const raw = await new Promise<string>((resolve, reject) => {
    const req = https.request(
      { hostname: url.hostname, path: url.pathname + url.search, family: 4 },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks).toString()))
      },
    )
    req.on('error', reject)
    req.end()
  })

  const data = JSON.parse(raw) as { posts?: unknown[] }
  return summarizeCountries((data?.posts ?? []) as never[])
}

// In dev, skip caching so data changes show up immediately. In production/build
// the per-language result is cached for an hour.
export const getCountriesSummary: (lang: string) => Promise<CountrySummary[]>
  = import.meta.dev
    ? fetchCountriesSummary
    : defineCachedFunction(fetchCountriesSummary, {
        maxAge: 60 * 60,
        name: 'countries-summary',
        getKey: (lang: string) => lang
      })

// Validate a query `lang` against the known languages, defaulting to English.
export function resolveLang(input: unknown): string {
  return LANGUAGE_CODES.includes(input as string) ? (input as string) : 'en'
}
