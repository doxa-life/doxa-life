/// <reference lib="dom" />

// Custom Tiptap node for the <general-resources> shortcode/placeholder.
// Mirrors the UupgsListNode pattern: the editor treats it as an atom
// block; generateHTML serializes to a neutral placeholder div; the
// catch-all page ([...slug].vue) scans for the placeholder after v-html
// mounts and renders the real Vue <GeneralResources> component in its
// place (preserving the host app's i18n / runtime-config context via
// h() + render()).
//
// Shared between editor (app/components/admin/RichTextEditor.vue),
// server renderer (server/utils/renderTiptap.ts), and migration
// converter (scripts/lib/htmlToTiptap.ts) via tiptapExtensions.ts.

import { Node } from '@tiptap/core'

export const GENERAL_RESOURCES_PLACEHOLDER_CLASS = 'doxa-general-resources-slot'
export const GENERAL_RESOURCES_EDITOR_CHIP_CLASS = 'doxa-general-resources-editor-chip'

export const GeneralResourcesNode = Node.create({
  name: 'generalResources',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      useDocuments: {
        default: false,
        parseHTML: (el: Element) => el.hasAttribute('useDocuments') || el.hasAttribute('use-documents')
      },
      layout: {
        default: 'on-sidebar-page',
        parseHTML: (el: Element) => el.getAttribute('layout') || 'on-sidebar-page'
      }
    }
  },

  parseHTML() {
    return [{ tag: 'general-resources' }]
  },

  renderHTML({ node }) {
    const props: Record<string, any> = {}
    if (node.attrs.useDocuments) props.useDocuments = true
    if (node.attrs.layout && node.attrs.layout !== 'on-sidebar-page') props.layout = node.attrs.layout
    return ['div', {
      class: GENERAL_RESOURCES_PLACEHOLDER_CLASS,
      'data-general-resources-props': JSON.stringify(props)
    }]
  },

  // Editor-only chip so authors can see the block in the document flow
  // without a live render. Same pattern as UupgsListNode.
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      dom.className = GENERAL_RESOURCES_EDITOR_CHIP_CLASS
      dom.setAttribute('data-drag-handle', '')
      dom.contentEditable = 'false'

      const paintFrom = (n: typeof node) => {
        const attrs: Record<string, any> = n.attrs
        const parts: string[] = []
        parts.push(attrs.useDocuments ? 'documents list' : 'general resources list')
        if (attrs.layout && attrs.layout !== 'on-sidebar-page') parts.push(`layout: ${attrs.layout}`)
        const detail = parts.join(' · ')

        dom.innerHTML = ''
        const header = document.createElement('div')
        header.className = `${GENERAL_RESOURCES_EDITOR_CHIP_CLASS}__header`
        const icon = document.createElement('span')
        icon.className = `${GENERAL_RESOURCES_EDITOR_CHIP_CLASS}__icon`
        icon.textContent = '📚'
        const title = document.createElement('span')
        title.className = `${GENERAL_RESOURCES_EDITOR_CHIP_CLASS}__title`
        title.textContent = 'General resources'
        header.appendChild(icon)
        header.appendChild(title)

        const detailEl = document.createElement('div')
        detailEl.className = `${GENERAL_RESOURCES_EDITOR_CHIP_CLASS}__detail`
        detailEl.textContent = detail

        dom.appendChild(header)
        dom.appendChild(detailEl)
      }
      paintFrom(node)

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== node.type.name) return false
          paintFrom(updatedNode)
          return true
        },
        selectNode() {
          dom.classList.add('is-selected')
        },
        deselectNode() {
          dom.classList.remove('is-selected')
        }
      }
    }
  }
})
