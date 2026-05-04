// Custom Tiptap node that preserves generic <div> wrappers with their
// class + data-* attributes. The default Tiptap schema has no div node,
// so WP pages that use CUBE CSS primitives (.card, .grid, .switcher,
// .stack, etc.) get flattened into plain paragraphs when parsed. This
// extension keeps the wrappers intact so the ported SCSS can style them.
//
// Shared by the editor (app/components/admin/RichTextEditor.vue), the
// server renderer (server/utils/renderTiptap.ts), and the scrape-time
// HTML→JSON converter (scripts/lib/htmlToTiptap.ts).

import { Node } from '@tiptap/core'

export const PRESERVED_DATA_ATTRS = [
  'data-width',
  'data-width-sm',
  'data-width-md',
  'data-width-lg',
  'data-width-xl',
  'data-list-color',
  'data-highlight-color',
  'data-highlight-index',
  'data-highlight-last',
  'data-no-action',
  'data-reel-mode',
  'data-variant',
  'data-size'
]

export const Div = Node.create({
  name: 'div',
  group: 'block',
  content: 'block*',
  defining: true,

  addAttributes() {
    const attrs: Record<string, { default: string | null }> = {
      class: { default: null },
      // Only preserved when the div is a `.wp-block-spacer` whose whole
      // purpose is an inline height; see scripts/lib/htmlToTiptap.ts.
      style: { default: null }
    }
    for (const name of PRESERVED_DATA_ATTRS) attrs[name] = { default: null }
    return attrs
  },

  parseHTML() {
    return [{
      tag: 'div',
      // Only parse divs that actually carry a class or one of the
      // CUBE-CSS data attributes. Bare wrapper divs with no attrs are
      // treated as plain content and flattened into their parent
      // container — same behavior as before.
      getAttrs: (el) => {
        if (typeof el === 'string') return false
        const className = el.getAttribute('class')
        const hasKnownData = PRESERVED_DATA_ATTRS.some(name => el.hasAttribute(name))
        if (!className && !hasKnownData) return false
        const out: Record<string, string | null> = { class: className }
        // Carry style only for wp-block-spacer; any other inline style
        // has already been stripped by the HTML normalizer.
        if (className && /\bwp-block-spacer\b/.test(className)) {
          out.style = el.getAttribute('style')
        }
        for (const name of PRESERVED_DATA_ATTRS) {
          out[name] = el.getAttribute(name)
        }
        return out
      }
    }]
  },

  renderHTML({ HTMLAttributes }) {
    // Strip null attributes so we don't emit `class="null"` in output
    const attrs: Record<string, any> = {}
    for (const [k, v] of Object.entries(HTMLAttributes)) {
      if (v !== null && v !== undefined && v !== '') attrs[k] = v
    }
    return ['div', attrs, 0]
  }
})
