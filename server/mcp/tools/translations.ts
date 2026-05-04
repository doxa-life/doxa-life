// Page-translation tools: read, upsert, publish, unpublish.
//
// upsert_page_translation is the largest single tool — its description
// is load-bearing for Claude's Markdown-vs-JSON choice. The constant
// below is the source of truth for both the runtime parser context
// and the advertised description.

import { defineMcpTool, mcpLog } from '#mcp-layer'
import {
  getPageTranslationInput,
  upsertPageTranslationInput,
  publishTranslationInput,
  unpublishTranslationInput
} from '../schemas'
import {
  upsertCmsPageTranslation,
  getCmsPageTranslation,
  setCmsTranslationStatus,
  applyTranslationInvalidations
} from '../../services/cmsTranslations'
import { tiptapToMarkdown } from '../../utils/tiptapToMarkdown'
import { detectLossy } from '../../utils/tiptapLossyDetector'
import { logEvent } from '../../utils/activity-logger'

const UPSERT_DESCRIPTION = `Upsert a page translation for a given locale. Pass exactly one of body_markdown or body_json.

Markdown vs. JSON — which to use:
- For most edits prefer body_markdown — it is easier to author and round-trips cleanly for plain text, headings, bold/italic, lists, links, code, and images without alignment.
- Use body_json when the existing translation's body is lossy in Markdown (the read tools and resources surface body_is_lossy_in_markdown plus body_lossy_reasons). On a translation whose current body is lossy, a Markdown overwrite is rejected with {error: "lossy_overwrite_blocked", body_lossy_reasons: [...]} unless allow_lossy_overwrite: true is also passed — that flag silently drops the lossy nodes/marks/attributes and persists the Markdown conversion.

Custom node JSON (when editing body_json directly):
- Verse: {"type":"verse","attrs":{"reference":"John 3:16"},"content":[{"type":"paragraph","content":[{"type":"text","text":"For God so loved the world..."}]}]}
- UupgsList: {"type":"uupgsList","attrs":{"languageCode":"en","perPage":12,"useSelectCard":true}}
- GeneralResources: {"type":"generalResources","attrs":{"useDocuments":true,"layout":"grid"}}
- CmsImage with align: {"type":"image","attrs":{"src":"https://...","alt":"...","align":"center"}}

Not allowed: inline HTML in Markdown is escaped to text; style/script/srcdoc/javascript: URLs reject. Tables in Markdown are preserved as literal text (no table extension is registered).

Status defaults to draft. Publishing requires the pages.publish scope — use publish_translation.`

export const getPageTranslationTool = defineMcpTool({
  name: 'get_page_translation',
  description: 'Fetch a single translation by page id + locale. Returns body_json (Tiptap), a Markdown rendering, and the lossy flag/reasons.',
  scope: 'pages.view',
  input: getPageTranslationInput,
  async handler(input) {
    const t = await getCmsPageTranslation({ page_id: input.page_id, locale: input.locale })
    if (!t) {
      return {
        content: [{ type: 'text', text: 'Translation not found' }],
        isError: true
      }
    }
    const lossy = detectLossy(t.body_json)
    return {
      content: [{ type: 'text', text: `Translation "${t.title}" (${t.locale}, ${t.status})` }],
      structuredContent: {
        id: t.id,
        page_id: t.page_id,
        locale: t.locale,
        title: t.title,
        body_json: t.body_json,
        body_markdown: tiptapToMarkdown(t.body_json),
        body_is_lossy_in_markdown: lossy.body_is_lossy_in_markdown,
        body_lossy_reasons: lossy.body_lossy_reasons,
        excerpt: t.excerpt,
        featured_image: t.featured_image,
        meta_title: t.meta_title,
        meta_description: t.meta_description,
        og_image: t.og_image,
        status: t.status,
        updated_at: new Date(t.updated as unknown as string).toISOString()
      }
    }
  }
})

export const upsertPageTranslationTool = defineMcpTool({
  name: 'upsert_page_translation',
  description: UPSERT_DESCRIPTION,
  scope: 'pages.write',
  input: upsertPageTranslationInput,
  async handler(input, ctx) {
    const result = await upsertCmsPageTranslation({
      page_id: input.page_id,
      locale: input.locale,
      title: input.title,
      body_markdown: input.body_markdown,
      body_json: input.body_json as Record<string, unknown> | undefined,
      excerpt: input.excerpt ?? null,
      featured_image: input.featured_image ?? null,
      meta_title: input.meta_title ?? null,
      meta_description: input.meta_description ?? null,
      og_image: input.og_image ?? null,
      status: input.status,
      allow_lossy_overwrite: input.allow_lossy_overwrite
    })

    await mcpLog('UPDATE', 'page_translations', result.translation.id, ctx, {
      page_id: input.page_id,
      locale: input.locale,
      status: result.translation.status,
      via: 'upsert_page_translation'
    })

    if (result.lossyOverwriteApplied) {
      await logEvent({
        eventType: 'mcp.lossy_overwrite',
        tableName: 'page_translations',
        recordId: result.translation.id,
        userId: ctx.auth.userId,
        metadata: {
          source: 'mcp',
          client_id: ctx.auth.clientId,
          tool: 'upsert_page_translation',
          locale: input.locale,
          dropped_reasons: result.droppedReasons
        }
      })
    }

    await applyTranslationInvalidations(result.pageSlug, result.categoryId, input.locale)

    return {
      content: [{
        type: 'text',
        text: `Saved translation "${result.translation.title}" (${result.translation.locale}, ${result.translation.status})`
      }],
      structuredContent: { translation: result.translation }
    }
  }
})

export const publishTranslationTool = defineMcpTool({
  name: 'publish_translation',
  description: 'Publish a translation. The body content is not changed — only the status flips to "published". Errors if the translation does not exist.',
  scope: 'pages.publish',
  input: publishTranslationInput,
  async handler(input, ctx) {
    const result = await setCmsTranslationStatus({
      page_id: input.page_id,
      locale: input.locale,
      status: 'published'
    })
    await mcpLog('UPDATE', 'page_translations', result.translation.id, ctx, {
      field: 'status',
      to: 'published',
      locale: input.locale
    })
    await applyTranslationInvalidations(result.pageSlug, result.categoryId, input.locale)
    return {
      content: [{ type: 'text', text: `Published ${result.translation.locale} translation` }],
      structuredContent: { translation: result.translation }
    }
  }
})

export const unpublishTranslationTool = defineMcpTool({
  name: 'unpublish_translation',
  description: 'Unpublish a translation (status flips to "draft"). The body content is preserved.',
  scope: 'pages.publish',
  input: unpublishTranslationInput,
  async handler(input, ctx) {
    const result = await setCmsTranslationStatus({
      page_id: input.page_id,
      locale: input.locale,
      status: 'draft'
    })
    await mcpLog('UPDATE', 'page_translations', result.translation.id, ctx, {
      field: 'status',
      to: 'draft',
      locale: input.locale
    })
    await applyTranslationInvalidations(result.pageSlug, result.categoryId, input.locale)
    return {
      content: [{ type: 'text', text: `Unpublished ${result.translation.locale} translation` }],
      structuredContent: { translation: result.translation }
    }
  }
})

export const TRANSLATION_TOOLS = [
  getPageTranslationTool,
  upsertPageTranslationTool,
  publishTranslationTool,
  unpublishTranslationTool
] as const
