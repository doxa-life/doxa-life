// Public CMS page read endpoint. Mirrors the plan:
// - picks the translation for the requested locale
// - falls back to English if that locale isn't published
// - 404s if neither are published
//
// Returns the translation (title, excerpt, featured_image, meta_*,
// status) plus pre-rendered HTML body and the set of sibling pages
// that live in the same category (used for the sidebar nav).
//
// When the slug matches a category's slug exactly (e.g. `/about`),
// the endpoint transparently resolves to the category's first page
// (lowest menu_order with a published translation).
//
// DEBUG BUILD: heavily instrumented to diagnose why Nitro cache isn't
// engaging in prod. Every phase is timed; the inner handler logs a
// line on every invocation — if one request produces exactly one
// "[cms-api] INNER" log line, cache is missing on that request.

// defineCachedEventHandler + getCookie are Nitro globals (auto-imported);
// no h3 import needed for them.
import { getRouterParam, getQuery, createError, defineEventHandler } from 'h3'
import { getPageBySlug } from '../../database/pages'
import {
  getCategoryBySlug,
  getCategoryDefaultPage,
  getCategoryName,
  getCategoryPageTranslations
} from '../../database/categories'
import { db } from '../../utils/database'
import { renderTiptap } from '../../utils/renderTiptap'
import { ENABLED_LANGUAGE_CODES } from '../../../config/languages'

const ENABLED_LOCALES = new Set(ENABLED_LANGUAGE_CODES)

// Request-scoped timing helper. Returns functions that log phase
// durations tagged with the same short request ID so concurrent
// requests can be untangled in the logs.
function makeTimer(reqId: string, tag: string) {
  const start = performance.now()
  const phases: Array<{ name: string; ms: number; meta?: any }> = []
  let last = start
  return {
    mark(name: string, meta?: any) {
      const now = performance.now()
      const ms = now - last
      last = now
      phases.push({ name, ms, meta })
      console.log(`[${tag}] ${reqId} ${name} ${ms.toFixed(1)}ms`, meta ? JSON.stringify(meta) : '')
    },
    total() {
      const ms = performance.now() - start
      console.log(`[${tag}] ${reqId} TOTAL ${ms.toFixed(1)}ms phases=${JSON.stringify(phases.map(p => ({ [p.name]: +p.ms.toFixed(1) })))}`)
      return ms
    }
  }
}

