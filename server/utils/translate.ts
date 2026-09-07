// Translation utility — translates plain text, batched text, and Tiptap JSON
// documents with an LLM via OpenRouter. Slim counterpart of
// campaigns-sever/server/utils/translate.ts, without the Bible / verse-node
// handling since marketing-rebuild has no verse content.

import { openrouterTranslateTexts, isOpenRouterConfigured } from './openrouter'

export interface TiptapNode {
  type: string
  content?: TiptapNode[]
  text?: string
  marks?: any[]
  attrs?: Record<string, any>
}

export function isTranslationConfigured(): boolean {
  return isOpenRouterConfigured()
}

export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  const translated = await translateTexts([text], targetLanguage, sourceLanguage)
  return translated[0] ?? ''
}

// Restore the source fragment's leading/trailing whitespace on a translation.
// No model reliably reproduces edge whitespace, and formatting splits sentences
// mid-phrase, so a dropped edge space glues two words together in the rendered
// output. The source fragment is authoritative for the edges.
function restoreEdgeWhitespace(source: string, translated: string): string {
  const leading = source.match(/^\s*/)![0]
  const trailing = source.match(/\s*$/)![0]
  return leading + translated.trim() + trailing
}

export async function translateTexts(
  texts: string[],
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string[]> {
  if (texts.length === 0) return []

  // Blank fragments never reach the model: it has nothing to translate and
  // tends to drop them, which would break the one-translation-per-fragment
  // count the caller relies on to map results back.
  const indexes: number[] = []
  const translatable: string[] = []
  texts.forEach((text, i) => {
    if (text.trim().length > 0) {
      indexes.push(i)
      translatable.push(text)
    }
  })
  if (translatable.length === 0) return [...texts]

  const translated = await openrouterTranslateTexts(translatable, targetLanguage, sourceLanguage)

  const out = [...texts]
  indexes.forEach((target, i) => {
    out[target] = restoreEdgeWhitespace(texts[target]!, translated[i]!)
  })
  return out
}

// Extract plain text nodes from a Tiptap JSON tree so we can send them
// to the translator as a batch, then write the translations back at the
// same positions.
export function extractTexts(
  node: TiptapNode,
  path: number[] = []
): Array<{ path: number[]; text: string }> {
  const results: Array<{ path: number[]; text: string }> = []
  if (node.type === 'text' && node.text) {
    results.push({ path: [...path], text: node.text })
  }
  if (node.content && Array.isArray(node.content)) {
    node.content.forEach((child, index) => {
      results.push(...extractTexts(child, [...path, index]))
    })
  }
  return results
}

export function setTextAtPath(node: TiptapNode, path: number[], text: string): void {
  if (path.length === 0) {
    node.text = text
    return
  }
  const [index, ...rest] = path as [number, ...number[]]
  if (node.content && node.content[index]) {
    setTextAtPath(node.content[index], rest, text)
  }
}

export async function translateTiptapContent(
  contentJson: TiptapNode,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<TiptapNode> {
  const cloned: TiptapNode = JSON.parse(JSON.stringify(contentJson))
  const entries = extractTexts(cloned)
  if (entries.length === 0) return cloned

  // Chunk size balances request count against the fragment-alignment
  // contract, which gets harder for the model to honor on long batches
  const CHUNK_SIZE = 40
  const allTranslated: string[] = []
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    if (i > 0) await new Promise(r => setTimeout(r, 200))
    const chunk = entries.slice(i, i + CHUNK_SIZE)
    const translated = await translateTexts(chunk.map(e => e.text), targetLanguage, sourceLanguage)
    allTranslated.push(...translated)
  }

  entries.forEach((entry, i) => setTextAtPath(cloned, entry.path, allTranslated[i]!))
  return cloned
}
