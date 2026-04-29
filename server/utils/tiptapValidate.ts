// Validates a Tiptap JSON document against an explicit per-node /
// per-mark policy. MCP write inputs are treated as hostile — the body
// is later rendered to public HTML via renderTiptap.ts and injected
// into the page, so validation is the only line of defense against
// stored XSS and unknown-node smuggling.
//
// Policy buckets (see plans/mcp-project/mcp-project.md):
//   - preserve: per-node allowlist passes attrs through unchanged
//   - strip: unknown attrs are dropped and a warning is logged
//   - reject: any rule violation throws (style outside the spacer
//     exception, dangerous URL schemes, unknown node types, etc.)

import { PRESERVED_DATA_ATTRS } from '~~/app/utils/tiptapDiv'
import { isSafeHttpUrl as isSafeUrl } from './urlValidation'

// ── Allowlists ──────────────────────────────────────────────────────

// Registered Tiptap node names (matches buildTiptapExtensions()).
export const NODE_NAMES: ReadonlySet<string> = new Set([
  'doc',
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'hardBreak',
  'text',
  'image',
  'youtube',
  'div',
  'verse',
  'uupgsList',
  'generalResources'
])

export const MARK_NAMES: ReadonlySet<string> = new Set([
  'bold',
  'italic',
  'strike',
  'code',
  'link',
  'textStyle',
  'highlight',
  'subscript',
  'superscript',
  'underline'
])

// CUBE-CSS primitives the editor and the WP scrape produce. Any other
// class on a div is rejected.
const DIV_CLASS_SAFELIST: ReadonlySet<string> = new Set([
  'wp-block-spacer',
  'card',
  'grid',
  'switcher',
  'stack',
  'cluster',
  'sidebar',
  'reel',
  'frame',
  'cover',
  'imposter',
  'icon',
  'wrapper',
  'box',
  'center',
  'resource-card'
])

// Per-node attribute allowlist. Only listed attrs are preserved; any
// other attr is stripped + logged. Values like `image.align` round-
// trip through here even though the lossy detector flags them — the
// validator is structural defense, the lossy flag is informational.
const NODE_ATTRS: Readonly<Record<string, ReadonlyArray<string>>> = {
  doc: [],
  paragraph: ['textAlign'],
  heading: ['level', 'textAlign'],
  bulletList: [],
  orderedList: ['start', 'type'],
  listItem: [],
  blockquote: [],
  codeBlock: ['language'],
  horizontalRule: [],
  hardBreak: [],
  text: [],
  image: ['src', 'alt', 'title', 'align', 'width', 'height'],
  youtube: ['src', 'width', 'height', 'start'],
  div: ['class', 'style', ...PRESERVED_DATA_ATTRS],
  verse: ['reference'],
  uupgsList: [
    'languageCode', 'selectUrl', 'researchUrl', 'initialSearchTerm', 't',
    'perPage', 'morePerPage',
    'useSelectCard', 'useHighlightedUUPGs', 'hideSeeAllLink', 'dontShowListOnLoad', 'randomizeList'
  ],
  generalResources: ['useDocuments', 'layout']
}

// Per-mark attribute allowlist. Mark attrs are validated with explicit
// per-attr checks below — entries here are just the structural set.
const MARK_ATTRS: Readonly<Record<string, ReadonlyArray<string>>> = {
  bold: [],
  italic: [],
  strike: [],
  code: [],
  link: ['href', 'target', 'rel', 'class', 'title'],
  textStyle: ['color', 'fontFamily'],
  highlight: ['color'],
  subscript: [],
  superscript: [],
  underline: []
}

// ── URL allowlist ───────────────────────────────────────────────────

const NAMED_COLORS = new Set([
  'black', 'white', 'red', 'green', 'blue', 'yellow',
  'orange', 'purple', 'pink', 'gray', 'grey', 'brown',
  'transparent', 'inherit', 'currentcolor'
])

// YouTube embeds: only the canonical embed/watch URLs.
function isSafeYoutubeUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') return false
    const host = parsed.hostname.toLowerCase()
    if (host === 'www.youtube.com' || host === 'youtube.com') {
      return parsed.pathname.startsWith('/embed/') || parsed.pathname === '/watch'
    }
    if (host === 'youtu.be') return true
    return false
  } catch {
    return false
  }
}

