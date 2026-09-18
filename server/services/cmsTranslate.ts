// LLM text-translation service — the canonical primitive both the
// MCP translate_text tool and the admin batch-translate flow share.
//
// Every translation prompt carries the target locale's approved terminology,
// read at runtime from the glossary published by pray.doxa.life, so the
// wording here matches the prayer site and the mobile app.

import type { H3Error } from 'h3'
import { translateTexts, translateTiptapContent, isTranslationConfigured } from '../utils/translate'
import { OpenRouterError } from '../utils/openrouter'
import { hasGlossary } from '../utils/glossary'
import { ENABLED_LANGUAGE_CODES } from '~~/config/languages'
import { db } from '../utils/database'
import {
  upsertCmsPageTranslation,
  applyTranslationInvalidations
} from './cmsTranslations'

function err(statusCode: number, message: string): H3Error {
  return Object.assign(new Error(message), {
    statusCode,
    statusMessage: message,
    data: { message }
  }) as unknown as H3Error
}

export interface TranslateTextInput {
  text: string
  source_locale?: string
  target_locales: string[]
}

export interface TranslateTextResultEntry {
  locale: string
  text: string
  glossary_used: boolean
}

export interface TranslateTextResult {
  source_locale: string
  translations: TranslateTextResultEntry[]
}

const MAX_TEXT_BYTES = 100 * 1024 // Per-request ceiling; large bodies should be
                                  // split client-side and translated piece by piece

export async function translateText(input: TranslateTextInput): Promise<TranslateTextResult> {
  if (!isTranslationConfigured()) {
    throw err(503, 'Translation is not configured on this server')
  }

  const text = input.text ?? ''
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw err(400, 'text is required')
  }
  if (Buffer.byteLength(text, 'utf8') > MAX_TEXT_BYTES) {
    throw err(413, `text exceeds ${MAX_TEXT_BYTES} bytes — split into smaller pieces`)
  }

  const source = input.source_locale ?? 'en'
  if (!ENABLED_LANGUAGE_CODES.includes(source)) {
    throw err(400, `source_locale "${source}" is not enabled`)
  }

  if (!Array.isArray(input.target_locales) || input.target_locales.length === 0) {
    throw err(400, 'target_locales must be a non-empty array')
  }
  for (const t of input.target_locales) {
    if (!ENABLED_LANGUAGE_CODES.includes(t)) {
      throw err(400, `target_locale "${t}" is not enabled`)
    }
    if (t === source) {
      throw err(400, `target_locale "${t}" cannot equal source_locale`)
    }
  }

  // Dedupe — Claude might list the same locale twice
  const targets = Array.from(new Set(input.target_locales))

  // One model call per target locale — each prompt is built around a single
  // target language and carries that locale's glossary.
  const results = await Promise.all(
    targets.map(async (locale) => {
      const out = await translateTexts([text], locale, source)
      return {
        locale,
        text: out[0] ?? '',
        glossary_used: await hasGlossary(locale)
      }
    })
  )

  return {
    source_locale: source,
    translations: results
  }
}

// ── Page-level translate ────────────────────────────────────────────

export interface TranslatePageInput {
  page_id: string
  source_locale?: string
  target_locales: string[]
  // When false (default), skip locales that already have a translation row.
  // When true, replace the existing row's body and metadata.
  overwrite?: boolean
  status?: 'draft' | 'published'
  // Optional actor (the user who initiated the bulk translate) — recorded
  // on each version-history snapshot the upsert produces.
  actor_user_id?: string | null
}

export interface TranslatePageResultEntry {
  locale: string
  // Mutually exclusive: either ok=true (translation written), skipped=true
  // (existing row preserved, no model call), or error set (translation
  // failed for this locale only — other locales still proceed).
  ok?: true
  skipped?: true
  error?: string
}

export interface TranslatePageResult {
  source_locale: string
  results: TranslatePageResultEntry[]
}

