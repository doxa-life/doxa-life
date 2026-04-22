// HTML → Tiptap JSON converter for the Phase 7 content migration.
// Uses JSDOM to parse HTML into a DOM that @tiptap/html can walk, then
// runs the same extension set as the editor/renderer so the round-trip
// is clean. Output is a ProseMirror "doc" JSON node ready to insert
// into page_translations.body_json.

import { JSDOM } from 'jsdom'
// @tiptap/html's Node build uses happy-dom which chokes on ProseMirror's
// selectors, and its browser subpath isn't exported. Roll our own
// HTML→JSON conversion using prosemirror-model + JSDOM — this is the
// same logic @tiptap/html runs, just with a DOM we control.
import { getSchema } from '@tiptap/core'
import { DOMParser as ProseMirrorDOMParser } from 'prosemirror-model'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Youtube from '@tiptap/extension-youtube'
import { Div } from '../../app/utils/tiptapDiv'
import { UupgsListNode } from '../../app/utils/tiptapUupgsList'

const EXTENSIONS = [
  StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
  Image,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TextStyle,
  Color,
  Highlight,
  Typography,
  Subscript,
  Superscript,
  Youtube,
  Div,
  UupgsListNode
]

// @tiptap/html ultimately calls prosemirror-model's DOMParser which
// expects a global `window`/`document`. In Bun/Node we provide one via
// JSDOM so the conversion works without a browser.
let installed = false
function installJsdomGlobals() {
  if (installed) return
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  const g = globalThis as any
  g.window = dom.window
  g.document = dom.window.document
  g.DOMParser = dom.window.DOMParser
  g.Node = dom.window.Node
  g.Element = dom.window.Element
  g.HTMLElement = dom.window.HTMLElement
  g.navigator = dom.window.navigator
  installed = true
}

// Normalize WP-era markup before feeding to Tiptap — strip comments,
// inline style attributes, WP-specific wrapper divs, and gutenberg
// boilerplate that Tiptap would otherwise either drop or mangle.
function normalizeHtml(html: string): string {
  installJsdomGlobals()
  const dom = new JSDOM(`<!doctype html><html><body><div id="__root">${html}</div></body></html>`)
  const root = dom.window.document.getElementById('__root')!

  // Remove comments + hidden placeholder nodes
  const walker = dom.window.document.createTreeWalker(root, dom.window.NodeFilter.SHOW_COMMENT)
  const comments: ChildNode[] = []
  let n: Node | null
  while ((n = walker.nextNode())) comments.push(n as ChildNode)
  for (const c of comments) c.parentNode?.removeChild(c)

  // Don't strip `aria-hidden="true"` blanket — WP's Gutenberg spacer
  // block (`.wp-block-spacer`) carries that attribute and supplies
  // deliberate vertical rhythm. The Div extension round-trips it.
  root.querySelectorAll('script, style, noscript, .screen-reader-text').forEach((el: Element) => el.remove())

  // Flatten *only* gutenberg wrapper divs that carry no layout class —
  // e.g. `wp-block-group`. Keep WP-theme classes like `.card`, `.grid`,
  // `.switcher`, `.stack`, `.resource-card` that the ported CUBE CSS
  // styles. The Tiptap Div extension (app/utils/tiptapDiv.ts) preserves
  // them through the round-trip.
  const WP_WRAPPERS_TO_FLATTEN = ['wp-block-group', 'wp-block-columns', 'wp-block-column']
  root.querySelectorAll<HTMLElement>('div[class^="wp-block"]').forEach((div) => {
    const classes = Array.from(div.classList)
    const isOnlyWpWrapper = classes.length > 0 && classes.every(c => c.startsWith('wp-block'))
    if (!isOnlyWpWrapper) return
    const shouldFlatten = classes.some(c => WP_WRAPPERS_TO_FLATTEN.includes(c))
    if (!shouldFlatten) return
    const fragment = dom.window.document.createDocumentFragment()
    while (div.firstChild) fragment.appendChild(div.firstChild)
    div.replaceWith(fragment)
  })

  // Unwrap <figure> around <img> so we get plain inline images (Tiptap's
  // Image extension doesn't ship a figure node by default).
  root.querySelectorAll('figure').forEach((figure: Element) => {
    const img = figure.querySelector('img')
    if (img) figure.replaceWith(img)
  })

  // Collapse presentational <span>s with only style attributes — they
  // round-trip poorly and the page SCSS already handles typography.
  root.querySelectorAll('span').forEach((span: Element) => {
    if (!span.attributes.length || (span.attributes.length === 1 && span.hasAttribute('style'))) {
      while (span.firstChild) span.parentNode?.insertBefore(span.firstChild, span)
      span.remove()
    }
  })

  // Strip inline `style` attributes (Tiptap would drop them anyway).
  // Exception: `wp-block-spacer` divs store their height inline — the
  // entire point of that block is to provide a specific pixel gap —
  // so preserve those. Keep `class` everywhere so the Div extension
  // and other class-driven elements can round-trip the CUBE CSS
  // layout hooks. Keep `id` on top-level anchors but drop it elsewhere.
  root.querySelectorAll('*').forEach((el: Element) => {
    const isSpacer = el.tagName === 'DIV' && (el as HTMLElement).classList.contains('wp-block-spacer')
    if (!isSpacer) el.removeAttribute('style')
    if (el.tagName !== 'A' && el.tagName !== 'IMG') {
      el.removeAttribute('id')
    }
  })

  return root.innerHTML
}

export interface TiptapDoc {
  type: 'doc'
  content: any[]
}

const schema = getSchema(EXTENSIONS)

export function htmlToTiptapDoc(html: string): TiptapDoc {
  installJsdomGlobals()
  const cleaned = normalizeHtml(html)

  const dom = new JSDOM(`<!doctype html><html><body>${cleaned}</body></html>`)
  const body = dom.window.document.body
  const doc = ProseMirrorDOMParser.fromSchema(schema).parse(body as unknown as HTMLElement)
  const json = doc.toJSON() as TiptapDoc
  if (!json || json.type !== 'doc') {
    return { type: 'doc', content: [{ type: 'paragraph' }] }
  }
  return json
}
