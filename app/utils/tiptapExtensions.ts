// Shared Tiptap extension set — used by both the editor
// (app/components/admin/RichTextEditor.vue) and the server-side HTML
// renderer (server/utils/renderTiptap.ts) so authored content round-trips
// cleanly to the public page. Keep all extensions framework-agnostic here
// (@tiptap/core + @tiptap/extension-*): no @tiptap/vue-3 imports, or the
// server renderer will drag the Vue runtime into the Nitro bundle.

import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { CmsImage } from './tiptapImage'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Youtube from '@tiptap/extension-youtube'
import { Div } from './tiptapDiv'
import { UupgsListNode } from './tiptapUupgsList'
import { Verse } from './tiptapVerse'

export function buildTiptapExtensions() {
  return [
    StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
    CmsImage,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    Color,
    Highlight,
    Typography,
    Subscript,
    Superscript,
    Youtube,
    Div,
    UupgsListNode,
    Verse
  ]
}
