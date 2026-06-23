// Terminology page content (/terms). Each locale has its own edition
// documenting that language's terminology decisions — the chosen term,
// alternatives considered, what Joshua Project and PeopleGroups.org use,
// and the rationale. Locales without an edition fall back to English.
// New language editions are added as part of the language-stabilization
// process (see translation/LANGUAGE-STABILIZATION.md in the doxa monorepo).

import { en } from './en'
import { fr } from './fr'

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
  /** "Full definitions live on the" / link label / " page." */
  seeDefinitionsBefore: string
  definitionsLinkLabel: string
  seeDefinitionsAfter: string
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

const editions: Record<string, TermsContent> = { en, fr }

export function getTermsContent(locale: string): TermsContent {
  return editions[locale] ?? en
}
