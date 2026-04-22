// Inventory of CMS pages to scrape from the live WP site. Matches the
// Phase 7 plan. `englishOnly` pages skip non-EN locales. `parentSlug`
// gets written to the `pages` table.

export interface ScrapeTarget {
  slug: string
  parentSlug: string | null
  menuOrder: number
  englishOnly?: boolean
}

export const SCRAPE_TARGETS: ScrapeTarget[] = [
  // About family — all 8 Polylang locales live in the DB; scrape the 6 visible.
  // `about/documents` is NOT a CMS page on the live site (rendered by the
  // `[general_resources use_documents=true]` shortcode) and has a hardcoded
  // Vue page at app/pages/about/documents.vue. We still keep its pages row
  // in the DB (title only) so the sidebar nav lists it as a child of About.
  { slug: 'about',                    parentSlug: null,    menuOrder: 0 },
  { slug: 'about/vision',             parentSlug: 'about', menuOrder: 1 },
  { slug: 'about/statement-of-faith', parentSlug: 'about', menuOrder: 2 },
  { slug: 'about/definitions',        parentSlug: 'about', menuOrder: 3 },

  // Legal (8 langs)
  { slug: 'privacy-policy',           parentSlug: null,    menuOrder: 0 },

  // `/resources` itself is hardcoded (app/pages/resources/index.vue)
  // but the shortcode links out to these 4 child pages, which ARE real
  // CMS content (prose written by the team). Scraping them puts each
  // in `pages` with parent_slug='resources' so the sidebar nav shows
  // up on both /resources and on each child page.
  { slug: 'resources/tips-for-prayer-champions', parentSlug: 'resources', menuOrder: 1 },
  { slug: 'resources/small-group-discussion-guide', parentSlug: 'resources', menuOrder: 2 },
  { slug: 'resources/talking-points',             parentSlug: 'resources', menuOrder: 3 },
  { slug: 'resources/email-templates',            parentSlug: 'resources', menuOrder: 4 },

  // Ephemeral campaign pages — EN only
  { slug: 'pwf26',                    parentSlug: null,    menuOrder: 0, englishOnly: true },
  { slug: 'pray-for-the-zaghawa',     parentSlug: null,    menuOrder: 0, englishOnly: true },
  { slug: 'agwm-uupg-signup',         parentSlug: null,    menuOrder: 0, englishOnly: true },
  { slug: 'coming-soon',              parentSlug: null,    menuOrder: 0, englishOnly: true },
  { slug: 'events-page',              parentSlug: null,    menuOrder: 0, englishOnly: true }
]

// Locales with content in the live WP install. Keep aligned with
// config/languages.ts `enabled: true` set.
export const SCRAPE_LOCALES = ['en', 'es', 'fr', 'pt', 'ar', 'ru'] as const
export type ScrapeLocale = typeof SCRAPE_LOCALES[number]
