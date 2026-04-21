// Server-side Tiptap JSON → HTML renderer. The extension set here must
// stay aligned with app/components/admin/RichTextEditor.vue (built in
// Phase 6) so content authored in the editor round-trips back out to
// the public page with the same tags/attributes.
//
// Keeping this on the server keeps the public bundle free of Tiptap
// runtime code — the renderer serializes once and we send HTML.

import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Youtube from '@tiptap/extension-youtube'

const EXTENSIONS = [
  StarterKit,
  Link.configure({ openOnClick: false, autolink: true }),
  Image,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TextStyle,
  Color,
  Highlight,
  Typography,
  Subscript,
  Superscript,
  Youtube
]

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