const cachedHandler = defineCachedEventHandler(async (event) => {
  const reqId = Math.random().toString(36).slice(2, 8)
  const t = makeTimer(reqId, 'cms-inner')
  console.log(`[cms-inner] ${reqId} INNER HANDLER STARTING (= cache MISS for this key)`)

  const raw = getRouterParam(event, 'slug')
  const slugParam = Array.isArray(raw) ? raw.join('/') : (raw ?? '')
  const slug = slugParam.replace(/^\/+|\/+$/g, '')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
  }

  const query = getQuery(event)
  const requested = typeof query.locale === 'string' ? query.locale : 'en'
  const locale = ENABLED_LOCALES.has(requested) ? requested : 'en'
  t.mark('parse-input', { slug, locale })

  // Try the slug as a page first. If no page row matches, see if the
  // slug identifies a category, and render its default page.
  let result = await getPageBySlug(slug, locale, { fallback: 'en' })
  t.mark('getPageBySlug', { found: !!result })

  let bareCategorySlug: string | null = null

  if (!result) {
    const category = await getCategoryBySlug(slug)
    t.mark('getCategoryBySlug', { found: !!category })
    if (category) {
      const defaultPage = await getCategoryDefaultPage(category.id, locale, 'en')
      t.mark('getCategoryDefaultPage', { found: !!defaultPage })
      if (defaultPage) {
        result = {
          page: defaultPage.page,
          translation: defaultPage.translation,
          resolvedLocale: defaultPage.translation.locale,
          requestedLocale: locale
        }
        bareCategorySlug = category.slug
      }
    }
  }

  if (!result) {
    t.total()
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }

  const { page, translation, resolvedLocale, requestedLocale } = result
  const bodyHtml = renderTiptap(translation.body_json)
  t.mark('renderTiptap', { bodyLen: bodyHtml.length })

  let menuParent: { slug: string; title: string } | null = null
  let categorySlug: string | null = bareCategorySlug
  let children: Array<{
    slug: string
    title: string
    excerpt: string | null
    featured_image: string | null
    menu_order: number
  }> = []

  if (page.category_id) {
    const [categoryRow, categoryName, siblingRows] = await Promise.all([
      db
        .selectFrom('categories')
        .select('slug')
        .where('id', '=', page.category_id)
        .executeTakeFirst(),
      getCategoryName(page.category_id, resolvedLocale, 'en'),
      getCategoryPageTranslations(page.category_id, resolvedLocale, 'en')
    ])
    t.mark('category-queries', { siblings: siblingRows.length })

    if (categoryRow) categorySlug = categoryRow.slug
    if (categorySlug && categoryName) {
      menuParent = { slug: categorySlug, title: categoryName }
    }
    children = siblingRows.map(({ page: c, translation: t }) => ({
      slug: c.slug,
      title: t.title,
      excerpt: t.excerpt,
      featured_image: t.featured_image,
      menu_order: c.menu_order
    }))
  }

  const response = {
    slug: page.slug,
    category_id: page.category_id,
    category_slug: categorySlug,
    menu_order: page.menu_order,
    theme: page.theme,
    custom_css: page.custom_css,
    requested_locale: requestedLocale,
    resolved_locale: resolvedLocale,
    title: translation.title,
    excerpt: translation.excerpt,
    featured_image: translation.featured_image,
    meta_title: translation.meta_title,
    meta_description: translation.meta_description,
    og_image: translation.og_image,
    body_html: bodyHtml,
    body_is_empty: bodyHtml.trim() === '',
    menu_parent: menuParent,
    children
  }

  t.mark('build-response')
  t.total()
  return response
}, {
  // Keyed by (locale, slug). Purged from mutation endpoints via
  // purgeCmsPage() in server/utils/cmsCache.ts. The slug is hex-encoded
  // because Nitro's internal escapeKey() strips non-word chars (`:`,
  // `/`, `-`), which would otherwise collide nested slugs like
  // `about/team` with `about-team`.
  name: 'cms',
  getKey: (event) => {
    const raw = getRouterParam(event, 'slug')
    const slugParam = Array.isArray(raw) ? raw.join('/') : (raw ?? '')
    const slug = slugParam.replace(/^\/+|\/+$/g, '')
    const q = getQuery(event)
    const requested = typeof q.locale === 'string' ? q.locale : 'en'
    const locale = ENABLED_LOCALES.has(requested) ? requested : 'en'
    const key = `${locale}_${Buffer.from(slug).toString('hex')}`
    console.log(`[cms-getKey] ${slug} locale=${locale} -> ${key}`)
    return key
  },
  maxAge: 60 * 60,
  swr: true,
  // Admins editing content must never see — or poison — cached output.
  shouldBypassCache: (event) => {
    const has = !!getCookie(event, 'auth-token')
    if (has) console.log(`[cms-bypass] auth-token cookie present, skipping cache`)
    return has
  }
})

// Outer wrapper times the TOTAL request (including Nitro cache layer
// logic). Compare to cms-inner TOTAL to figure out what Nitro's cache
// layer spends: if outer≈inner we're running the handler every time
// (cache broken); if outer≪inner on follow-up requests, cache hit.
export default defineEventHandler(async (event) => {
  const reqId = Math.random().toString(36).slice(2, 8)
  const raw = getRouterParam(event, 'slug')
  const slugParam = Array.isArray(raw) ? raw.join('/') : (raw ?? '')
  const q = getQuery(event)
  const t0 = performance.now()
  console.log(`[cms-outer] ${reqId} ENTER method=${event.node.req.method} path=${slugParam} locale=${q.locale}`)
  try {
    const result = await cachedHandler(event)
    const ms = performance.now() - t0
    console.log(`[cms-outer] ${reqId} EXIT ${ms.toFixed(1)}ms status=${event.node.res.statusCode}`)
    return result
  } catch (e: any) {
    const ms = performance.now() - t0
    console.log(`[cms-outer] ${reqId} ERROR ${ms.toFixed(1)}ms status=${e?.statusCode} msg=${e?.statusMessage || e?.message}`)
    throw e
  }
})
