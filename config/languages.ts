// Single source of truth for language configuration
// Used by both nuxt.config.ts (i18n) and app/server code

export interface Language {
  code: string
  name: string           // English name
  nativeName: string     // Name in the language itself
  flag: string
  dir?: 'ltr' | 'rtl'    // Text direction (defaults to 'ltr')
  bibleId?: string       // Bolls.life translation ID for verse lookups
  bibleLabel?: string    // Display label for the Bible translation (defaults to bibleId)
  translationName?: string  // Language name used in LLM translation prompts when the plain name is ambiguous
  translationModel?: string // OpenRouter model override for this language (falls back to the site-wide setting)
  enabled?: boolean      // Whether the language is active in the UI (default: true)
  hideFromSwitcher?: boolean // If true, the language is routable (/de, /hi, …) but omitted from the public LanguageSwitcher dropdown
  latinHeadings?: boolean // Headings render in the Latin display font (Bebas Neue); set false for non-Latin scripts (default: true)
}

// All known languages — disabled languages are available for API responses
// but hidden from the UI language selector, translation targets, and admin content
// find translations: https://bolls.life/static/bolls/app/views/languages.json
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', bibleId: 'NKJV' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', bibleId: 'NVI' }, //RV1960
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', bibleId: 'FRLSG', bibleLabel: 'LSG' }, //maybe BDS
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', bibleId: 'NAA', translationName: 'Brazilian Portuguese' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', bibleId: 'S00', bibleLabel: 'SCH2000', hideFromSwitcher: true },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', bibleId: 'NR06', enabled: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', bibleId: 'CUNPS', translationName: 'Simplified Chinese', enabled: false, latinHeadings: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl', bibleId: 'SVD', translationName: 'Modern Standard Arabic', latinHeadings: false }, // NAV (New Arabic Version) would be better but not on Bolls
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', bibleId: 'SYNOD', latinHeadings: false }, // NRT (New Russian Translation) is a modern alternative
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', bibleId: 'HIOV', bibleLabel: 'OV', hideFromSwitcher: true, latinHeadings: false },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', bibleId: 'NTR', enabled: false },
]

// All language codes
export const LANGUAGE_CODES = LANGUAGES.map(lang => lang.code)

// Enabled languages — used for front-end language switcher and i18n locales
export const ENABLED_LANGUAGES = LANGUAGES.filter(lang => lang.enabled !== false)
export const ENABLED_LANGUAGE_CODES = ENABLED_LANGUAGES.map(lang => lang.code)

// Generate i18n locale config from enabled languages only
export function generateI18nLocales() {
  return ENABLED_LANGUAGES.map(lang => ({
    code: lang.code,
    name: lang.nativeName,
    ...(lang.dir && { dir: lang.dir }),
    files: [
      `${lang.code}/common.json`
    ]
  }))
}

export function getLanguage(code: string): Language | undefined {
  return LANGUAGES.find(l => l.code === code)
}

// Whether this language's headings render in the Latin display font (Bebas Neue).
// Non-Latin scripts (Cyrillic, Arabic, CJK, Devanagari) fall back to other fonts,
// so callers can skip Bebas-specific work (e.g. preloading it). Unknown codes
// default to true.
export function usesLatinHeadings(code: string): boolean {
  return getLanguage(code)?.latinHeadings !== false
}
