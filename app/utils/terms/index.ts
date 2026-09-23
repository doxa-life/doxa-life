// Terminology page content (/about/definitions). Each locale has its own edition
// documenting that language's terminology decisions — the chosen term,
// alternatives considered, what Joshua Project and PeopleGroups.org use,
// and the rationale. Locales without an edition fall back to English.
// A new edition is written when a language is added or its terminology
// changes; the `add-language` and `sync-language` skills in .claude/skills
// cover it. Terminology itself comes from the DOXA glossary, published at
// https://pray.doxa.life/api/glossary/{lang}.

import { en } from './en'
import { fr } from './fr'
import { de } from './de'
import { es } from './es'
import { pt } from './pt'
import { it } from './it'
import { zh } from './zh'
import { ru } from './ru'
import { hi } from './hi'
import { ro } from './ro'
import { ar } from './ar'

export interface TermEntry {
  /** Canonical term in this edition's language. */
  term: string
  /** English source term — present on non-English editions only. */
  english?: string
  definition?: string
  /** Alternatives considered, " · "-separated. */
  alternatives?: string
  /** What Joshua Project uses in this language, if known. */
  jp?: string
  /** What PeopleGroups.org (IMB) uses in this language, if known. */
  pg?: string
  rationale?: string
}

export interface TermsContent {
  title: string
  intro: string[]
  labels: {
    english: string
    definition: string
    alternatives: string
    jp: string
    pg: string
    rationale: string
  }
  entries: TermEntry[]
}

const editions: Record<string, TermsContent> = { en, fr, de, es, pt, it, zh, ru, hi, ro, ar }

export function getTermsContent(locale: string): TermsContent {
  return editions[locale] ?? en
}
