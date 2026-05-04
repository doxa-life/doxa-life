/// <reference lib="dom" />

// Extends @tiptap/extension-image with an `align` attribute so authors
// can left/center/right-align block images from the editor toolbar. The
// align value renders as an inline style on the <img> element (instead
// of a class) so no extra stylesheet is needed on the public page —
// v-html alone reproduces the alignment.

import Image from '@tiptap/extension-image'

type Align = 'left' | 'center' | 'right'

const ALIGN_STYLE: Record<Align, string> = {
  left:   'display: block; margin-left: 0; margin-right: auto;',
  center: 'display: block; margin-left: auto; margin-right: auto;',
  right:  'display: block; margin-left: auto; margin-right: 0;'
}

function detectAlign(styleAttr: string | null): Align | null {
  if (!styleAttr) return null
  const s = styleAttr.replace(/\s+/g, '')
  const hasAutoLeft = /margin-left:auto/.test(s)
  const hasAutoRight = /margin-right:auto/.test(s)
  if (hasAutoLeft && hasAutoRight) return 'center'
  if (hasAutoLeft && !hasAutoRight) return 'right'
  if (!hasAutoLeft && hasAutoRight) return 'left'
  return null
}

export const CmsImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null as Align | null,
        parseHTML: (el: HTMLElement) => detectAlign(el.getAttribute('style')),
        renderHTML: (attrs: { align?: Align | null }) => {
          if (!attrs.align) return {}
          return { style: ALIGN_STYLE[attrs.align] }
        }
      }
    }
  }
})
