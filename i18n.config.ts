// vue-i18n runtime config. Mirrors the pattern used in campaigns-sever.
// `missingWarn`/`fallbackWarn` are disabled because our message store uses
// the English source string as the key — when a locale hasn't translated
// a given key, i18n returns the key itself, which is exactly the English
// we want. Suppressing the warning keeps the dev console quiet without
// changing runtime behaviour.

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: {}
}))
