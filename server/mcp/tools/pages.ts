// Page CRUD tools — list, get, create, update, delete.
//
// All tool names are snake_case per MCP convention; the server name
// `doxa-cms` disambiguates in the client's tool list. Scopes are
// RBAC permission strings (no `cms.*` namespace) per the project's
// permission registry.

import { defineMcpTool, mcpLog } from '#mcp-layer'
import {
  listPagesInput,
  getPageInput,
  createPageInput,
  updatePageInput,
  deletePageInput
} from '../schemas'
import {
  listCmsPages,
  getCmsPage,
  createCmsPage,
  updateCmsPage,
  deleteCmsPage,
  applyPageInvalidations
} from '../../services/cmsPages'
import { upsertCmsPageTranslation, applyTranslationInvalidations } from '../../services/cmsTranslations'
import { tiptapValidate } from '../../utils/tiptapValidate'
import { markdownToTiptap } from '../../utils/tiptapFromMarkdown'
import { tiptapToMarkdown } from '../../utils/tiptapToMarkdown'
import { detectLossy } from '../../utils/tiptapLossyDetector'

export const listPagesTool = defineMcpTool({
  name: 'list_pages',
  description: 'List CMS pages with their translations. Returns a paginated list ordered by menu_order then id; use the returned `nextCursor` to page through. Filters: category_id (or null for uncategorized), status (requires locale; use "any" to skip), locale, and a substring query against slug/title.',
  scope: 'pages.view',
  input: listPagesInput,
  async handler(input) {
    const result = await listCmsPages({
      category_id: input.category_id ?? undefined,
      status: input.status,
      locale: input.locale,
      query: input.query,
      limit: input.limit,
      cursor: input.cursor
    })
    return {
      content: [{ type: 'text', text: `Found ${result.pages.length} page(s).` }],
      structuredContent: result
    }
  }
})

export const getPageTool = defineMcpTool({
  name: 'get_page',
  description: 'Fetch a single CMS page by id or slug, including all translations (any status). Each translation includes body_json (Tiptap JSON), a Markdown rendering, and a body_is_lossy_in_markdown flag.',
  scope: 'pages.view',
  input: getPageInput,
  async handler(input) {
    const found = await getCmsPage({ id: input.id, slug: input.slug })
    if (!found) {
      return {
        content: [{ type: 'text', text: 'Page not found' }],
        isError: true
      }
    }
    const translations = found.translations.map((t) => {
      const lossy = detectLossy(t.body_json)
      return {
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
    })
    return {
      content: [{ type: 'text', text: `Page "${found.page.slug}" (${translations.length} translation(s))` }],
      structuredContent: {
        page: {
          id: found.page.id,
          slug: found.page.slug,
          category_id: found.page.category_id,
          category_slug: found.category_slug,
          menu_order: found.page.menu_order,
          theme: found.page.theme,
          custom_css: found.page.custom_css
        },
        translations
      }
    }
  }
})

export const createPageTool = defineMcpTool({
  name: 'create_page',
  description: 'Create a new CMS page shell, optionally with an inline initial translation. The page shell + translation are committed atomically. Slug rules: under a category the slug must start with "<category_slug>/"; uncategorized slugs cannot collide with category slugs. If translation.body_markdown is supplied it is converted to Tiptap JSON server-side; if translation.body_json is supplied it is validated against the schema/attribute allowlist.',
  scope: 'pages.write',
  input: createPageInput,
  async handler(input, ctx) {
    let inlineTranslation: Parameters<typeof createCmsPage>[0]['translation']
    if (input.translation) {
      // Zod's inlineTranslationInput.refine() already enforces exactly
      // one of body_json / body_markdown, so we never reach this code
      // path with neither set — pick whichever the schema admitted.
      const body_json: Record<string, unknown> = input.translation.body_json
        ? (input.translation.body_json as Record<string, unknown>)
        : (markdownToTiptap(input.translation.body_markdown!) as unknown as Record<string, unknown>)
      tiptapValidate(body_json)
      inlineTranslation = {
        locale: input.translation.locale,
        title: input.translation.title,
        body_json,
        excerpt: input.translation.excerpt ?? null,
        featured_image: input.translation.featured_image ?? null,
        meta_title: input.translation.meta_title ?? null,
        meta_description: input.translation.meta_description ?? null,
        og_image: input.translation.og_image ?? null,
        status: input.translation.status
      }
    }

    const created = await createCmsPage(
      {
        slug: input.slug,
        category_id: input.category_id ?? null,
        menu_order: input.menu_order,
        theme: input.theme,
        custom_css: input.custom_css ?? null,
        translation: inlineTranslation
      },
      async ({ pageId, translationId }, executor) => {
        await mcpLog('CREATE', 'pages', pageId, ctx, { slug: input.slug }, executor as never)
        if (translationId && inlineTranslation) {
          // Audit the translation row by its actual id so greps on
          // record_id find it. Both inserts commit in the same tx,
          // so the audit row's executor is honored.
          await mcpLog('CREATE', 'page_translations', translationId, ctx, {
            page_id: pageId,
            locale: inlineTranslation.locale,
            via: 'create_page'
          }, executor as never)
        }
      }
    )

    await applyPageInvalidations(created.slugsToPurge, created.categoriesToPurge)

    return {
      content: [{ type: 'text', text: `Created page "${created.page.slug}"` }],
      structuredContent: {
        page: created.page,
        translation: created.translation
      }
    }
  }
})

export const updatePageTool = defineMcpTool({
  name: 'update_page',
  description: 'Update a page\'s metadata: slug, category_id, menu_order, theme, custom_css. Translation edits go through upsert_page_translation. Changing the category rewrites the slug prefix; cache for the old + new slug + categories is purged.',
  scope: 'pages.write',
  input: updatePageInput,
  async handler(input, ctx) {
    const result = await updateCmsPage({
      id: input.id,
      slug: input.slug,
      category_id: input.category_id ?? undefined,
      menu_order: input.menu_order,
      theme: input.theme,
      custom_css: input.custom_css ?? undefined
    })
    if (Object.keys(result.changes).length > 0) {
      await mcpLog('UPDATE', 'pages', input.id, ctx, { changes: result.changes })
    }
    await applyPageInvalidations(result.slugsToPurge, result.categoriesToPurge)
    return {
      content: [{ type: 'text', text: `Updated page "${result.page.slug}"` }],
      structuredContent: { page: result.page, changes: result.changes }
    }
  }
})

export const deletePageTool = defineMcpTool({
  name: 'delete_page',
  description: 'Delete a CMS page and (via cascade) all its translations. This is destructive — the operation is irreversible without a database restore.',
  scope: 'pages.write',
  destructive: true,
  input: deletePageInput,
  async handler(input, ctx) {
    const { slug, categoryId } = await deleteCmsPage(input.id)
    await mcpLog('DELETE', 'pages', input.id, ctx, { slug })
    await applyPageInvalidations([slug], categoryId ? [categoryId] : [])
    return {
      content: [{ type: 'text', text: `Deleted page "${slug}"` }],
      structuredContent: { ok: true }
    }
  }
})

export const PAGE_TOOLS = [
  listPagesTool,
  getPageTool,
  createPageTool,
  updatePageTool,
  deletePageTool
] as const

// Re-export so the translations.ts importer can pull the same tools
// helpers without repeating the import paths.
export { upsertCmsPageTranslation, applyTranslationInvalidations }
