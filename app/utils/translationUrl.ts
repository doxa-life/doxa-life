// Port of the WordPress theme's `doxa_translation_url($slug)`.
// In Nuxt with `@nuxtjs/i18n` (`prefix_except_default`), locale-aware URLs
// are produced by `localePath()`. This is a thin wrapper so templates read
// the same as the PHP code they're ported from and so we have one place to
// adjust if slug→locale mapping ever diverges from English.

import type { RouteLocationRaw } from 'vue-router'

export function translationUrl(slug: string): string {
  const localePath = useLocalePath()
  // Accept either `/about/vision` or `about/vision`; normalize.
  const route = slug.startsWith('/') ? slug : `/${slug}`
  return localePath(route as RouteLocationRaw) ?? route
}
