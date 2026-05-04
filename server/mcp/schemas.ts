// Zod input schemas for the MCP CMS tool surface. The schemas are
// also projected to JSON Schema by the layer's registry and emitted
// in tools/list, so the runtime parser and the advertised contract
// can't drift.
//
// All schemas use .strict() so unknown keys fail loudly — typos in
// MCP clients surface as validation errors instead of silent drops.

import { z } from 'zod'

const slugString = z.string().min(1).max(255)
const localeString = z.string().min(2).max(20)
const titleString = z.string().min(1).max(500)
const idString = z.string().min(1).max(64)

// body_json serialized-size cap. Matches the body_markdown 1 MB cap so the
// two input shapes have parity, and stays well under the MCP transport's
// 2 MB body ceiling. Pathological structure (deeply nested or huge node
// count) is caught further in by tiptapValidate's depth/node limits.
const MAX_BODY_JSON_BYTES = 1024 * 1024
const bodyJsonInput = z
  .record(z.unknown())
  .refine(
    v => JSON.stringify(v).length <= MAX_BODY_JSON_BYTES,
    { message: `body_json serialized exceeds ${MAX_BODY_JSON_BYTES} bytes (1 MB)` }
  )

// ── List pages ──────────────────────────────────────────────────────

export const listPagesInput = z
  .object({
    category_id: idString.nullish(),
    status: z.enum(['draft', 'published', 'any']).optional(),
    locale: localeString.optional(),
    query: z.string().max(255).optional(),
    limit: z.number().int().positive().max(200).optional(),
    cursor: z.string().max(2048).optional()
  })
  .strict()
  .superRefine((v, ctx) => {
    // status=draft|published only meaningful with a locale
    if (v.status && v.status !== 'any' && !v.locale) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['status'],
        message: 'status filter requires locale (use status=any to skip)'
      })
    }
  })

// ── Get page ────────────────────────────────────────────────────────

export const getPageInput = z
  .object({
    id: idString.optional(),
    slug: slugString.optional()
  })
  .strict()
  .refine(v => Boolean(v.id) !== Boolean(v.slug), {
    message: 'exactly one of id or slug is required'
  })

// ── Create page ─────────────────────────────────────────────────────

const themeEnum = z.enum(['default', 'green'])
const statusEnum = z.enum(['draft', 'published'])

const inlineTranslationInput = z
  .object({
    locale: localeString,
    title: titleString,
    body_markdown: z.string().max(1024 * 1024).optional(),
    body_json: bodyJsonInput.optional(),
    excerpt: z.string().max(2048).nullish(),
    featured_image: z.string().max(2048).nullish(),
    meta_title: z.string().max(255).nullish(),
    meta_description: z.string().max(500).nullish(),
    og_image: z.string().max(2048).nullish(),
    status: statusEnum.optional()
  })
  .strict()
  .refine(v => Boolean(v.body_markdown) !== Boolean(v.body_json), {
    message: 'exactly one of body_markdown or body_json is required'
  })

export const createPageInput = z
  .object({
    slug: slugString,
    category_id: idString.nullish(),
    menu_order: z.number().int().min(0).optional(),
    theme: themeEnum.optional(),
    custom_css: z.string().max(16 * 1024).nullish(),
    translation: inlineTranslationInput.optional()
  })
  .strict()

// ── Update page ─────────────────────────────────────────────────────

export const updatePageInput = z
  .object({
    id: idString,
    slug: slugString.optional(),
    category_id: idString.nullish(),
    menu_order: z.number().int().min(0).optional(),
    theme: themeEnum.optional(),
    custom_css: z.string().max(16 * 1024).nullish()
  })
  .strict()

// ── Delete page ─────────────────────────────────────────────────────

export const deletePageInput = z.object({ id: idString }).strict()

// ── Translation ─────────────────────────────────────────────────────

export const getPageTranslationInput = z
  .object({
    page_id: idString,
    locale: localeString
  })
  .strict()

export const upsertPageTranslationInput = z
  .object({
    page_id: idString,
    locale: localeString,
    title: titleString,
    body_markdown: z.string().max(1024 * 1024).optional(),
    body_json: bodyJsonInput.optional(),
    excerpt: z.string().max(2048).nullish(),
    featured_image: z.string().max(2048).nullish(),
    meta_title: z.string().max(255).nullish(),
    meta_description: z.string().max(500).nullish(),
    og_image: z.string().max(2048).nullish(),
    status: statusEnum.optional(),
    allow_lossy_overwrite: z.boolean().optional()
  })
  .strict()
  .refine(v => Boolean(v.body_markdown) !== Boolean(v.body_json), {
    message: 'exactly one of body_markdown or body_json is required'
  })

export const publishTranslationInput = z
  .object({
    page_id: idString,
    locale: localeString
  })
  .strict()

export const unpublishTranslationInput = publishTranslationInput

// ── Categories ──────────────────────────────────────────────────────

const categoryTranslationsInput = z
  .array(
    z
      .object({
        locale: localeString,
        name: z.string().min(1).max(255)
      })
      .strict()
  )
  .min(1)

export const listCategoriesInput = z.object({}).strict()

export const createCategoryInput = z
  .object({
    slug: slugString,
    menu_order: z.number().int().min(0).optional(),
    translations: categoryTranslationsInput
  })
  .strict()

export const updateCategoryInput = z
  .object({
    id: idString,
    slug: slugString.optional(),
    menu_order: z.number().int().min(0).optional(),
    translations: categoryTranslationsInput.optional()
  })
  .strict()

export const deleteCategoryInput = z.object({ id: idString }).strict()

// ── Translation ─────────────────────────────────────────────────────

export const translateTextInput = z
  .object({
    text: z.string().min(1).max(100 * 1024),
    source_locale: localeString.optional(),
    target_locales: z.array(localeString).min(1).max(20)
  })
  .strict()

export const translatePageInput = z
  .object({
    page_id: idString,
    source_locale: localeString.optional(),
    target_locales: z.array(localeString).min(1).max(20),
    overwrite: z.boolean().optional(),
    status: z.enum(['draft', 'published']).optional()
  })
  .strict()

// ── Assets ──────────────────────────────────────────────────────────

export const prepareImageUploadInput = z
  .object({
    filename: z.string().min(1).max(255).optional(),
    mimeType: z.string().regex(/^image\/(jpeg|png|webp)$/, 'mimeType must be image/jpeg, image/png, or image/webp'),
    byte_size: z.number().int().positive().max(10 * 1024 * 1024)
  })
  .strict()

export const finalizeImageUploadInput = z
  .object({
    upload_token: z.string().min(1).max(2048),
    alt: z.string().max(500).optional()
  })
  .strict()
