// DeepL translation utility. Slim port of
// campaigns-sever/server/utils/deepl.ts — drops the Bible / verse-node
// handling since marketing-rebuild has no verse content. Supports text,
// batched text, and Tiptap JSON documents.

import { getDeeplTargetCode, getDeeplSourceCode, getGlossaryId } from '~~/config/languages'

interface DeepLTranslation {
  detected_source_language: string
  text: string
}

interface DeepLResponse {
  translations: DeepLTranslation[]
}

export interface TiptapNode {
  type: string
  content?: TiptapNode[]
  text?: string
  marks?: any[]
  attrs?: Record<string, any>
}

export function isDeepLConfigured(): boolean {
  const config = useRuntimeConfig()
  return Boolean(config.deeplApiKey)
}

export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  const translated = await translateTexts([text], targetLanguage, sourceLanguage)
  return translated[0] ?? ''
}

export async function translateTexts(
  texts: string[],
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string[]> {
  if (texts.length === 0) return []

  const config = useRuntimeConfig()
  const apiKey = config.deeplApiKey
  if (!apiKey) throw new Error('DEEPL_API_KEY is not configured')

  const targetLang = getDeeplTargetCode(targetLanguage)
  const sourceLang = sourceLanguage ? getDeeplSourceCode(sourceLanguage) : undefined
  const params = new URLSearchParams({ target_lang: targetLang })
  for (const text of texts) params.append('text', text)
  if (sourceLang) params.append('source_lang', sourceLang)

  const glossaryId = getGlossaryId(targetLanguage)
  if (glossaryId) params.append('glossary_id', glossaryId)

  params.append('model_type', 'quality_optimized')

  const apiUrl = config.deeplApiUrl || 'https://api-free.deepl.com'
  console.log(`[DeepL] Translating ${texts.length} text(s) → ${targetLang}${sourceLang ? ` from ${sourceLang}` : ''}${glossaryId ? ` (glossary: ${glossaryId})` : ''}`)

  const response = await fetch(`${apiUrl}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`DeepL API error: ${response.status} - ${body}`)
  }

  const data = await response.json() as DeepLResponse
  if (!data.translations) throw new Error('No translations returned from DeepL')
  return data.translations.map(t => t.text)
}

// Extract plain text nodes from a Tiptap JSON tree so we can send them
// to DeepL as a batch, then write the translations back at the same
// positions. Mirrors campaigns-sever's implementation minus the
// verse-node skip (no verses in marketing content).
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

  const CHUNK_SIZE = 100
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
