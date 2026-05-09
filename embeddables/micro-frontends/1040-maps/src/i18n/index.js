/**
 * i18n/index.js — Vue I18n setup for doxa-map-mfe
 *
 * One i18n instance per <doxa-map> element (via entry.js configureApp).
 * All 11 locale catalogs are inlined in the IIFE bundle (Vite can't code-split
 * IIFE output anyway; strings-only catalog size is small).
 *
 * LAZY-LOAD EXPERIMENT (2026-04-26): converted to `import.meta.glob({ eager:false })`
 * with `setLocale()` helper + eager `en` fallback. Result: bundle GREW by ~22 KB
 * raw / ~5 KB gz because Vite's `inlineDynamicImports: true` (required for IIFE)
 * inlines every dynamic chunk back into the IIFE AND adds per-import wrapper
 * closures + a runtime resolver. Reverted to eager glob.
 *
 * If we ever want a real win here, the path is:
 *   - Ship `en` only in the IIFE.
 *   - Host other locales as standalone JSON at a known URL (e.g. /widgets/research-map/locales/<lc>.json).
 *   - Fetch + setLocaleMessage() on demand (no Vite dynamic-import involved).
 * That requires Nuxt-side public asset placement and a CORS-safe fetch path,
 * so it's a deploy-pipeline change, not a build-config tweak.
 *
 * Locales are organized as folder-per-locale with one JSON file per top-level
 * area (legend, detail, buttons, options, search, messages, aria, prayerLaps).
 * A Vite eager glob loads all area files at build time and composes them into
 * the per-locale message object.
 *
 * Locale detection priority:
 *   1. document.documentElement.lang   (set by Polylang on WordPress)
 *   2. 'en' fallback
 *
 * Missing-key behavior: falls back to English. Missing-locale: whole map renders in English.
 *
 * See docs/feedback.md → Section A for the design rationale.
 */

import { createI18n } from 'vue-i18n'

// Eager glob — all locale subfolders inlined at build time
const rawModules = import.meta.glob('./locales/*/*.json', { eager: true, import: 'default' })
// rawModules keys look like './locales/ar/legend.json', './locales/ar/detail.json'
const messages = {}
for (const [path, subtree] of Object.entries(rawModules)) {
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/)
  if (!match) continue
  const [, locale, area] = match
  messages[locale] ??= {}
  messages[locale][area] = subtree
}

export const SUPPORTED_LOCALES = ['ar', 'de', 'en', 'es', 'fr', 'hi', 'it', 'pt', 'ro', 'ru', 'zh']

export const RTL_LOCALES = new Set(['ar'])

export function detectLocale() {
  const raw = document?.documentElement?.lang || ''
  const code = raw.split('-')[0].toLowerCase()
  return SUPPORTED_LOCALES.includes(code) ? code : 'en'
}

/**
 * Build a fresh i18n instance. Called once per <doxa-map> element.
 */
export function createAppI18n() {
  return createI18n({
    legacy: false,
    globalInjection: true,
    locale: detectLocale(),
    fallbackLocale: 'en',
    messages,
    missingWarn: false,
    fallbackWarn: false,
  })
}

export default createAppI18n
