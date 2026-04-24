/// <reference lib="dom" />

// Verse block — styled container for a scripture quotation with an
// editable reference ("e.g. John 3:16") shown at the top of the block
// in the editor and rendered as a citation below the text on the
// public page. Adapted from campaigns-sever's Verse extension, minus
// the Bible API lookup (authors type the verse text themselves) and
// the `translation` attribute.
//
// Pure-DOM node view so the shared extension list stays
// framework-agnostic and `generateHTML` on the server stays Vue-free.
// The view never runs during `generateHTML`; only the editor mounts it.

import { Node as TiptapNode, mergeAttributes } from '@tiptap/core'

export const VERSE_CLASS = 'doxa-verse'

export const Verse = TiptapNode.create({
  name: 'verse',
  group: 'block',
  content: 'block+',
  draggable: true,
  defining: true,

  addAttributes() {
    return {
      reference: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-reference'),
        renderHTML: (attrs: { reference?: string | null }) => {
          if (!attrs.reference) return {}
          return { 'data-reference': attrs.reference }
        }
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="verse"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'verse', class: VERSE_CLASS }),
      0
    ]
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let currentAttrs = { ...node.attrs }

      const dom = document.createElement('div')
      dom.className = `${VERSE_CLASS} ${VERSE_CLASS}--editor`
      dom.setAttribute('data-type', 'verse')
      dom.setAttribute('data-drag-handle', '')

      // Reference bar — contentEditable=false so PM treats it as a widget
      const bar = document.createElement('div')
      bar.className = `${VERSE_CLASS}__ref-bar`
      bar.contentEditable = 'false'

      const refInput = document.createElement('input')
      refInput.type = 'text'
      refInput.placeholder = 'e.g. John 3:16'
      refInput.className = `${VERSE_CLASS}__ref-input`
      refInput.value = currentAttrs.reference ?? ''
      bar.appendChild(refInput)

      // Content host — PM manages children inside this element
      const content = document.createElement('div')
      content.className = `${VERSE_CLASS}__content`

      // Citation line — shown only when reference is set
      const citation = document.createElement('div')
      citation.className = `${VERSE_CLASS}__citation`
      citation.contentEditable = 'false'

      const paintCitation = (ref: string | null | undefined) => {
        if (ref) {
          citation.textContent = ref
          citation.style.display = ''
        } else {
          citation.textContent = ''
          citation.style.display = 'none'
        }
      }
      paintCitation(currentAttrs.reference)

      dom.appendChild(bar)
      dom.appendChild(content)
      dom.appendChild(citation)

      const commitReference = () => {
        if (typeof getPos !== 'function') return
        const pos = getPos()
        if (typeof pos !== 'number') return
        const next = refInput.value.trim() || null
        if (next === currentAttrs.reference) return
        const { state, view } = editor
        const nodeAtPos = state.doc.nodeAt(pos)
        if (!nodeAtPos || nodeAtPos.type.name !== 'verse') return
        view.dispatch(state.tr.setNodeMarkup(pos, undefined, { ...nodeAtPos.attrs, reference: next }))
      }

      refInput.addEventListener('blur', commitReference)
      refInput.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          refInput.blur()
        }
      })

      // ProseMirror installs paste/copy/cut/drop/keydown listeners on the
      // editor root. Events inside the node view bubble up to those
      // handlers and PM will try to insert into the doc selection — which
      // steals pasted text away from this input. Stopping propagation at
      // the input keeps clipboard + key events local to the input.
      const LOCAL_EVENTS = ['paste', 'copy', 'cut', 'drop', 'dragstart', 'beforeinput', 'input', 'keydown', 'keypress', 'keyup', 'mousedown', 'click'] as const
      for (const ev of LOCAL_EVENTS) {
        refInput.addEventListener(ev, (e: Event) => e.stopPropagation())
      }

      return {
        dom,
        contentDOM: content,
        update(updatedNode) {
          if (updatedNode.type.name !== 'verse') return false
          currentAttrs = { ...updatedNode.attrs }
          // Don't stomp the input while the user is typing in it
          if (document.activeElement !== refInput) {
            refInput.value = currentAttrs.reference ?? ''
          }
          paintCitation(currentAttrs.reference)
          return true
        },
        // Keep PM from handling events that happen inside the reference
        // bar (typing, clicks, key events) so the input stays interactive.
        stopEvent(event) {
          const target = event.target
          return target instanceof Node && bar.contains(target)
        },
        // The input's value changing shouldn't invalidate the node view.
        ignoreMutation(mutation) {
          if (mutation.type === 'selection') return false
          return bar.contains(mutation.target as Node) || citation.contains(mutation.target as Node)
        }
      }
    }
  }
})
