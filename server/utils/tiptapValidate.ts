// Sanitizes a Tiptap JSON document against an explicit per-node /
// per-mark policy. MCP and admin write inputs are treated as hostile —
// the body is later rendered to public HTML via renderTiptap.ts and
// injected into the page, so this pass is the only line of defense
// against stored XSS and unknown-node smuggling.
//
// Policy buckets:
//   - preserve: per-node allowlist passes attrs through unchanged
//   - strip-and-warn: unknown attrs and bad attr *values* are dropped
//     in place; a SanitizationWarning is collected so the caller can
//     surface "some formatting was simplified" to the author
//   - reject: only structural violations (doc shape, DoS limits, and
//     forbidden attr names like script/srcdoc/on*) throw
//
// The function mutates `doc` in place and returns the warning list.

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
// class on a div is dropped.
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
// other attr is stripped + warned. Values like `image.align` round-
// trip through here even though the lossy detector flags them — the
// sanitizer is structural defense, the lossy flag is informational.
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

// CSS color values that pass into a `color: <value>` declaration.
// Strict regexes — digits, decimal points, %, commas, parens, whitespace
// only — so even though the value lands inside a style attribute, no
// CSS escape characters can slip through.
const RGB_BYTE = '(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)'                          // 0–255
const PCT = '(?:100(?:\\.0+)?|\\d{1,2}(?:\\.\\d+)?)%'                       // 0–100%
const ALPHA = '(?:0|1|0?\\.\\d+|' + PCT + ')'                               // 0–1 or 0–100%
const HUE = '(?:360(?:\\.0+)?|3[0-5]\\d(?:\\.\\d+)?|[12]?\\d{1,2}(?:\\.\\d+)?)'  // 0–360
const RGB_RE = new RegExp(`^rgb\\(\\s*(?:${RGB_BYTE}|${PCT})(?:\\s*,\\s*(?:${RGB_BYTE}|${PCT})){2}\\s*\\)$`)
const RGBA_RE = new RegExp(`^rgba\\(\\s*(?:${RGB_BYTE}|${PCT})(?:\\s*,\\s*(?:${RGB_BYTE}|${PCT})){2}\\s*,\\s*${ALPHA}\\s*\\)$`)
const HSL_RE = new RegExp(`^hsl\\(\\s*${HUE}\\s*,\\s*${PCT}\\s*,\\s*${PCT}\\s*\\)$`)
const HSLA_RE = new RegExp(`^hsla\\(\\s*${HUE}\\s*,\\s*${PCT}\\s*,\\s*${PCT}\\s*,\\s*${ALPHA}\\s*\\)$`)

