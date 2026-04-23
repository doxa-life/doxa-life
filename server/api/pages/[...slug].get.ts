// Public CMS page read endpoint. Mirrors the plan:
// - picks the translation for the requested locale
// - falls back to English if that locale isn't published
// - 404s if neither are published
//
// Returns the translation (title, excerpt, featured_image, meta_*,
// status) plus pre-rendered HTML body (so the public bundle doesn't
// have to ship the Tiptap renderer) and the list of published child
// pages for sidebar navigation.

// defineCachedEventHandler + getCookie are Nitro globals (auto-imported);
// no h3 import needed for them.
import { getRouterParam, getQuery, createError } from 'h3'
import { getPageBySlug, getChildTranslations } from '../../database/pages'
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

  const result = await getPageBySlug(slug, locale, { fallback: 'en' })
  if (!result) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }

  const { page, translation, resolvedLocale, requestedLocale } = result
  const bodyHtml = renderTiptap(translation.body_json)

  // Menu parent = parent page if this is a child, or self if this is a
  // top-level page. Sidebar items = children of that menu parent.
  // Mirrors the WP page.php logic using `wp_get_post_parent_id()` and
  // `get_pages(['child_of' => $menu_parent_id])`.
  let menuParentSlug: string
  let menuParentTitle: string
  if (page.parent_slug) {
    const parent = await getPageBySlug(page.parent_slug, resolvedLocale, { fallback: 'en' })
    if (parent) {
      menuParentSlug = parent.page.slug
      menuParentTitle = parent.translation.title
    } else {
      // Parent row exists but isn't published — fall back to self
      menuParentSlug = page.slug
      menuParentTitle = translation.title
    }
  } else {
    menuParentSlug = page.slug
    menuParentTitle = translation.title
  }

  const siblings = await getChildTranslations(menuParentSlug, resolvedLocale, 'en')

  return {
    slug: page.slug,
    parent_slug: page.parent_slug,
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
    menu_parent: {
      slug: menuParentSlug,
      title: menuParentTitle
    },
    children: siblings.map(({ page: c, translation: t }) => ({
      slug: c.slug,
      title: t.title,
      excerpt: t.excerpt,
      featured_image: t.featured_image,
      menu_order: c.menu_order
    }))
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
