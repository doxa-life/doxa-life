// Public CMS page read endpoint. Resolves a "/"-separated URL path
// against the category tree:
//
//   /resources              → top-level category "resources"
//   /resources/adoption     → child category "adoption" under "resources"
//   /resources/overview     → page "overview" inside "resources"
//   /privacy                → uncategorized page "privacy"
//
// Walks every URL segment against the categories table from the root
// down. Whatever doesn't match a category is treated as a page leaf
// inside the deepest matched category. Bare-category URLs render the
// category's default page (lowest menu_order with a published
// translation).
//
// The response includes a sidebar of sibling pages, sibling
// categories below the active one (so /resources can render a card
// grid of "Adoption / Training / Mobilization"), and the menu parent
// for breadcrumbs.

import { getRouterParam, getQuery, createError } from 'h3'
import {
  findPageInCategory,
  getLocalizedTranslation
} from '../../database/pages'
import {
  getCategoryDefaultPage,
  getCategoryName,
  getCategoryPageTranslations,
  getChildCategories
} from '../../database/categories'
import { renderTiptap } from '../../utils/renderTiptap'
import { ENABLED_LANGUAGE_CODES } from '../../../config/languages'
import {
  loadCategoryTree,
  walkCategorySegments,
  pageUrlPath,
  categoryUrlPath
} from '../../database/categoryTree'
import type { LocalizedPage } from '../../database/pages'
import type { TreeCategory } from '../../database/categoryTree'

const ENABLED_LOCALES = new Set(ENABLED_LANGUAGE_CODES)

interface ChildCategorySummary {
  slug: string
  url: string
  title: string
  excerpt: string | null
  featured_image: string | null
  menu_order: number
}

interface NavPageNode {
  kind: 'page'
  url: string
  title: string
  menu_order: number
}

interface NavCategoryNode {
  kind: 'category'
  url: string
  title: string
  menu_order: number
  items: Array<NavPageNode | NavCategoryNode>
}

type NavNode = NavPageNode | NavCategoryNode

// Builds the recursive sidebar tree rooted at `categoryId`. Each
// category becomes a heading whose `items` are its direct pages plus
// each child category's own subtree, ordered by menu_order then slug.
async function buildNavTree(
  categoryId: string,
  locale: string,
  fallbackLocale: string,
  tree: { byId: Map<string, { id: string; slug: string; menu_order: number; parent_id: string | null }>; childrenByParent: Map<string | null, Array<{ id: string; slug: string; menu_order: number; parent_id: string | null }>> }
): Promise<NavCategoryNode> {
  const node = tree.byId.get(categoryId)
  const [name, pageRows] = await Promise.all([
    getCategoryName(categoryId, locale, fallbackLocale),
    getCategoryPageTranslations(categoryId, locale, fallbackLocale)
  ])
  const url = categoryUrlPath(tree as never, categoryId)

  const pageItems: NavPageNode[] = pageRows.map(({ page, translation }) => ({
    kind: 'page' as const,
    url: pageUrlPath(tree as never, page),
    title: translation.title,
    menu_order: page.menu_order
  }))

  const childCats = tree.childrenByParent.get(categoryId) ?? []
  const childSections = await Promise.all(
    childCats.map(c => buildNavTree(c.id, locale, fallbackLocale, tree))
  )

  // Interleave pages and child categories by menu_order so authors
  // can rank a "sub-section heading" between two pages if they want.
  const items: NavNode[] = [...pageItems, ...childSections]
    .sort((a, b) => a.menu_order - b.menu_order || a.title.localeCompare(b.title))

  return {
    kind: 'category' as const,
    url,
    title: name ?? node?.slug ?? '',
    menu_order: node?.menu_order ?? 0,
    items
  }
}

async function summarizeChildCategories(
  parents: TreeCategory[],
  locale: string,
  fallbackLocale: string,
  basePath: string
): Promise<ChildCategorySummary[]> {
  const out: ChildCategorySummary[] = []
  for (const child of parents) {
    const [name, defaultPage] = await Promise.all([
      getCategoryName(child.id, locale, fallbackLocale),
      getCategoryDefaultPage(child.id, locale, fallbackLocale)
    ])
    if (!name) continue
    out.push({
      slug: child.slug,
      url: basePath ? `${basePath}/${child.slug}` : child.slug,
      title: name,
      excerpt: defaultPage?.translation.excerpt ?? null,
      featured_image: defaultPage?.translation.featured_image ?? null,
      menu_order: child.menu_order
    })
  }
  return out
}