// Translate a whole CMS page (title, excerpt, meta_title,
// meta_description, body_json) from a source locale into one or more
// targets. Per-locale failures don't abort the batch — the model flaking
// on one locale shouldn't block the others. The exception is a failure no
// retry can fix (no credits, bad key, rejected model): the remaining
// locales are marked with the same reason instead of repeating the call.
//
// Each successful translation is written via upsertCmsPageTranslation,
// so the standard validator + cache-invalidation path runs on every
// translated row (consistent with hand-edited translations).
export async function translatePage(input: TranslatePageInput): Promise<TranslatePageResult> {
  if (!isTranslationConfigured()) {
    throw err(503, 'Translation is not configured on this server')
  }

  const sourceLocale = input.source_locale ?? 'en'
  if (!ENABLED_LANGUAGE_CODES.includes(sourceLocale)) {
    throw err(400, `source_locale "${sourceLocale}" is not enabled`)
  }

  if (!Array.isArray(input.target_locales) || input.target_locales.length === 0) {
    throw err(400, 'target_locales must be a non-empty array')
  }
  const targets = Array.from(new Set(
    input.target_locales.filter(l => ENABLED_LANGUAGE_CODES.includes(l) && l !== sourceLocale)
  ))
  if (targets.length === 0) {
    throw err(400, 'target_locales contains no enabled non-source locales')
  }

  const status: 'draft' | 'published' = input.status === 'published' ? 'published' : 'draft'

  const source = await db
    .selectFrom('page_translations')
    .selectAll()
    .where('page_id', '=', input.page_id)
    .where('locale', '=', sourceLocale)
    .executeTakeFirst()
  if (!source) {
    throw err(404, `No ${sourceLocale} translation to translate from`)
  }

  const results: TranslatePageResultEntry[] = []

  for (const [i, target] of targets.entries()) {
    if (!input.overwrite) {
      const existing = await db
        .selectFrom('page_translations')
        .select('id')
        .where('page_id', '=', input.page_id)
        .where('locale', '=', target)
        .executeTakeFirst()
      if (existing) {
        results.push({ locale: target, skipped: true })
        continue
      }
    }

    try {
      const [translatedTitle, translatedExcerpt, translatedMetaTitle, translatedMetaDescription]
        = await translateTexts([
          source.title ?? '',
          source.excerpt ?? '',
          source.meta_title ?? '',
          source.meta_description ?? ''
        ], target, sourceLocale)

      const translatedBody = await translateTiptapContent(source.body_json as never, target, sourceLocale)

      const upserted = await upsertCmsPageTranslation({
        page_id: input.page_id,
        locale: target,
        title: translatedTitle || source.title,
        body_json: translatedBody as unknown as Record<string, unknown>,
        excerpt: translatedExcerpt || null,
        featured_image: source.featured_image,
        meta_title: translatedMetaTitle || null,
        meta_description: translatedMetaDescription || null,
        og_image: source.og_image,
        status,
        actor_user_id: input.actor_user_id ?? null,
        source: 'auto-translate'
      })

      // Per-locale cache purge after each successful upsert. This
      // keeps the invalidation contract identical to admin's pre-
      // unification behavior — locales that errored or were skipped
      // never had their cache touched.
      await applyTranslationInvalidations(upserted.pageUrl, upserted.categoryId, target)

      results.push({ locale: target, ok: true })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'translation failed'
      console.error(`[cmsTranslate] page ${input.page_id} → ${target} failed:`, msg)
      results.push({ locale: target, error: msg })

      if (e instanceof OpenRouterError && !e.retryable) {
        // Every remaining locale would hit the same wall, so report one
        // reason rather than burning a call per locale to rediscover it.
        for (const remaining of targets.slice(i + 1)) {
          results.push({ locale: remaining, error: msg })
        }
        break
      }
    }
  }

  return {
    source_locale: sourceLocale,
    results
  }
}
