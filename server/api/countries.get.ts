/**
 * GET /api/countries
 * Returns one summary per country that has people groups (slug, code, localized
 * name, WAGF region, count, and a map center/zoom framed on the country).
 * Supports translated names via ?lang=.
 *
 * Powers the /countries index and each /countries/[country] page.
 */
import { getCountriesSummary, resolveLang } from '../utils/countries'

export default defineEventHandler(async (event) => {
  const lang = resolveLang(getQuery(event).lang)
  const countries = await getCountriesSummary(lang)

  // Same edge-cache + stale-while-revalidate policy as the marketing HTML.
  setResponseHeader(event, 'cache-control', 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400')

  return { countries, total: countries.length }
})
