// DeepL text-translation tool. Generic primitive — Claude composes
// with upsert_page_translation when applying translations to pages.
//
// The configured DeepL glossary for each target locale is always
// applied (the translateText service consults config/languages.ts),
// keeping MCP-driven translations terminologically consistent with
// admin auto-translates.

import { defineMcpTool, mcpLog } from '#mcp-layer'
import { translateTextInput, translatePageInput } from '../schemas'
import { translateText, translatePage } from '../../services/cmsTranslate'

const DESCRIPTION = `Translate a piece of text into one or more locales using DeepL.

Use this when you've authored a section in one language (typically English) and need versions in the site's other locales — for example, "translate this paragraph then add it to each page in every locale."

Inputs:
- \`text\`: the source text. Plain text or markdown — any markup is preserved as-is in the output.
- \`source_locale\`: defaults to "en"; must be one of the site's enabled locales.
- \`target_locales\`: array of locale codes to translate into; each must be enabled and different from the source.

Output: \`translations: [{locale, text, glossary_used}]\`. \`glossary_used\` is true when a per-locale terminology glossary was applied (consistent with admin auto-translate behavior). After this returns, embed each translated text into the corresponding locale's page via upsert_page_translation.

Limits: 100 KB per call. For longer content, split into sections and translate each separately.`

export const translateTextTool = defineMcpTool({
  name: 'translate_text',
  description: DESCRIPTION,
  scope: 'pages.write',
  input: translateTextInput,
  async handler(input, ctx) {
    const result = await translateText({
      text: input.text,
      source_locale: input.source_locale,
      target_locales: input.target_locales
    })

    // Audit the call so the activity log records when DeepL spend
    // happened on Claude's behalf. Don't include the full text in
    // metadata — keep the audit row small and non-PII-leaky.
    await mcpLog('CREATE', 'translations.cache', `${result.source_locale}->${result.translations.map(t => t.locale).join(',')}`, ctx, {
      source_locale: result.source_locale,
      target_locales: result.translations.map(t => t.locale),
      char_count: input.text.length
    })

    return {
      content: [{
        type: 'text',
        text: `Translated ${input.text.length} chars from ${result.source_locale} → ${result.translations.length} locale(s).`
      }],
      structuredContent: {
        source_locale: result.source_locale,
        translations: result.translations
      }
    }
  }
})

// ── Page-level translate ────────────────────────────────────────────

const PAGE_DESCRIPTION = `Translate an entire CMS page (title, excerpt, meta_title, meta_description, body) from one locale into one or more target locales using DeepL.

Use this for the "make this page exist in all locales" workflow. For surgical edits — translating one new section and inserting it into existing translations — prefer translate_text composed with upsert_page_translation.

Inputs:
- \`page_id\`: the CMS page id.
- \`source_locale\`: defaults to "en". Must be an enabled locale with an existing translation row.
- \`target_locales\`: array of enabled locale codes. Per-locale failures don't abort the batch — DeepL flaking on one locale lets the rest proceed.
- \`overwrite\`: defaults to false. When false, locales that already have a translation row are silently skipped (no DeepL call). Set true to replace.
- \`status\`: \`draft\` (default) or \`published\` for the new translation rows.

Output: \`{source_locale, results: [{locale, ok? | skipped? | error?}]}\`. Each result entry reports one of three outcomes; \`ok\` means a row was written and the public cache was purged for that locale.

Cost note: this triggers up to 5 DeepL calls per target locale (4 metadata strings batched into one call + 1 body call). A "translate to all 9 locales" run on a typical page is ~18 DeepL requests.`

export const translatePageTool = defineMcpTool({
  name: 'translate_page',
  description: PAGE_DESCRIPTION,
  scope: 'pages.write',
  input: translatePageInput,
  async handler(input, ctx) {
    const result = await translatePage({
      page_id: input.page_id,
      source_locale: input.source_locale,
      target_locales: input.target_locales,
      overwrite: input.overwrite,
      status: input.status
    })

    await mcpLog('UPDATE', 'pages', input.page_id, ctx, {
      event: 'TRANSLATE',
      source_locale: result.source_locale,
      target_locales: input.target_locales,
      results: result.results.map(r => ({
        locale: r.locale,
        outcome: r.ok ? 'ok' : r.skipped ? 'skipped' : 'error'
      }))
    })

    const okCount = result.results.filter(r => r.ok).length
    const skipCount = result.results.filter(r => r.skipped).length
    const errCount = result.results.filter(r => r.error).length
    return {
      content: [{
        type: 'text',
        text: `Translated page from ${result.source_locale}: ${okCount} written, ${skipCount} skipped, ${errCount} errored.`
      }],
      structuredContent: {
        source_locale: result.source_locale,
        results: result.results
      }
    }
  }
})

export const TRANSLATE_TOOLS = [translateTextTool, translatePageTool] as const
