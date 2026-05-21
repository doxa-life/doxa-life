// Category CRUD tools — list, create, update, delete.
//
// delete_category is destructive (rate-limit bucket applies) and
// refuses when pages are still attached, surfacing the count and
// up to five sample slugs in structuredContent so the client can
// build a helpful redirect/reassign UI.

import { defineMcpTool, mcpLog } from '#mcp-layer'
import {
  listCategoriesInput,
  createCategoryInput,
  updateCategoryInput,
  deleteCategoryInput
} from '../schemas'
import {
  listCmsCategories,
  createCmsCategory,
  updateCmsCategory,
  deleteCmsCategory,
  applyCategoryInvalidations
} from '../../services/cmsCategories'

export const listCategoriesTool = defineMcpTool({
  name: 'list_categories',
  description: 'List all CMS categories with their per-locale names, menu_order, parent_id, computed URL path, and the number of pages currently attached.',
  scope: 'pages.view',
  input: listCategoriesInput,
  async handler() {
    const rows = await listCmsCategories()
    return {
      content: [{ type: 'text', text: `Found ${rows.length} categor${rows.length === 1 ? 'y' : 'ies'}.` }],
      structuredContent: {
        categories: rows.map(row => ({
          id: row.id,
          slug: row.slug,
          parent_id: row.parent_id,
          url: row.url,
          menu_order: row.menu_order,
          page_count: row.page_count,
          translations: row.translations.map(t => ({
            locale: t.locale,
            name: t.name
          }))
        }))
      }
    }
  }
})

export const createCategoryTool = defineMcpTool({
  name: 'create_category',
  description: 'Create a new CMS category. Slug must be lowercase letters/digits/dashes (no slashes). Pass `parent_id` to nest under another category (omit/null for top level). Requires at least an English (locale "en") translation entry.',
  scope: 'pages.write',
  input: createCategoryInput,
  async handler(input, ctx) {
    const category = await createCmsCategory({
      slug: input.slug,
      parent_id: input.parent_id ?? null,
      menu_order: input.menu_order,
      translations: input.translations
    })
    await mcpLog('CREATE', 'categories', category.id, ctx, {
      slug: input.slug,
      parent_id: category.parent_id,
      translation_count: input.translations.length
    })
    return {
      content: [{ type: 'text', text: `Created category "${category.slug}"` }],
      structuredContent: { category }
    }
  }
})

export const updateCategoryTool = defineMcpTool({
  name: 'update_category',
  description: 'Update a CMS category — slug, parent_id, menu_order, or per-locale translations. A slug or parent change cascades to every URL in the subtree and busts the affected cache entries.',
  scope: 'pages.write',
  input: updateCategoryInput,
  async handler(input, ctx) {
    const result = await updateCmsCategory({
      id: input.id,
      slug: input.slug,
      parent_id: input.parent_id === undefined ? undefined : (input.parent_id ?? null),
      menu_order: input.menu_order,
      translations: input.translations
    })
    await mcpLog('UPDATE', 'categories', input.id, ctx, {
      changes: Object.keys(input).filter(k => k !== 'id'),
      slugs_purged: result.slugsToPurge.length
    })
    await applyCategoryInvalidations(result.slugsToPurge)
    return {
      content: [{ type: 'text', text: `Updated category "${result.category.slug}"` }],
      structuredContent: { category: result.category }
    }
  }
})

export const deleteCategoryTool = defineMcpTool({
  name: 'delete_category',
  description: 'Delete a CMS category. Refuses if any pages are still attached — the structuredContent.attached_page_count and sample_slugs surface what is in the way. Reassign or delete those pages first. Destructive.',
  scope: 'pages.write',
  destructive: true,
  input: deleteCategoryInput,
  async handler(input, ctx) {
    const result = await deleteCmsCategory(input.id)
    if ('error' in result) {
      const sc: { ok: boolean; error: string | null; attached_page_count: number; sample_slugs: string[] } = {
        ok: false,
        error: result.error,
        attached_page_count: result.attached_page_count,
        sample_slugs: result.sample_slugs
      }
      return {
        content: [{
          type: 'text',
          text: `Category has ${result.attached_page_count} attached page(s). Reassign or delete them first.`
        }],
        structuredContent: sc,
        isError: true
      }
    }
    await mcpLog('DELETE', 'categories', input.id, ctx, { slug: result.slug })
    const sc: { ok: boolean; error: string | null; attached_page_count: number; sample_slugs: string[] } = {
      ok: true,
      error: null,
      attached_page_count: 0,
      sample_slugs: []
    }
    return {
      content: [{ type: 'text', text: `Deleted category "${result.slug}"` }],
      structuredContent: sc
    }
  }
})

export const CATEGORY_TOOLS = [
  listCategoriesTool,
  createCategoryTool,
  updateCategoryTool,
  deleteCategoryTool
] as const
