// Build-time module that enumerates the per-country pages for prerendering.
//
// Crawling is disabled (nitro.prerender.crawlLinks = false), and the country
// set is data-driven (derived from the prayer API), so the routes can't be a
// static list like the other marketing pages. At build we fetch the people-
// groups list once, derive the country slugs, and queue /countries plus
// /countries/<slug> for every enabled locale.
//
// If the prayer API is unreachable at build time, no country pages are
// prerendered (the build still succeeds); they then resolve live on request.
import { defineNuxtModule } from '@nuxt/kit'
import { summarizeCountries } from '../config/countries-meta'
import { ENABLED_LANGUAGE_CODES } from '../config/languages'

export default defineNuxtModule({
  meta: { name: 'country-routes' },
  async setup(_options, nuxt) {
    // Only relevant for the production build's prerender pass.
    if (nuxt.options.dev) return

    const base = process.env.NUXT_PRAY_BASE_URL || 'https://pray.doxa.life'
    let slugs: string[]
    try {
      const res = await fetch(`${base}/api/people-groups/list?fields=country_code,wagf_region,latitude,longitude&lang=en`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { posts?: unknown[] }
      slugs = summarizeCountries((data.posts ?? []) as never[]).map(c => c.slug)
    } catch (err) {
      console.warn('[country-routes] could not fetch people-groups list; country pages will not be prerendered:', (err as Error).message)
      return
    }

    // '' = default locale (no prefix); others are /es, /fr, …
    const prefixes = ['', ...ENABLED_LANGUAGE_CODES.filter(code => code !== 'en').map(code => `/${code}`)]
    const routes: string[] = []
    for (const prefix of prefixes) {
      routes.push(`${prefix}/countries`)
      for (const slug of slugs) routes.push(`${prefix}/countries/${slug}`)
    }

    nuxt.options.nitro.prerender ||= {}
    nuxt.options.nitro.prerender.routes ||= []
    nuxt.options.nitro.prerender.routes.push(...routes)

    console.log(`[country-routes] queued ${routes.length} routes for prerender (${slugs.length} countries × ${prefixes.length} locales)`)
  }
})
