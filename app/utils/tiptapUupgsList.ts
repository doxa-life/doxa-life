/// <reference lib="dom" />

// Custom Tiptap node that preserves the <uupgs-list> Lit custom element
// across the HTML→JSON→HTML round-trip. WP's [uupg_list] shortcode
// renders this tag directly into page content; without a Tiptap node
// for it, ProseMirror's DOM parser drops the element and its attrs.
//
// When `generateHTML` serializes the node back to HTML, we emit a
// neutral placeholder div with a serialized props payload. The
// catch-all page ([...slug].vue) scans for that placeholder after
// v-html mounts and renders the real Vue <UupgsList> component into it
// (preserving the host app's i18n / runtime-config context via `h()`
// + `render()`).
//
// Keep this file shared between editor (app/components/admin/RichTextEditor.vue),
// server renderer (server/utils/renderTiptap.ts), and scraper
// (scripts/lib/htmlToTiptap.ts).

import { Node } from '@tiptap/core'

const BOOLEAN_ATTRS = ['useSelectCard', 'useHighlightedUUPGs', 'hideSeeAllLink', 'dontShowListOnLoad', 'randomizeList']
const STRING_ATTRS = ['languageCode', 'selectUrl', 'researchUrl', 'initialSearchTerm', 't']
const NUMBER_ATTRS = ['perPage', 'morePerPage']

export const UUPGS_LIST_PLACEHOLDER_CLASS = 'doxa-uupgs-list-slot'
export const UUPGS_LIST_EDITOR_CHIP_CLASS = 'doxa-uupgs-list-editor-chip'

export const UupgsListNode = Node.create({
  name: 'uupgsList',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    const attrs: Record<string, any> = {}
    for (const k of STRING_ATTRS) {
      if (k === 't') {
        // `t` on the live shortcode is a JSON object serialized into
        // the attribute. Parse it back to an object so the Vue
        // component gets real props, not a JSON string.
        attrs[k] = {
          default: null,
          parseHTML: (el: Element) => {
            const v = el.getAttribute('t')
            if (!v) return null
            try { return JSON.parse(v) } catch { return null }
          }
        }
      } else {
        attrs[k] = {
          default: null,
          parseHTML: (el: Element) => el.getAttribute(k)
        }
      }
    }
    for (const k of NUMBER_ATTRS) {
      attrs[k] = {
        default: null,
        parseHTML: (el: Element) => {
          const v = el.getAttribute(k)
          return v ? Number(v) : null
        }
      }
    }
    for (const k of BOOLEAN_ATTRS) {
      // Lit reflects `?attr=${bool}` as a bare attribute when true and
      // absent when false. Presence — even with empty value — is true.
      attrs[k] = {
        default: false,
        parseHTML: (el: Element) => el.hasAttribute(k)
      }
    }
    return attrs
  },

  parseHTML() {
    return [{ tag: 'uupgs-list' }]
  },

  renderHTML({ node }) {
    // Serialize all props into a single data attribute so the client
    // can JSON.parse and spread them onto the Vue component.
    const props: Record<string, any> = {}
    for (const k of [...STRING_ATTRS, ...NUMBER_ATTRS, ...BOOLEAN_ATTRS]) {
      const v = node.attrs[k]
      if (v === null || v === '' || v === false) continue
      props[k] = v
    }
    return ['div', {
      class: UUPGS_LIST_PLACEHOLDER_CLASS,
      'data-uupgs-list-props': JSON.stringify(props)
    }]
  },

  // Editor-only visual representation. `generateHTML` on the server does
  // not invoke node views, so this stays safely out of the Nitro bundle
  // even though it touches `document`. The chip summarizes key attrs so
  // authors can tell the block apart from surrounding paragraphs.
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      dom.className = UUPGS_LIST_EDITOR_CHIP_CLASS
      dom.setAttribute('data-drag-handle', '')
      dom.contentEditable = 'false'

      const paintFrom = (n: typeof node) => {
        const attrs: Record<string, any> = n.attrs
        const parts: string[] = []
        if (attrs.perPage) parts.push(`perPage: ${attrs.perPage}`)
        if (attrs.morePerPage) parts.push(`morePerPage: ${attrs.morePerPage}`)
        if (attrs.useSelectCard) parts.push('select cards')
        if (attrs.useHighlightedUUPGs) parts.push('highlighted only')
        if (attrs.randomizeList) parts.push('randomized')
        if (attrs.hideSeeAllLink) parts.push('no "see all" link')
        if (attrs.dontShowListOnLoad) parts.push('hidden on load')
        if (attrs.languageCode) parts.push(`lang: ${attrs.languageCode}`)
        if (attrs.initialSearchTerm) parts.push(`search: "${attrs.initialSearchTerm}"`)
        const detail = parts.length ? parts.join(' · ') : 'default settings'

        dom.innerHTML = ''
        const header = document.createElement('div')
        header.className = `${UUPGS_LIST_EDITOR_CHIP_CLASS}__header`
        const icon = document.createElement('span')
        icon.className = `${UUPGS_LIST_EDITOR_CHIP_CLASS}__icon`
        icon.textContent = '🌍'
        const title = document.createElement('span')
        title.className = `${UUPGS_LIST_EDITOR_CHIP_CLASS}__title`
        title.textContent = 'UUPG list'
        header.appendChild(icon)
        header.appendChild(title)

        const detailEl = document.createElement('div')
        detailEl.className = `${UUPGS_LIST_EDITOR_CHIP_CLASS}__detail`
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