export default defineCachedEventHandler(async (event) => {
  const raw = getRouterParam(event, 'slug')
  const slugParam = Array.isArray(raw) ? raw.join('/') : (raw ?? '')
  const fullPath = slugParam.replace(/^\/+|\/+$/g, '')
  if (!fullPath) {
    throw createError({ statusCode: 400, statusMessage: 'Missing slug' })
  }

  const query = getQuery(event)
  const requested = typeof query.locale === 'string' ? query.locale : 'en'
  const locale = ENABLED_LOCALES.has(requested) ? requested : 'en'
  const fallbackLocale = 'en'

  const segments = fullPath.split('/').filter(Boolean)
  const tree = await loadCategoryTree()
  const { category: deepestCategory, remaining } = walkCategorySegments(tree, segments)

  // Resolve to either a page (in deepestCategory) or a category landing.
  let result: LocalizedPage | null = null
  let resolvedCategory: TreeCategory | null = deepestCategory
  let bareCategory: TreeCategory | null = null

  if (remaining.length === 0 && deepestCategory) {
    // Bare category URL like /resources or /resources/adoption.
    const def = await getCategoryDefaultPage(deepestCategory.id, locale, fallbackLocale)
    if (def) {
      result = {
        page: def.page,
        translation: def.translation,
        resolvedLocale: def.translation.locale,
        requestedLocale: locale
      }
      bareCategory = deepestCategory
      resolvedCategory = deepestCategory
    } else {
      // Empty category — still render a landing if it has child
      // categories. Use a synthetic empty translation.
      const childCats = tree.childrenByParent.get(deepestCategory.id) ?? []
      if (childCats.length === 0) {
        throw createError({ statusCode: 404, statusMessage: 'Page not found' })
      }
      bareCategory = deepestCategory
      resolvedCategory = deepestCategory
    }
  } else if (remaining.length === 1) {
    // Final segment is a page leaf inside `deepestCategory` (or
    // uncategorized when no category matched at all).
    const parentCategoryId = deepestCategory?.id ?? null
    const page = await findPageInCategory(parentCategoryId, remaining[0]!)
    if (page) {
      const localized = await getLocalizedTranslation(page.id, locale, { fallback: fallbackLocale })
      if (localized) {
        result = localized
        resolvedCategory = deepestCategory
      }
    }
  }
  // Anything deeper than one trailing leaf can't resolve — slugs are
  // single segments now.

  if (!result && !bareCategory) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }

  const renderedLocale = result?.resolvedLocale ?? fallbackLocale
  const requestedLocale = locale
  const bodyHtml = result ? renderTiptap(result.translation.body_json) : ''

  // Build the navigation sidebar: siblings within the resolved category.
  let menuParent: { slug: string; url: string; title: string } | null = null
  let categorySlug: string | null = null
  let categoryUrl: string | null = null
  let children: Array<{
    slug: string
    url: string
    title: string
    excerpt: string | null
    featured_image: string | null
    menu_order: number
  }> = []

  const navCategoryId = result?.page.category_id ?? bareCategory?.id ?? null
  let navTree: NavCategoryNode | null = null
  if (navCategoryId) {
    const [categoryName, siblingRows] = await Promise.all([
      getCategoryName(navCategoryId, renderedLocale, fallbackLocale),
      getCategoryPageTranslations(navCategoryId, renderedLocale, fallbackLocale)
    ])
    const navCategory = tree.byId.get(navCategoryId) ?? null
    categorySlug = navCategory?.slug ?? null
    categoryUrl = categoryUrlPath(tree, navCategoryId) || null
    if (categoryUrl && categoryName) {
      menuParent = { slug: categorySlug ?? '', url: categoryUrl, title: categoryName }
    }
    children = siblingRows.map(({ page: c, translation: t }) => ({
      slug: c.slug,
      url: pageUrlPath(tree, c),
      title: t.title,
      excerpt: t.excerpt,
      featured_image: t.featured_image,
      menu_order: c.menu_order
    }))

    // Build the recursive sidebar rooted at the top-level ancestor
    // of the current category. Every page in the subtree shares the
    // same sidebar — visiting /resources/adoption/foo gives the same
    // nav as /resources/training/bar.
    let navRootId = navCategoryId
    while (true) {
      const ancestor = tree.byId.get(navRootId)
      if (!ancestor?.parent_id) break
      navRootId = ancestor.parent_id
    }
    navTree = await buildNavTree(navRootId, renderedLocale, fallbackLocale, tree as never)
  }

  // Child categories below this one — surfaced so archive landing
  // pages can render a card grid of subsections.
  let childCategories: ChildCategorySummary[] = []
  const isCategoryLanding = Boolean(bareCategory) || (
    Boolean(resolvedCategory) && result?.page.menu_order === 0
  )
  if (isCategoryLanding && resolvedCategory) {
    const cats = tree.childrenByParent.get(resolvedCategory.id) ?? []
    if (cats.length > 0) {
      const basePath = categoryUrlPath(tree, resolvedCategory.id)
      childCategories = await summarizeChildCategories(cats, renderedLocale, fallbackLocale, basePath)
    }
  }

  const url = result ? pageUrlPath(tree, result.page) : (bareCategory ? categoryUrlPath(tree, bareCategory.id) : fullPath)

  return {
    url,
    slug: result?.page.slug ?? bareCategory?.slug ?? '',
    category_id: result?.page.category_id ?? bareCategory?.id ?? null,
    category_slug: categorySlug,
    category_url: categoryUrl,
    menu_order: result?.page.menu_order ?? 0,
    theme: result?.page.theme ?? 'default',
    custom_css: result?.page.custom_css ?? null,
    requested_locale: requestedLocale,
    resolved_locale: renderedLocale,
    title: result?.translation.title ?? '',
    excerpt: result?.translation.excerpt ?? null,
    featured_image: result?.translation.featured_image ?? null,
    meta_title: result?.translation.meta_title ?? null,
    meta_description: result?.translation.meta_description ?? null,
    og_image: result?.translation.og_image ?? null,
    body_html: bodyHtml,
    body_is_empty: bodyHtml.trim() === '',
    is_category_landing: isCategoryLanding,
    menu_parent: menuParent,
    children,
    child_categories: childCategories,
    nav_tree: navTree
  }
}, {
  // Keyed by (locale, full URL path). The slug is hex-encoded because
  // Nitro's escapeKey() strips non-word characters (`:`, `/`, `-`),
  // which would otherwise collide nested paths like `about/team` with
  // `about-team`.
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
  shouldBypassCache: event => !!getCookie(event, 'auth-token')
})
