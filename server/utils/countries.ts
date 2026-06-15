// Server-side accessor for the per-country summary used by /api/countries.
// Fetches the full people-groups list from the prayer API and reduces it to one
// CountrySummary per country (see config/countries-meta.ts).
//
// The result is cached per language for an hour: every prerendered country page
// (175 countries × 8 locales) calls this during build, and the upstream list is
// ~2,100 rows. Without caching each page would re-fetch the whole list.

import { summarizeCountries, type CountrySummary } from '~~/config/countries-meta'
import { LANGUAGE_CODES } from '~~/config/languages'

const LIST_FIELDS = 'country_code,wagf_region,latitude,longitude'

async function fetchCountriesSummary(lang: string): Promise<CountrySummary[]> {
  const base = useRuntimeConfig().prayBaseUrl as string
  const data = await $fetch<{ posts?: unknown[] }>(`${base}/api/people-groups/list`, {
    query: { fields: LIST_FIELDS, lang }
  })
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
