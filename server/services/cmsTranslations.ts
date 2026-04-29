// Page-translation service. Wraps the upsert / status flips that
// admin routes do today, so MCP tools and admin can produce identical
// side effects (validation, transactional writes, cache purges).

import type { H3Error } from 'h3'
import { sql } from 'kysely'
import { db } from '../utils/database'
import { ENABLED_LANGUAGE_CODES } from '~~/config/languages'
import { purgeCmsPage, purgeCmsCategory } from '../utils/cmsCache'
import type { PageTranslation } from '../database/pages'
import { detectLossy } from '../utils/tiptapLossyDetector'
import { tiptapValidate } from '../utils/tiptapValidate'
import { markdownToTiptap } from '../utils/tiptapFromMarkdown'
import { isSafeHttpUrl as isSafeUrl } from '../utils/urlValidation'

function err(statusCode: number, message: string, extra?: Record<string, unknown>): H3Error {
  return Object.assign(new Error(message), {
    statusCode,
    statusMessage: message,
    data: { message, ...extra }
  }) as unknown as H3Error
}

export interface UpsertTranslationInput {
  page_id: string
  locale: string
  title: string
  body_markdown?: string
  body_json?: Record<string, unknown>
  excerpt?: string | null
  featured_image?: string | null
  meta_title?: string | null
  meta_description?: string | null
  og_image?: string | null
  status?: 'draft' | 'published'
  allow_lossy_overwrite?: boolean
}

export interface UpsertTranslationResult {
  translation: PageTranslation
  pageSlug: string
  categoryId: string | null
  // True iff the input came in as Markdown and the existing body was
  // lossy-in-markdown but allow_lossy_overwrite was set — the caller
  // should log an mcp.lossy_overwrite event with the dropped reasons.
  lossyOverwriteApplied: boolean
  droppedReasons: string[]
}

const URL_BEARING_FIELDS: ReadonlyArray<keyof UpsertTranslationInput> = [
  'featured_image', 'og_image'
]

