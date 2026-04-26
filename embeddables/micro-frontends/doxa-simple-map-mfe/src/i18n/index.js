/**
 * i18n/index.js — Vue I18n setup for doxa-map-mfe
 *
 * One i18n instance per <doxa-map> element (via entry.js configureApp).
 *
 * Locales are organized as folder-per-locale with one JSON file per top-level
 * area (legend, detail, buttons, options, search, messages, aria, prayerLaps).
 *
 * Loading strategy:
 *   - English (fallback) is eager — always present before first render.
 *   - Detected non-en locale is lazy — fetched once, applied via setLocaleMessage.
 *     Until it resolves, vue-i18n's fallbackLocale renders English.
 *   In prod (IIFE build) `inlineDynamicImports: true` inlines everything anyway,
 *   so this is a dev-server-only win (88 module requests → 8 + 8 per instance).
 *
 * Locale detection priority:
 *   1. document.documentElement.lang   (set by Polylang on WordPress)
 *   2. 'en' fallback
 *
 * See docs/feedback.md → Section A for the design rationale.
 */

import { createI18n } from 'vue-i18n'

const enEager = import.meta.glob('./locales/en/*.json', { eager: true, import: 'default' })
const lazyModules = import.meta.glob('./locales/*/*.json', { import: 'default' })

function collectMessages(modules) {
  const out = {}
  for (const [path, subtree] of Object.entries(modules)) {
    const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/)
    if (!match) continue
    const [, locale, area] = match
    out[locale] ??= {}
    out[locale][area] = subtree
  }
  return out
}

const initialMessages = collectMessages(enEager)

export const SUPPORTED_LOCALES = ['ar', 'de', 'en', 'es', 'fr', 'hi', 'it', 'pt', 'ro', 'ru', 'zh']

export const RTL_LOCALES = new Set(['ar'])

export function detectLocale() {
  const raw = document?.documentElement?.lang || ''
  const code = raw.split('-')[0].toLowerCase()
  return SUPPORTED_LOCALES.includes(code) ? code : 'en'
}

const localeLoadCache = new Map()

function loadLocale(locale) {
  if (localeLoadCache.has(locale)) return localeLoadCache.get(locale)
  const prefix = `./locales/${locale}/`
  const entries = Object.entries(lazyModules).filter(([path]) => path.startsWith(prefix))
  const promise = Promise.all(
    entries.map(async ([path, loader]) => [path, await loader()])
  ).then((loaded) => collectMessages(Object.fromEntries(loaded))[locale] ?? {})
  localeLoadCache.set(locale, promise)
  return promise
}

/**
 * Build a fresh i18n instance. Called once per <doxa-map> element.
 */
export function createAppI18n() {
  const locale = detectLocale()
  const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale,
    fallbackLocale: 'en',
    messages: initialMessages,
    missingWarn: false,
    fallbackWarn: false,
  })
  if (locale !== 'en') {
    loadLocale(locale).then((messages) => {
      i18n.global.setLocaleMessage(locale, messages)
    })
  }
  return i18n
}

export default createAppI18n
