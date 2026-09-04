// Server-side accessor for the per-country and per-region summaries used by
// /api/countries and /api/regions. Fetches the full people-groups list from the
// prayer API and reduces it with config/countries-meta.ts.
//
// The list is cached per language for an hour: every prerendered region and
// country page (~185 pages × 8 locales) calls this during build, and the
// upstream list is ~2,100 rows. Without caching each page would re-fetch it.

import {
  PEOPLE_GROUP_LIST_FIELDS,
  summarizeCountries,
  summarizeRegions,
  type CountrySummary,
  type PeopleGroupLite,
  type RegionSummary
} from '~~/config/countries-meta'
import { LANGUAGE_CODES } from '~~/config/languages'

async function fetchPeopleGroups(lang: string): Promise<PeopleGroupLite[]> {
  const base = useRuntimeConfig().prayBaseUrl as string
  const data = await $fetch<{ posts?: PeopleGroupLite[] }>(`${base}/api/people-groups/list`, {
    query: { fields: PEOPLE_GROUP_LIST_FIELDS, lang }
  })
  return data?.posts ?? []
}

// In dev, skip caching so data changes show up immediately. In production/build
// the per-language list is cached for an hour.
const getPeopleGroups: (lang: string) => Promise<PeopleGroupLite[]>
  = import.meta.dev
    ? fetchPeopleGroups
    : defineCachedFunction(fetchPeopleGroups, {
        maxAge: 60 * 60,
        name: 'people-groups-list',
        getKey: (lang: string) => lang
      })

export async function getCountriesSummary(lang: string): Promise<CountrySummary[]> {
  return summarizeCountries(await getPeopleGroups(lang))
}

export async function getRegionsSummary(lang: string): Promise<RegionSummary[]> {
  return summarizeRegions(await getPeopleGroups(lang))
}

// Validate a query `lang` against the known languages, defaulting to English.
export function resolveLang(input: unknown): string {
  return LANGUAGE_CODES.includes(input as string) ? (input as string) : 'en'
}