function isSafeColor(value: unknown): boolean {
  if (typeof value !== 'string') return true // null is fine, missing is fine
  const v = value.trim()
  if (v === '') return true
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return true
  if (NAMED_COLORS.has(v.toLowerCase())) return true
  return false
}

// ── DoS limits ──────────────────────────────────────────────────────

// Caps on the doc-tree shape, independent of serialized size. The schema
// layer caps body_json at 1 MB; these stop pathological structure (deep
// nesting or huge node count) that fits inside that budget but still
// chews CPU at validate/render time.
const MAX_DEPTH = 50
const MAX_NODES = 25_000

// ── Errors ──────────────────────────────────────────────────────────

export class TiptapValidationError extends Error {
  constructor(public reason: string, public path: string) {
    super(`${reason} at ${path}`)
    this.name = 'TiptapValidationError'
  }
}

interface JsonMark {
  type?: string
  attrs?: Record<string, unknown>
}

interface JsonNode {
  type?: string
  attrs?: Record<string, unknown>
  content?: JsonNode[]
  marks?: JsonMark[]
  text?: string
}

// ── Walker ──────────────────────────────────────────────────────────

export interface ValidateOptions {
  // When true (the default), validation rejects unknown node types
  // outright. When false, unknown nodes are stripped — used internally
  // by the conversion pipeline for forward-compat.
  rejectUnknownNodes?: boolean
}

export function tiptapValidate(doc: unknown, opts: ValidateOptions = {}): asserts doc is { type: 'doc'; content: JsonNode[] } {
  const reject = opts.rejectUnknownNodes ?? true

  if (!doc || typeof doc !== 'object') {
    throw new TiptapValidationError('Document must be an object', '$')
  }
  const root = doc as JsonNode
  if (root.type !== 'doc') {
    throw new TiptapValidationError('Root node type must be "doc"', '$.type')
  }
  if (!Array.isArray(root.content) || root.content.length === 0) {
    throw new TiptapValidationError('Document content must be a non-empty array', '$.content')
  }

  // Doc-tree shape budgets (see MAX_DEPTH / MAX_NODES). Single counter
  // shared across the whole walk; depth tracked per recursion arm.
  const counter = { nodes: 1 } // root counts as one
  for (let i = 0; i < root.content.length; i++) {
    walkNode(root.content[i], `$.content[${i}]`, reject, 1, counter)
  }
}

function walkNode(node: JsonNode | undefined, path: string, rejectUnknown: boolean, depth: number, counter: { nodes: number }): void {
  if (!node || typeof node !== 'object') {
    throw new TiptapValidationError('Node must be an object', path)
  }
  counter.nodes++
  if (counter.nodes > MAX_NODES) {
    throw new TiptapValidationError(`Document exceeds ${MAX_NODES}-node cap`, path)
  }
  if (depth > MAX_DEPTH) {
    throw new TiptapValidationError(`Document exceeds ${MAX_DEPTH}-level depth cap`, path)
  }
  const type = node.type
  if (!type || typeof type !== 'string') {
    throw new TiptapValidationError('Node missing type', path)
  }

  if (!NODE_NAMES.has(type)) {
    if (rejectUnknown) {
      throw new TiptapValidationError(`Unknown node type "${type}"`, path)
    }
    return
  }

  // Text nodes carry a non-empty `text` and optional marks; no content.
  if (type === 'text') {
    if (typeof node.text !== 'string' || node.text.length === 0) {
      throw new TiptapValidationError('Text node requires non-empty text', path)
    }
    if (Array.isArray(node.marks)) {
      for (let i = 0; i < node.marks.length; i++) {
        walkMark(node.marks[i], `${path}.marks[${i}]`)
      }
    }
    return
  }

  // Validate per-node attributes
  validateNodeAttrs(type, node.attrs, path)

  // Custom URL validation per node type
  if (type === 'image') {
    const src = node.attrs?.src
    if (typeof src !== 'string' || !isSafeUrl(src)) {
      throw new TiptapValidationError('image.src is not a safe URL', `${path}.attrs.src`)
    }
  }
  if (type === 'youtube') {
    const src = node.attrs?.src
    if (typeof src !== 'string' || !isSafeYoutubeUrl(src)) {
      throw new TiptapValidationError('youtube.src must be a YouTube embed URL', `${path}.attrs.src`)
    }
  }

  // Recurse into content
  if (Array.isArray(node.content)) {
    for (let i = 0; i < node.content.length; i++) {
      walkNode(node.content[i], `${path}.content[${i}]`, rejectUnknown, depth + 1, counter)
    }
  }
}

