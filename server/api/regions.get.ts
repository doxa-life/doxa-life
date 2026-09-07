/**
 * GET /api/regions
 * Returns one summary per WAGF region that has people groups: slug, localized
 * label, progress stats (people groups, population, adopted, engaged, prayer
 * coverage), a map center/zoom framed on the region, and its countries (each
 * with the same stats). Supports translated labels via ?lang=.
 *
 * Powers the /regions index, each /regions/[region] dashboard and each
 * /regions/[country] page.
 */
import { getRegionsSummary, resolveLang } from '../utils/countries'

export default defineEventHandler(async (event) => {
  const lang = resolveLang(getQuery(event).lang)
  const regions = await getRegionsSummary(lang)

  // Shorter edge TTL than the marketing HTML so the dashboards' client-side
  // refresh picks up progress within the hour; stale-while-revalidate keeps
  // responses instant while the edge refreshes.
  setResponseHeader(event, 'cache-control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')

  return { regions, total: regions.length }
})