function isSafeColor(value: unknown): boolean {
  if (typeof value !== 'string') return true // null is fine, missing is fine
  const v = value.trim()
  if (v === '') return true
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return true
  if (NAMED_COLORS.has(v.toLowerCase())) return true
  if (RGB_RE.test(v) || RGBA_RE.test(v)) return true
  if (HSL_RE.test(v) || HSLA_RE.test(v)) return true
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

export interface SanitizationWarning {
  path: string
  reason: string
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
  // When true (the default), unknown node types are dropped from the
  // doc and a warning is recorded. When false, unknown nodes are
  // silently kept (used internally by the conversion pipeline for
  // forward-compat). The "throw on unknown node type" mode the older
  // validator had is gone — sanitize-then-store is the contract.
  rejectUnknownNodes?: boolean
}

export interface ValidateResult {
  warnings: SanitizationWarning[]
}

export function tiptapValidate(doc: unknown, opts: ValidateOptions = {}): ValidateResult {
  const dropUnknown = opts.rejectUnknownNodes ?? true
  const warnings: SanitizationWarning[] = []

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
  walkContentArray(root.content, '$.content', warnings, dropUnknown, 1, counter)

  return { warnings }
}

// Walks a parent's content array, mutating it in place: bad nodes are
// removed via splice, and recursion continues into surviving nodes.
function walkContentArray(
  content: JsonNode[],
  pathPrefix: string,
  warnings: SanitizationWarning[],
  dropUnknown: boolean,
  depth: number,
  counter: { nodes: number }
): void {
  for (let i = 0; i < content.length; i++) {
    const path = `${pathPrefix}[${i}]`
    const action = walkNode(content[i], path, warnings, dropUnknown, depth, counter)
    if (action === 'remove') {
      content.splice(i, 1)
      i--
    }
  }
}

function walkNode(
  node: JsonNode | undefined,
  path: string,
  warnings: SanitizationWarning[],
  dropUnknown: boolean,
  depth: number,
  counter: { nodes: number }
): 'keep' | 'remove' {
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
    if (dropUnknown) {
      warnings.push({ path, reason: `unknown node type "${type}"; dropped` })
      return 'remove'
    }
    return 'keep'
  }

  // Text nodes carry a non-empty `text` and optional marks; no content.
  if (type === 'text') {
    if (typeof node.text !== 'string' || node.text.length === 0) {
      throw new TiptapValidationError('Text node requires non-empty text', path)
    }
    if (Array.isArray(node.marks)) {
      walkMarksArray(node.marks, `${path}.marks`, warnings)
    }
    return 'keep'
  }

  // Validate per-node attributes (mutates attrs)
  validateNodeAttrs(type, node.attrs, path, warnings)

  // Custom URL validation per node type — bad URLs drop the node.
  if (type === 'image') {
    const src = node.attrs?.src
    if (typeof src !== 'string' || !isSafeUrl(src)) {
      warnings.push({ path: `${path}.attrs.src`, reason: 'image.src is not a safe URL; image dropped' })
      return 'remove'
    }
  }
  if (type === 'youtube') {
    const src = node.attrs?.src
    if (typeof src !== 'string' || !isSafeYoutubeUrl(src)) {
      warnings.push({ path: `${path}.attrs.src`, reason: 'youtube.src is not a YouTube embed URL; node dropped' })
      return 'remove'
    }
  }

  // Recurse into content
  if (Array.isArray(node.content)) {
    walkContentArray(node.content, `${path}.content`, warnings, dropUnknown, depth + 1, counter)
  }

  return 'keep'
}

function validateNodeAttrs(
  type: string,
  attrs: Record<string, unknown> | undefined,
  path: string,
  warnings: SanitizationWarning[]
): void {
  if (!attrs || typeof attrs !== 'object') return
  const allowed = NODE_ATTRS[type] ?? []
  const allowedSet = new Set(allowed)

  for (const [key, value] of Object.entries(attrs)) {
    // Tiptap declares optional attributes with `default: null`, so the
    // attrs object always contains every declared key — null/undefined
    // means "attribute not set," not "attribute present with null value."
    // Treat these as absent; the per-key rules below assume a real value.
    if (value === null || value === undefined) continue

    // Reject any script/srcdoc/on* slip-through (they shouldn't be on
    // the allowlist anyway, but defense in depth — these stay throws).
    if (key === 'srcdoc' || key.startsWith('on') || key === 'script') {
      throw new TiptapValidationError(`forbidden attr ${key}`, `${path}.attrs.${key}`)
    }

    if (key === 'style') {
      if (type !== 'div') {
        warnings.push({ path: `${path}.attrs.style`, reason: `style attr not allowed on ${type}; dropped` })
        delete attrs[key]
        continue
      }
      const cls = typeof attrs.class === 'string' ? attrs.class : ''
      if (!/\bwp-block-spacer\b/.test(cls)) {
        warnings.push({ path: `${path}.attrs.style`, reason: 'div.style only allowed on wp-block-spacer; dropped' })
        delete attrs[key]
        continue
      }
      if (typeof value !== 'string' || !/^height:\s*\d+(\.\d+)?(px|em|rem|%)?\s*;?\s*$/.test(value)) {
        warnings.push({ path: `${path}.attrs.style`, reason: 'div.style on wp-block-spacer must be height:<n><unit>; dropped' })
        delete attrs[key]
        continue
      }
      continue
    }
    if (key === 'class' && type === 'div') {
      if (typeof value !== 'string') {
        warnings.push({ path: `${path}.attrs.class`, reason: 'div.class must be a string; dropped' })
        delete attrs[key]
        continue
      }
      const classes = value.trim().split(/\s+/).filter(Boolean)
      const kept: string[] = []
      const dropped: string[] = []
      for (const cls of classes) {
        if (DIV_CLASS_SAFELIST.has(cls)) kept.push(cls)
        else dropped.push(cls)
      }
      if (dropped.length > 0) {
        warnings.push({
          path: `${path}.attrs.class`,
          reason: `div.class: dropped ${dropped.length} non-safelisted class${dropped.length === 1 ? '' : 'es'} (${dropped.slice(0, 3).join(', ')}${dropped.length > 3 ? '…' : ''})`
        })
      }
      if (kept.length === 0) delete attrs[key]
      else attrs[key] = kept.join(' ')
      continue
    }
    if (!allowedSet.has(key)) {
      warnings.push({ path: `${path}.attrs.${key}`, reason: `unknown attr "${key}" on ${type}; dropped` })
      delete attrs[key]
      continue
    }
  }
}

