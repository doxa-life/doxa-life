// Walks a Tiptap JSON document and reports whether converting it to
// Markdown would silently drop authored content. Used by:
//   - upsert_page_translation's lossy-overwrite guard (read existing
//     body, refuse a Markdown overwrite when the existing body uses
//     anything in the lossy sets unless allow_lossy_overwrite is set)
//   - get_page_translation read paths to surface a flag the client
//     uses to decide whether to round-trip via Markdown or edit JSON
//
// The lists below match the registered Tiptap node/mark names — any
// new extension added to app/utils/tiptapExtensions.ts must update
// these. A drift vitest enforces sync.

// Marks that have no Markdown round-trip (TextStyle is a structural
// container; Color contributes its `color` attribute to TextStyle
// rather than being a standalone mark).
export const LOSSY_MARKS: ReadonlySet<string> = new Set([
  'textStyle',
  'highlight',
  'subscript',
  'superscript',
  'underline'
])

// Custom block nodes with no Markdown representation.
export const LOSSY_NODES: ReadonlySet<string> = new Set([
  'youtube',
  'div',
  'verse',
  'uupgsList',
  'generalResources'
])

// Per-node attributes that, when set, cannot survive a Markdown
// round-trip. The key is the registered Tiptap node name (so `image`,
// not `CmsImage`).
export const LOSSY_NODE_ATTRS: Readonly<Record<string, ReadonlyArray<string>>> = {
  paragraph: ['textAlign'],
  heading: ['textAlign'],
  image: ['align']
}

// Maps detector finds to stable string keys that can be returned as
// `body_lossy_reasons` (machine-readable, lowercase snake_case).
const REASON_KEYS = {
  textStyle: 'text_style_or_color',
  highlight: 'highlight',
  subscript: 'subscript',
  superscript: 'superscript',
  underline: 'underline',
  youtube: 'youtube_embed',
  div: 'div_wrapper',
  verse: 'verse_block',
  uupgsList: 'uupgs_list',
  generalResources: 'general_resources',
  'paragraph.textAlign': 'text_align',
  'heading.textAlign': 'text_align',
  'image.align': 'image_align'
} as const

interface JsonNode {
  type?: string
  attrs?: Record<string, unknown>
  content?: JsonNode[]
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>
}

export interface LossyResult {
  body_is_lossy_in_markdown: boolean
  body_lossy_reasons: string[]
}

export function detectLossy(doc: unknown): LossyResult {
  const reasons = new Set<string>()
  walk(doc as JsonNode, reasons)
  return {
    body_is_lossy_in_markdown: reasons.size > 0,
    body_lossy_reasons: Array.from(reasons).sort()
  }
}

function walk(node: JsonNode | undefined | null, reasons: Set<string>): void {
  if (!node || typeof node !== 'object') return

  if (node.type) {
    if (LOSSY_NODES.has(node.type)) {
      const key = REASON_KEYS[node.type as keyof typeof REASON_KEYS]
      if (key) reasons.add(key)
    }

    const lossyAttrs = LOSSY_NODE_ATTRS[node.type]
    if (lossyAttrs && node.attrs) {
      for (const attr of lossyAttrs) {
        const v = node.attrs[attr]
        if (v !== null && v !== undefined && v !== '') {
          const key = REASON_KEYS[`${node.type}.${attr}` as keyof typeof REASON_KEYS]
          if (key) reasons.add(key)
        }
      }
    }
  }

  if (Array.isArray(node.marks)) {
    for (const mark of node.marks) {
      if (!mark || !mark.type) continue
      if (LOSSY_MARKS.has(mark.type)) {
        const key = REASON_KEYS[mark.type as keyof typeof REASON_KEYS]
        if (key) reasons.add(key)
      }
      // textStyle with a color attribute always counts as lossy
      // (the textStyle entry already covers it via LOSSY_MARKS).
    }
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) walk(child, reasons)
  }
}