function validateNodeAttrs(type: string, attrs: Record<string, unknown> | undefined, path: string): void {
  if (!attrs || typeof attrs !== 'object') return
  const allowed = NODE_ATTRS[type] ?? []
  const allowedSet = new Set(allowed)

  for (const [key, value] of Object.entries(attrs)) {
    // Tiptap declares optional attributes with `default: null`, so the
    // attrs object always contains every declared key — null/undefined
    // means "attribute not set," not "attribute present with null value."
    // Treat these as absent; the per-key rules below assume a real value.
    if (value === null || value === undefined) continue

    if (key === 'style') {
      if (type !== 'div') {
        throw new TiptapValidationError(`style attr not allowed on ${type}`, `${path}.attrs.style`)
      }
      // Div-with-style is only allowed when class === 'wp-block-spacer'
      const cls = typeof attrs.class === 'string' ? attrs.class : ''
      if (!/\bwp-block-spacer\b/.test(cls)) {
        throw new TiptapValidationError('div.style only allowed on wp-block-spacer', `${path}.attrs.style`)
      }
      if (typeof value !== 'string' || !/^height:\s*\d+(\.\d+)?(px|em|rem|%)?\s*;?\s*$/.test(value)) {
        throw new TiptapValidationError('div.style on wp-block-spacer must be height:<n><unit>', `${path}.attrs.style`)
      }
      continue
    }
    if (key === 'class' && type === 'div') {
      if (typeof value !== 'string') {
        throw new TiptapValidationError('div.class must be a string', `${path}.attrs.class`)
      }
      const classes = value.trim().split(/\s+/).filter(Boolean)
      for (const cls of classes) {
        if (!DIV_CLASS_SAFELIST.has(cls)) {
          throw new TiptapValidationError(`div.class "${cls}" not in safelist`, `${path}.attrs.class`)
        }
      }
      continue
    }
    if (!allowedSet.has(key)) {
      // Strip + log (forward-compat with minor extension changes).
      console.warn('[mcp] tiptapValidate: stripped unknown attr', { type, key, path })
      delete attrs[key]
      continue
    }
    // Reject any script/srcdoc/on* slip-through (they shouldn't be on
    // the allowlist anyway, but defense in depth).
    if (key === 'srcdoc' || key.startsWith('on') || key === 'script') {
      throw new TiptapValidationError(`forbidden attr ${key}`, `${path}.attrs.${key}`)
    }
  }
}

function walkMark(mark: JsonMark | undefined, path: string): void {
  if (!mark || typeof mark !== 'object') {
    throw new TiptapValidationError('Mark must be an object', path)
  }
  const type = mark.type
  if (!type || !MARK_NAMES.has(type)) {
    throw new TiptapValidationError(`Unknown mark type "${type ?? '<missing>'}"`, `${path}.type`)
  }
  const allowed = MARK_ATTRS[type] ?? []
  const allowedSet = new Set(allowed)
  if (mark.attrs && typeof mark.attrs === 'object') {
    for (const [key, value] of Object.entries(mark.attrs)) {
      // Same null/undefined semantics as node attrs — Tiptap's default-null
      // pattern leaves the key in the JSON. Treat as absent.
      if (value === null || value === undefined) continue
      if (!allowedSet.has(key)) {
        console.warn('[mcp] tiptapValidate: stripped unknown mark attr', { type, key, path })
        delete mark.attrs[key]
        continue
      }
      // Per-attr validation
      if (type === 'link') {
        if (key === 'href' && !isSafeUrl(value)) {
          throw new TiptapValidationError('link.href is not a safe URL', `${path}.attrs.href`)
        }
        if (key === 'target' && value !== null && value !== '_blank' && value !== '_self') {
          throw new TiptapValidationError('link.target must be _blank or _self', `${path}.attrs.target`)
        }
      }
      if ((type === 'textStyle' || type === 'highlight') && key === 'color' && !isSafeColor(value)) {
        throw new TiptapValidationError(`${type}.color must be a safe color value`, `${path}.attrs.color`)
      }
    }
  }
}
