// Server-side Tiptap JSON → HTML renderer. The extension set comes from
// app/utils/tiptapExtensions.ts, shared with the editor component so
// authored content round-trips back out to the public page with the
// same tags/attributes.
//
// Keeping this on the server keeps the public bundle free of Tiptap
// runtime code — the renderer serializes once and we send HTML.

import { generateHTML } from '@tiptap/html'
import { buildTiptapExtensions } from '~~/app/utils/tiptapExtensions'

const EXTENSIONS = buildTiptapExtensions()

function isEmptyDoc(doc: unknown): boolean {
  if (!doc || typeof doc !== 'object') return true
  const d = doc as { type?: string; content?: unknown[] }
  if (d.type !== 'doc') return true
  if (!Array.isArray(d.content) || d.content.length === 0) return true
  return false
}

export function renderTiptap(doc: unknown): string {
  if (isEmptyDoc(doc)) return ''
  try {
    return generateHTML(doc as any, EXTENSIONS)
  } catch (err) {
    console.error('renderTiptap: failed to serialize doc', err)
    return ''
  }
}
