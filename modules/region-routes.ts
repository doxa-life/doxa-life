// Build-time module that enumerates the region and country pages for
// prerendering.
//
// Crawling is disabled (nitro.prerender.crawlLinks = false), and the region and
// country sets are data-driven (derived from the prayer API), so the routes
// can't be a static list like the other marketing pages. At build we fetch the
// people-groups list once, derive the region and country slugs, and queue
// /regions, /regions/<region> and /regions/<country> for every enabled locale.
//
// If the prayer API is unreachable at build time, no region pages are
// prerendered (the build still succeeds); they then resolve live on request.
import { defineNuxtModule } from '@nuxt/kit'
import { PEOPLE_GROUP_LIST_FIELDS, summarizeRegions } from '../config/countries-meta'
import { ENABLED_LANGUAGE_CODES } from '../config/languages'

export default defineNuxtModule({
  meta: { name: 'region-routes' },
  async setup(_options, nuxt) {
    // Only relevant for the production build's prerender pass.
    if (nuxt.options.dev) return

    const base = process.env.NUXT_PRAY_BASE_URL || 'https://pray.doxa.life'
    let slugs: string[]
    try {
      const res = await fetch(`${base}/api/people-groups/list?fields=${PEOPLE_GROUP_LIST_FIELDS}&lang=en`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { posts?: unknown[] }
      slugs = summarizeRegions((data.posts ?? []) as never[])
        .flatMap(region => [region.slug, ...region.countries.map(c => c.slug)])
    } catch (err) {
      console.warn('[region-routes] could not fetch people-groups list; region pages will not be prerendered:', (err as Error).message)
      return
    }

    // '' = default locale (no prefix); others are /es, /fr, …
    const prefixes = ['', ...ENABLED_LANGUAGE_CODES.filter(code => code !== 'en').map(code => `/${code}`)]
    const routes: string[] = []
    for (const prefix of prefixes) {
      routes.push(`${prefix}/regions`)
      for (const slug of slugs) routes.push(`${prefix}/regions/${slug}`)
    }

    nuxt.options.nitro.prerender ||= {}
    nuxt.options.nitro.prerender.routes ||= []
    nuxt.options.nitro.prerender.routes.push(...routes)

    console.log(`[region-routes] queued ${routes.length} routes for prerender (${slugs.length} regions + countries × ${prefixes.length} locales)`)
  }
})