export async function upsertCmsPageTranslation(input: UpsertTranslationInput): Promise<UpsertTranslationResult> {
  if (!ENABLED_LANGUAGE_CODES.includes(input.locale)) {
    throw err(400, 'locale is not enabled')
  }
  const title = (input.title ?? '').trim()
  if (!title) throw err(400, 'title is required')
  if (title.length > 500) throw err(400, 'title must be ≤ 500 chars')

  const hasMarkdown = typeof input.body_markdown === 'string'
  const hasJson = input.body_json && typeof input.body_json === 'object'
  if (!hasMarkdown && !hasJson) throw err(400, 'one of body_markdown or body_json is required')
  if (hasMarkdown && hasJson) throw err(400, 'provide exactly one of body_markdown or body_json')

  const page = await db
    .selectFrom('pages')
    .select(['id', 'slug', 'category_id'])
    .where('id', '=', input.page_id)
    .executeTakeFirst()
  if (!page) throw err(404, 'Page not found')

  const existing = await db
    .selectFrom('page_translations')
    .selectAll()
    .where('page_id', '=', input.page_id)
    .where('locale', '=', input.locale)
    .executeTakeFirst()

  let droppedReasons: string[] = []
  let lossyOverwriteApplied = false
  let body_json: Record<string, unknown>

  if (hasJson) {
    body_json = input.body_json as Record<string, unknown>
    tiptapValidate(body_json)
  } else {
    // Markdown path — refuse to overwrite a lossy body unless the
    // operator acknowledges via allow_lossy_overwrite.
    if (existing) {
      const existingLossy = detectLossy(existing.body_json)
      if (existingLossy.body_is_lossy_in_markdown) {
        if (!input.allow_lossy_overwrite) {
          throw err(409, 'lossy_overwrite_blocked', {
            error: 'lossy_overwrite_blocked',
            body_lossy_reasons: existingLossy.body_lossy_reasons
          })
        }
        droppedReasons = existingLossy.body_lossy_reasons
        lossyOverwriteApplied = true
      }
    }
    if ((input.body_markdown ?? '').length > 1024 * 1024) {
      throw err(400, 'body_markdown must be ≤ 1 MB')
    }
    body_json = markdownToTiptap(input.body_markdown ?? '') as unknown as Record<string, unknown>
    tiptapValidate(body_json)
  }

  // Field-size guards (post-validate so we don't leak sanitized
  // structure on early bailouts)
  if (input.excerpt && input.excerpt.length > 2048) throw err(400, 'excerpt must be ≤ 2 KB')
  if (input.meta_title && input.meta_title.length > 255) throw err(400, 'meta_title must be ≤ 255 chars')
  if (input.meta_description && input.meta_description.length > 500) throw err(400, 'meta_description must be ≤ 500 chars')

  for (const field of URL_BEARING_FIELDS) {
    const v = input[field]
    if (typeof v === 'string' && v && !isSafeUrl(v)) {
      throw err(400, `${field} is not a safe URL`)
    }
  }

  const status = input.status
  if (status && status !== 'draft' && status !== 'published') {
    throw err(400, 'status must be draft or published')
  }

  let translation: PageTranslation
  if (existing) {
    translation = await db
      .updateTable('page_translations')
      .set({
        title,
        body_json: body_json as never,
        excerpt: input.excerpt ?? null,
        featured_image: input.featured_image ?? null,
        meta_title: input.meta_title ?? null,
        meta_description: input.meta_description ?? null,
        og_image: input.og_image ?? null,
        ...(status ? { status } : {}),
        updated: sql`now()`
      })
      .where('id', '=', existing.id)
      .returningAll()
      .executeTakeFirstOrThrow()
  } else {
    translation = await db
      .insertInto('page_translations')
      .values({
        page_id: input.page_id,
        locale: input.locale,
        title,
        body_json: body_json as never,
        excerpt: input.excerpt ?? null,
        featured_image: input.featured_image ?? null,
        meta_title: input.meta_title ?? null,
        meta_description: input.meta_description ?? null,
        og_image: input.og_image ?? null,
        status: status ?? 'draft'
      })
      .returningAll()
      .executeTakeFirstOrThrow()
  }

  return {
    translation,
    pageSlug: page.slug,
    categoryId: page.category_id,
    lossyOverwriteApplied,
    droppedReasons
  }
}

export async function getCmsPageTranslation(input: { page_id: string; locale: string }): Promise<PageTranslation | null> {
  const row = await db
    .selectFrom('page_translations')
    .selectAll()
    .where('page_id', '=', input.page_id)
    .where('locale', '=', input.locale)
    .executeTakeFirst()
  return row ?? null
}

export async function setCmsTranslationStatus(input: {
  page_id: string
  locale: string
  status: 'draft' | 'published'
}): Promise<{ translation: PageTranslation; pageSlug: string; categoryId: string | null }> {
  if (!ENABLED_LANGUAGE_CODES.includes(input.locale)) {
    throw err(400, 'locale is not enabled')
  }

  const page = await db
    .selectFrom('pages')
    .select(['slug', 'category_id'])
    .where('id', '=', input.page_id)
    .executeTakeFirst()
  if (!page) throw err(404, 'Page not found')

  const updated = await db
    .updateTable('page_translations')
    .set({ status: input.status, updated: sql`now()` })
    .where('page_id', '=', input.page_id)
    .where('locale', '=', input.locale)
    .returningAll()
    .executeTakeFirst()

  if (!updated) throw err(404, 'Translation not found')

  return { translation: updated, pageSlug: page.slug, categoryId: page.category_id }
}

export async function applyTranslationInvalidations(slug: string, categoryId: string | null, locale?: string): Promise<void> {
  await purgeCmsPage(slug, locale ? [locale] : undefined)
  if (categoryId) await purgeCmsCategory(categoryId, slug)
}