// Walks a text node's marks array, mutating it in place: bad marks are
// removed via splice; bad attr values within a mark drop just the attr
// (or the whole mark, if removing the attr leaves it semantically empty).
function walkMarksArray(
  marks: JsonMark[],
  pathPrefix: string,
  warnings: SanitizationWarning[]
): void {
  for (let i = 0; i < marks.length; i++) {
    const path = `${pathPrefix}[${i}]`
    const action = walkMark(marks[i], path, warnings)
    if (action === 'remove') {
      marks.splice(i, 1)
      i--
    }
  }
}

function walkMark(
  mark: JsonMark | undefined,
  path: string,
  warnings: SanitizationWarning[]
): 'keep' | 'remove' {
  if (!mark || typeof mark !== 'object') {
    throw new TiptapValidationError('Mark must be an object', path)
  }
  const type = mark.type
  if (!type || typeof type !== 'string' || !MARK_NAMES.has(type)) {
    warnings.push({ path: `${path}.type`, reason: `unknown mark type "${type ?? '<missing>'}"; dropped` })
    return 'remove'
  }
  const allowed = MARK_ATTRS[type] ?? []
  const allowedSet = new Set(allowed)
  if (mark.attrs && typeof mark.attrs === 'object') {
    for (const [key, value] of Object.entries(mark.attrs)) {
      // Same null/undefined semantics as node attrs.
      if (value === null || value === undefined) continue

      // Forbidden attr names stay throws (defense in depth).
      if (key === 'srcdoc' || key.startsWith('on') || key === 'script') {
        throw new TiptapValidationError(`forbidden attr ${key}`, `${path}.attrs.${key}`)
      }

      if (!allowedSet.has(key)) {
        warnings.push({ path: `${path}.attrs.${key}`, reason: `unknown attr "${key}" on ${type} mark; dropped` })
        delete mark.attrs[key]
        continue
      }

      // Per-attr value validation
      if (type === 'link') {
        if (key === 'href' && !isSafeUrl(value)) {
          warnings.push({ path: `${path}.attrs.href`, reason: 'link.href is not a safe URL; link dropped' })
          return 'remove'
        }
        if (key === 'target' && value !== '_blank' && value !== '_self') {
          warnings.push({ path: `${path}.attrs.target`, reason: `link.target "${String(value)}" not allowed; dropped` })
          delete mark.attrs[key]
          continue
        }
      }
      if ((type === 'textStyle' || type === 'highlight') && key === 'color' && !isSafeColor(value)) {
        warnings.push({ path: `${path}.attrs.color`, reason: `${type}.color "${String(value)}" not a safe color; dropped` })
        delete mark.attrs[key]
        continue
      }
    }
  }

  // textStyle and highlight are only meaningful via their attrs. If
  // we've stripped them all, the mark is a no-op — drop it.
  if (type === 'textStyle' || type === 'highlight') {
    const remaining = mark.attrs ? Object.entries(mark.attrs).filter(([, v]) => v !== null && v !== undefined) : []
    if (remaining.length === 0) return 'remove'
  }

  return 'keep'
}
