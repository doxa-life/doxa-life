// Phase 7 scraper: for every (slug × locale) target, fetch the live WP
// page, extract its <article>.page-body HTML + <h1>, run the HTML
// through jsdom/Tiptap to produce a JSON doc, and save the result to
// scripts/scraped/{slug}/{locale}.json. The import step reads those
// files separately.
//
// Run: `bun scripts/scrape-content.ts [slug...]`
// With no args, scrapes everything in SCRAPE_TARGETS. Args filter by slug.

import { JSDOM } from 'jsdom'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { htmlToTiptapDoc } from './lib/htmlToTiptap'
import { SCRAPE_LOCALES, SCRAPE_TARGETS, type ScrapeLocale, type ScrapeTarget } from './lib/pageList'

const LIVE_ORIGIN = 'https://doxa.life'
const OUT_DIR = new URL('../scripts/scraped/', import.meta.url).pathname

interface Extracted {
  title: string
  bodyHtml: string
  excerpt: string | null
  metaDescription: string | null
  ogImage: string | null
  featuredImage: string | null
  customCss: string | null
}

function urlFor(slug: string, locale: ScrapeLocale): string {
  const path = locale === 'en' ? `/${slug}/` : `/${locale}/${slug}/`
  return `${LIVE_ORIGIN}${path}`
}

function textContent(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function rewriteInternalLinks(doc: Document) {
  // Rewrite absolute doxa.life URLs to relative paths so links stay
  // locale-appropriate when the page is rendered in the new site.
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? ''
    try {
      const u = new URL(href, LIVE_ORIGIN)
      if (u.hostname === 'doxa.life') {
        // Strip the locale prefix too — /es/about/ → /about/ — so each
        // locale's scraped doc links to the canonical slug, and the
        // Nuxt i18n routing adds the prefix on render.
        let p = u.pathname
        for (const loc of SCRAPE_LOCALES) {
          if (loc !== 'en' && (p === `/${loc}` || p.startsWith(`/${loc}/`))) {
            p = p.replace(new RegExp(`^/${loc}`), '') || '/'
            break
          }
        }
        a.setAttribute('href', p + u.search + u.hash)
      }
    } catch {
      // not a URL; leave as-is
    }
  })
}

function extract(html: string, url: string): Extracted | null {
  const dom = new JSDOM(html, { url })
  const doc = dom.window.document

  const article = doc.querySelector('article') || doc.querySelector('main') || doc.body
  if (!article) return null

  let title = textContent(article.querySelector('h1')) || textContent(doc.querySelector('title')) || ''
  // WP <title> tags come back as "Page – Site Name". Strip the suffix.
  title = title.replace(/\s*[–—-]\s*Doxa\.Life\s*$/i, '').trim()

  // WP only emits <div class="page-featured-image"> when
  // `has_post_thumbnail()` is true (see marketing-theme/page.php).
  // Grab its img URL as the real featured image; absence → null. This
  // must run BEFORE we remove the featured-image div from the body so
  // we don't duplicate it both as a field and inline below.
  const featuredImageEl = article.querySelector('.page-featured-image img') as HTMLImageElement | null
  const featuredImage = featuredImageEl?.getAttribute('src') ?? null
  article.querySelectorAll('.page-featured-image').forEach(el => el.remove())

  // Prefer the .page-body block that matches page.php output
  const bodyEl
    = article.querySelector('.page-body')
    ?? article.querySelector('.entry-content')
    ?? article.querySelector('.content')
    ?? article

  // Remove the h1 from the body so it doesn't duplicate with the page title
  bodyEl.querySelectorAll(':scope > h1, :scope > header h1, :scope > .entry-title, .page-title').forEach(el => el.remove())

  rewriteInternalLinks(doc)

  const bodyHtml = bodyEl.innerHTML.trim()

  const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? null
  const metaDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? null
  const excerpt = metaDescription

  // WP injects per-page custom CSS via a <style id="page-custom-css-{id}">
  // block in the <head> (see `output_page_custom_css` in functions.php).
  // Capture the rule body — comments and all — so editors can preserve
  // page-specific styling like the /pwf26 green body background.
  const customCssEl = doc.querySelector('style[id^="page-custom-css-"]') as HTMLStyleElement | null
  const customCssRaw = customCssEl?.textContent ?? null
  // Strip the WP-added comment line ("/* Custom CSS for page: … */").
  const customCss = customCssRaw
    ? customCssRaw.replace(/^\s*\/\*\s*Custom CSS for page:.*?\*\/\s*/m, '').trim() || null
    : null

  return {
    title,
    bodyHtml,
    excerpt,
    metaDescription,
    ogImage,
    featuredImage,
    customCss
  }
}

async function scrapeOne(slug: string, locale: ScrapeLocale): Promise<'ok' | '404' | 'err'> {
  const url = urlFor(slug, locale)
  let resp: Response
  try {
    resp = await fetch(url, { headers: { 'User-Agent': 'doxa-rebuild-scraper/1.0' } })
  } catch (e: any) {
    console.warn(`  ! ${url} fetch failed: ${e?.message ?? e}`)
    return 'err'
  }

  if (resp.status === 404) return '404'
  if (!resp.ok) {
    console.warn(`  ! ${url} HTTP ${resp.status}`)
    return 'err'
  }
  const html = await resp.text()
  // Polylang redirects unknown locales to default; detect by checking
  // the response URL against what we asked for.
  if (locale !== 'en' && resp.url !== url && !resp.url.includes(`/${locale}/`)) {
    return '404'
  }

  const extracted = extract(html, url)
  if (!extracted) {
    console.warn(`  ! ${url} no article extracted`)
    return 'err'
  }

  const tiptap = htmlToTiptapDoc(extracted.bodyHtml)

  const outFile = join(OUT_DIR, slug, `${locale}.json`)
  await mkdir(dirname(outFile), { recursive: true })
  await writeFile(
    outFile,
    JSON.stringify(
      {
        sourceUrl: url,
        slug,
        locale,
        title: extracted.title,
        excerpt: extracted.excerpt,
        meta_description: extracted.metaDescription,
        og_image: extracted.ogImage,
        featured_image: extracted.featuredImage,
        custom_css: extracted.customCss,
        body_json: tiptap
      },
      null,
      2
    ) + '\n',
    'utf8'
  )

  return 'ok'
}

async function main() {
  const filter = process.argv.slice(2)
  const targets: ScrapeTarget[] = filter.length
    ? SCRAPE_TARGETS.filter(t => filter.includes(t.slug))
    : SCRAPE_TARGETS

  if (!targets.length) {
    console.error('No targets matched filter.')
    process.exit(1)
  }

  console.log(`Scraping ${targets.length} target(s) × up to ${SCRAPE_LOCALES.length} locale(s)…`)
  let okCount = 0
  let skipCount = 0
  let errCount = 0

  for (const target of targets) {
    console.log(`\n→ ${target.slug}`)
    const locales = target.englishOnly ? (['en'] as const) : SCRAPE_LOCALES
    for (const locale of locales) {
      const result = await scrapeOne(target.slug, locale)
      if (result === 'ok') {
        console.log(`  ✓ ${locale}`)
        okCount++
      } else if (result === '404') {
        console.log(`  – ${locale} (not translated)`)
        skipCount++
      } else {
        errCount++
      }
    }
  }

  console.log(`\nDone. ${okCount} ok, ${skipCount} skipped, ${errCount} errored.`)
  console.log(`Output: ${OUT_DIR}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
