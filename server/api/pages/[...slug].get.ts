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

// defineCachedEventHandler + getCookie are Nitro globals (auto-imported);
// no h3 import needed for them.
import { getRouterParam, getQuery, createError } from 'h3'
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

export default defineCachedEventHandler(async (event) => {
  const raw = getRouterParam(event, 'slug')
  const slugParam = Array.isArray(raw) ? raw.join('/') : (raw ?? '')
  const slug = slugParam.replace(/^\/+|\/+$/g, '')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
  }

  const query = getQuery(event)
  const requested = typeof query.locale === 'string' ? query.locale : 'en'
  const locale = ENABLED_LOCALES.has(requested) ? requested : 'en'

  // Try the slug as a page first. If no page row matches, see if the
  // slug identifies a category, and render its default page.
  let result = await getPageBySlug(slug, locale, { fallback: 'en' })
  let bareCategorySlug: string | null = null

  if (!result) {
    const category = await getCategoryBySlug(slug)
    if (category) {
      const defaultPage = await getCategoryDefaultPage(category.id, locale, 'en')
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
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }

  const { page, translation, resolvedLocale, requestedLocale } = result
  const bodyHtml = renderTiptap(translation.body_json)

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

  return {
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
    return `${locale}_${Buffer.from(slug).toString('hex')}`
  },
  maxAge: 60 * 60,
  swr: true,
  // Admins editing content must never see — or poison — cached output.
  shouldBypassCache: event => !!getCookie(event, 'auth-token')
})
