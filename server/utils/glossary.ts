/**
 * The approved DOXA terminology, read from pray.doxa.life.
 *
 * The glossary is maintained in the campaigns server's admin, where reviewers
 * confirm each term through a magic link, and published at
 * `GET /api/glossary/{lang}`. This site reads it at runtime rather than
 * vendoring a copy, so a reviewer's correction reaches the next translation
 * without a deploy here.
 *
 * Nothing in this module throws: a translation with no glossary is worse than
 * one with it, but far better than a failed request, so a fetch that fails
 * serves the last good answer and otherwise an empty one.
 */

export interface GlossaryPair {
  term: string
  value: string
}

export interface Glossary {
  pairs: GlossaryPair[]
  /** The language's rules: register, acronym policy, numerals, script and names. */
  notes: string
}

const EMPTY: Glossary = { pairs: [], notes: '' }

/** How long a language's glossary is reused before it is fetched again. */
const CACHE_MS = 10 * 60 * 1000

/**
 * How long a failure or a language with no glossary is remembered. Short
 * enough that starting a language upstream shows up here the same morning,
 * long enough that a locale nobody has a glossary for is not refetched on
 * every fragment of a page translation.
 */
const MISS_CACHE_MS = 60 * 1000

interface CacheEntry {
  glossary: Glossary
  expires: number
}

const cache = new Map<string, CacheEntry>()

interface PublishedGlossary {
  notes?: string
  terms?: Array<{ term?: string, translation?: string }>
}

/**
 * The terminology for one language. Cached in the instance; call it per request
 * rather than holding the result.
 */
export async function getGlossary(code: string): Promise<Glossary> {
  const cached = cache.get(code)
  if (cached && cached.expires > Date.now()) return cached.glossary

  const base = String(useRuntimeConfig().prayBaseUrl || '').replace(/\/$/, '')
  if (!base) return cached?.glossary ?? EMPTY

  try {
    const data = await $fetch<PublishedGlossary>(`${base}/api/glossary/${encodeURIComponent(code)}`, {
      timeout: 5000,
      retry: 1
    })

    const pairs = (data?.terms || [])
      .filter(entry => entry?.term && entry?.translation)
      .map(entry => ({ term: String(entry.term), value: String(entry.translation) }))

    const glossary: Glossary = { pairs, notes: String(data?.notes || '') }
    cache.set(code, { glossary, expires: Date.now() + CACHE_MS })
    return glossary
  } catch (error) {
    // A 404 is the ordinary answer for a language whose glossary has not been
    // started yet, so it is cached briefly rather than logged as a fault.
    const failure = error as { statusCode?: number, response?: { status?: number }, message?: string }
    const status = failure?.statusCode ?? failure?.response?.status
    if (status !== 404) {
      console.warn(`[Glossary] could not read the ${code} glossary from ${base}: ${failure?.message}`)
    }
    const glossary = cached?.glossary ?? EMPTY
    cache.set(code, { glossary, expires: Date.now() + MISS_CACHE_MS })
    return glossary
  }
}

/** Whether approved terminology was available to steer a translation. */
export async function hasGlossary(code: string): Promise<boolean> {
  const glossary = await getGlossary(code)
  return glossary.pairs.length > 0
}

/** Drop the cached copies so the next translation refetches. */
export function clearGlossaryCache(code?: string): void {
  if (code) cache.delete(code)
  else cache.clear()
}

/** The glossary as the two blocks a translation prompt carries. */
export function renderGlossaryPrompt(glossary: Glossary, targetLanguage: string): string {
  const pairs = glossary.pairs.map(({ term, value }) => `${term} → ${value}`).join('\n')
  const terms = glossary.pairs.length
    ? `\nGlossary — always use these translations, inflected correctly for the surrounding grammar:\n${pairs}\n`
    : ''

  // After the terms, so a rule about register or inflection governs the bare
  // pairs above it.
  const notes = glossary.notes.trim()
    ? `\nRules for ${targetLanguage}, from the reviewer who approved the glossary. Follow them everywhere they apply:\n${glossary.notes.trim()}\n`
    : ''

  return `${terms}${notes}`
}
