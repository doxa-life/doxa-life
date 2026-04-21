// Convert .po files to flat JSON for @nuxtjs/i18n.
// Uses the English msgid as the JSON key; the msgstr (or msgid for English)
// as the value. Skips the header msgid and entries with empty msgstr.
//
// Usage: bun scripts/po-to-json.ts

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const PO_DIR = join(ROOT, '..', 'marketing-theme', 'languages')
const OUT_DIR = join(ROOT, 'i18n', 'locales')

// .po filename → locale code (must match config/languages.ts)
const LOCALES: Record<string, string> = {
  'en_US': 'en',
  'es_ES': 'es',
  'fr_FR': 'fr',
  'pt_PT': 'pt',
  'ar':    'ar',
  'ru_RU': 'ru',
  'de_DE': 'de',
  'hi_IN': 'hi'
}

function unescapePo(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

// Convert WordPress sprintf placeholders to Vue i18n's named/positional
// placeholder syntax so `@intlify/unplugin-vue-i18n` can compile these
// messages at build time.
//   %s        → {0}
//   %1$s %2$s → {0} {1}
//   %d        → {0}
function sprintfToI18n(s: string): string {
  let idx = 0
  return s
    .replace(/%(\d+)\$[sd]/g, (_m, n) => `{${Number(n) - 1}}`)
    .replace(/%[sd]/g, () => `{${idx++}}`)
}

function parsePo(source: string): Record<string, string> {
  const lines = source.split('\n')
  const entries: Record<string, string> = {}
  let msgid: string | null = null
  let msgstr: string | null = null
  let mode: 'msgid' | 'msgstr' | null = null

  const commit = () => {
    if (msgid !== null && msgid !== '' && msgstr !== null && msgstr !== '') {
      entries[sprintfToI18n(msgid)] = sprintfToI18n(msgstr)
    }
    msgid = null
    msgstr = null
    mode = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line === '' || line.startsWith('#')) {
      commit()
      continue
    }

    // Continuation string on its own line: "some text"
    const contMatch = line.match(/^"(.*)"$/)
    if (contMatch && mode) {
      const piece = unescapePo(contMatch[1]!)
      if (mode === 'msgid') msgid = (msgid ?? '') + piece
      else if (mode === 'msgstr') msgstr = (msgstr ?? '') + piece
      continue
    }

    const idMatch = line.match(/^msgid\s+"(.*)"$/)
    if (idMatch) {
      commit()
      msgid = unescapePo(idMatch[1]!)
      mode = 'msgid'
      continue
    }

    const strMatch = line.match(/^msgstr\s+"(.*)"$/)
    if (strMatch) {
      msgstr = unescapePo(strMatch[1]!)
      mode = 'msgstr'
      continue
    }

    // msgctxt and other directives — skip (we don't distinguish contexts)
    if (line.startsWith('msgctxt')) {
      commit()
      continue
    }
  }
  commit()

  return entries
}

function writeLocale(locale: string, entries: Record<string, string>) {
  const dir = join(OUT_DIR, locale)
  mkdirSync(dir, { recursive: true })
  const out = join(dir, 'common.json')
  // Sort keys for deterministic output (stable diffs for Weblate)
  const sorted = Object.keys(entries).sort().reduce<Record<string, string>>((acc, k) => {
    acc[k] = entries[k]!
    return acc
  }, {})
  writeFileSync(out, JSON.stringify(sorted, null, 2) + '\n', 'utf8')
  console.log(`  → ${out}  (${Object.keys(sorted).length} keys)`)
}

console.log('Converting .po → locale JSON...')
for (const [poName, locale] of Object.entries(LOCALES)) {
  const poPath = join(PO_DIR, `${poName}.po`)
  let source: string
  try {
    source = readFileSync(poPath, 'utf8')
  } catch {
    console.warn(`  ! skipped ${locale}: ${poPath} not found`)
    continue
  }
  const entries = parsePo(source)

  // For English, the .po typically has empty msgstr (translation = source).
  // Fall back to msgid so we always have a value.
  if (locale === 'en') {
    // Re-parse and fill missing msgstr with msgid
    const lines = source.split('\n')
    let msgid: string | null = null
    let msgstr: string | null = null
    let mode: 'msgid' | 'msgstr' | null = null
    const out: Record<string, string> = {}
    const commit = () => {
      if (msgid !== null && msgid !== '') {
        const key = sprintfToI18n(msgid)
        out[key] = (msgstr && msgstr !== '') ? sprintfToI18n(msgstr) : key
      }
      msgid = null
      msgstr = null
      mode = null
    }
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (line === '' || line.startsWith('#')) { commit(); continue }
      const contMatch = line.match(/^"(.*)"$/)
      if (contMatch && mode) {
        const piece = unescapePo(contMatch[1]!)
        if (mode === 'msgid') msgid = (msgid ?? '') + piece
        else if (mode === 'msgstr') msgstr = (msgstr ?? '') + piece
        continue
      }
      const idMatch = line.match(/^msgid\s+"(.*)"$/)
      if (idMatch) { commit(); msgid = unescapePo(idMatch[1]!); mode = 'msgid'; continue }
      const strMatch = line.match(/^msgstr\s+"(.*)"$/)
      if (strMatch) { msgstr = unescapePo(strMatch[1]!); mode = 'msgstr'; continue }
      if (line.startsWith('msgctxt')) { commit(); continue }
    }
    commit()
    writeLocale(locale, out)
  } else {
    writeLocale(locale, entries)
  }
}
console.log('Done.')
