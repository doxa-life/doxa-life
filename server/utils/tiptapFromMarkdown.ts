// Markdown → Tiptap JSON converter for the MCP write surface.
//
// Pipeline (see plans/mcp-project/mcp-project.md "Conversion pipeline"):
//   1. markdown-it (CommonMark + GFM strikethrough; tables disabled,
//      no inline HTML) parses Markdown to sanitized HTML.
//   2. A per-call `new JSDOM(html)` exposes the HTML as a DOM.
//   3. prosemirror-model's DOMParser walks the DOM into a doc that
//      conforms to the schema built from buildTiptapExtensions().
//
// We deliberately do NOT call @tiptap/html's `generateJSON` for this
// direction: it instantiates happy-dom internally, which is broken
// against ProseMirror's `parseHTML().getAttrs(el)` selectors.
// Serialization (JSON → HTML) does still go through @tiptap/html
// because happy-dom's incompatibility is in the parser path, not
// the serializer.

import MarkdownIt from 'markdown-it'
import { JSDOM } from 'jsdom'
import { getSchema } from '@tiptap/core'
import { DOMParser as ProseMirrorDOMParser } from 'prosemirror-model'
import { buildTiptapExtensions } from '~~/app/utils/tiptapExtensions'

// Module-scope schema is deterministic — one registered extension set
// per process. Per-call DOM keeps state isolated across requests.
const SCHEMA = getSchema(buildTiptapExtensions())

// CommonMark + GFM strikethrough; tables disabled (no extension is
// registered for them; the parser would silently drop the rows).
// `html: false` escapes any inline HTML rather than passing it through —
// explicit anti-XSS choice, not a convenience.
const md = new MarkdownIt({
  html: false,
  linkify: false,
  breaks: false,
  typographer: false
})
md.disable(['table'])

export interface TiptapDocJson {
  type: 'doc'
  content: Array<Record<string, unknown>>
}

export function markdownToTiptap(markdown: string): TiptapDocJson {
  const html = md.render(markdown ?? '')
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`)
  const body = dom.window.document.body
  // ProseMirror's DOMParser.parse(node) walks the node directly and
  // does not consult globalThis.document, so no global shim is needed.
  const doc = ProseMirrorDOMParser.fromSchema(SCHEMA).parse(body as unknown as HTMLElement)
  const json = doc.toJSON() as TiptapDocJson
  // ProseMirror returns an empty doc as `{type:'doc',content:[]}` —
  // the validator rejects empty content, so wrap with an empty
  // paragraph for blank input.
  if (!Array.isArray(json.content) || json.content.length === 0) {
    return { type: 'doc', content: [{ type: 'paragraph' }] }
  }
  return json
}
