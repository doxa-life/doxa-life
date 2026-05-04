// cms://page/{id}/{locale} resource — exposes page translations as
// browseable read-only URIs.
//
// Why {id} instead of {slug}: the layer's URI matcher treats each
// {placeholder} as a single non-empty path segment, but CMS slugs
// can contain '/' (categorized pages start with "<cat>/"). Using
// the integer page id avoids the segment-count mismatch; the slug
// is surfaced in `name` for human navigation.
//
// resources/list is hard-capped at 500 entries today (the layer's
// resourceDef.list signature does not thread cursor/nextCursor).

import { defineMcpResource } from '#mcp-layer'
import { db } from '../../utils/database'
import { tiptapToMarkdown } from '../../utils/tiptapToMarkdown'
import { detectLossy } from '../../utils/tiptapLossyDetector'

const RESOURCE_LIST_CAP = 500

export const cmsPageResource = defineMcpResource({
  uriPattern: 'cms://page/{id}/{locale}',
  scope: 'pages.view',
  async list() {
    const rows = await db
      .selectFrom('page_translations')
      .innerJoin('pages', 'pages.id', 'page_translations.page_id')
      .select([
        'page_translations.page_id as page_id',
        'page_translations.locale as locale',
        'page_translations.title as title',
        'page_translations.excerpt as excerpt',
        'page_translations.updated as updated',
        'pages.slug as slug'
      ])
      .orderBy('page_translations.updated', 'desc')
      .limit(RESOURCE_LIST_CAP + 1)
      .execute()

    const capped = rows.length > RESOURCE_LIST_CAP
    const out = rows.slice(0, RESOURCE_LIST_CAP).map((row, idx) => {
      const isLastWhenCapped = capped && idx === RESOURCE_LIST_CAP - 1
      const baseDescription = `${row.slug} — ${row.excerpt ?? '(no excerpt)'}`
      const description = isLastWhenCapped
        ? `${baseDescription} — List capped at ${RESOURCE_LIST_CAP} — use list_pages for full enumeration.`
        : baseDescription
      return {
        uri: `cms://page/${row.page_id}/${row.locale}`,
        name: `${row.title} (${row.locale})`,
        description,
        mimeType: 'text/markdown'
      }
    })
    return out
  },
  async read(uri) {
    const match = /^cms:\/\/page\/([^/]+)\/([^/]+)$/.exec(uri)
    if (!match) {
      throw new Error(`Resource URI does not match cms://page/{id}/{locale}: ${uri}`)
    }
    const [, pageId, locale] = match
    const t = await db
      .selectFrom('page_translations')
      .innerJoin('pages', 'pages.id', 'page_translations.page_id')
      .select([
        'page_translations.body_json as body_json',
        'page_translations.title as title',
        'pages.slug as slug',
        'page_translations.status as status'
      ])
      .where('page_translations.page_id', '=', pageId!)
      .where('page_translations.locale', '=', locale!)
      .executeTakeFirst()
    if (!t) {
      throw new Error(`Resource not found: ${uri}`)
    }
    const lossy = detectLossy(t.body_json)
    const markdown = tiptapToMarkdown(t.body_json)
    const header = `# ${t.title}\n\nslug: ${t.slug}\nstatus: ${t.status}\nbody_is_lossy_in_markdown: ${lossy.body_is_lossy_in_markdown}\n${lossy.body_lossy_reasons.length > 0 ? `body_lossy_reasons: ${lossy.body_lossy_reasons.join(', ')}\n` : ''}\n---\n\n`
    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: header + markdown
      }]
    }
  }
})
