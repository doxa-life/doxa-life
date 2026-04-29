// Tiptap JSON → Markdown via @tiptap/html's generateHTML → turndown.
// Output is informational only (read paths and resources); never
// persisted to the body_json column.
//
// Lossy nodes/marks/attributes are dropped silently here. Callers
// that need to know whether the conversion lost authored content
// should run tiptapLossyDetector on the JSON first.

import { generateHTML } from '@tiptap/html'
import TurndownService from 'turndown'
import { buildTiptapExtensions } from '~~/app/utils/tiptapExtensions'

const EXTENSIONS = buildTiptapExtensions()

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
  strongDelimiter: '**'
})

// Strip presentational wrappers Markdown can't represent — the
// surrounding text content survives as paragraphs.
turndown.addRule('strip-presentational', {
  filter: ['span', 'u'] as TurndownService.Filter,
  replacement: (content) => content
})

// Custom Tiptap nodes have HTML representations the editor renders
// but Markdown can't carry — drop the wrapper, keep nested text.
turndown.addRule('cms-custom-blocks', {
  filter: (node) => {
    const el = node as HTMLElement
    if (!el || typeof el.getAttribute !== 'function') return false
    const cls = el.getAttribute('class') || ''
    return (
      el.tagName === 'DIV' && (
        cls.includes('doxa-uupgs-list-slot')
        || cls.includes('doxa-verse')
        || cls.includes('doxa-general-resources')
      )
    )
  },
  replacement: (content) => content
})

export function tiptapToMarkdown(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return ''
  const d = doc as { type?: string; content?: unknown[] }
  if (d.type !== 'doc') return ''
  if (!Array.isArray(d.content) || d.content.length === 0) return ''
  let html: string
  try {
    html = generateHTML(doc as Parameters<typeof generateHTML>[0], EXTENSIONS)
  } catch (err) {
    console.error('[mcp] tiptapToMarkdown: generateHTML failed', err)
    return ''
  }
  try {
    return turndown.turndown(html)
  } catch (err) {
    console.error('[mcp] tiptapToMarkdown: turndown failed', err)
    return ''
  }
}
