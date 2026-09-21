---
name: sync-language
description: Bring the marketing site's existing text for one language into line with the current DOXA glossary — site strings, the map widget locales and their bundles, the /terms edition, and the published CMS pages. Use after a reviewer confirms or changes terminology. Invoke with /sync-language <code>.
user-invocable: true
---

# Align doxa.life with the glossary

Argument: a language code this site already carries. For a new one, use
`/add-language`.

## 1. Read the glossary

```bash
curl -s https://pray.doxa.life/api/glossary/{code}?format=markdown
```

The glossary lives in the campaigns server's admin, where reviewers confirm each
term through a magic link, and it is authoritative for every DOXA property. The
response also carries `notes`: this language's register, its acronym policy, its
number format and its script rules. Read those first; they decide how the terms
are used.

A `draft` term is still authoritative — it is wording nobody has ruled on yet,
not wording to ignore.

An acronym is a field of its own. The wording never carries it, so a term
published as `Unreached people group (UPG) → grupo étnico não alcançado (PNA)`
gives the phrase `grupo étnico não alcançado` and, separately, the acronym
`PNA`. A bare acronym in a string — `Find a UUPG`, the map legend's `UUPGs` —
takes this language's acronym, which is the English one unless a reviewer chose
another.

## 2. Establish what here was written by a human

This matters more on this site than anywhere else. Several languages' copy was
reviewed by a native-speaking volunteer, and their review documents are not in
the repository. `git log` on the locale file and a look at whether the prose
reads like a person wrote it are the available evidence. **Ask.**

**Precedence, highest first:** the reviewer's later notes, then the glossary,
then wording a human reviewer approved, then anything AI-generated.

On reviewed copy, change only a glossary term or an outright defect. Keep their
register, their phrasing, their headings. Where the glossary contradicts a
reviewed sentence, change the term inside that sentence and leave the rest.

On machine-translated copy, fix the defects too. Past sweeps have found
mistranslations that no reviewer ever saw, not just terminology.

## 3. Site strings

`i18n/locales/{code}/common.json`.

Script the replacements with explicit old-to-new pairs, assert each matches,
never change a key, and validate the JSON afterwards. Then grep `app/` and
`server/` for the old wording in case a term is hardcoded.

## 4. The map widget

Three layers, and all three have to move together or the site shows two
vocabularies on one page.

1. **Source locales** — `embeddables/micro-frontends/1040-maps/src/i18n/locales/{code}/`.
   `legend.json`, `search.json` and `prayerLaps.json` carry the terminology.
   These were never human-reviewed, so they follow the glossary outright.
2. **Built bundles** — rebuild with `npm run build` inside
   `embeddables/micro-frontends/1040-maps/`, which writes `public/js/`.
3. **`public/js/pplr-data-maps.iife.js`** — has no build profile and carries an
   older snapshot of the strings. Patch its literals in place with a regex
   against the minified file. Do not copy source strings in blind: its wording
   can differ from the current source. Anchor on a nearby unique literal,
   because several locales' blocks sit within a few kilobytes of each other.

## 5. The `/terms` edition

`app/utils/terms/{code}.ts`, registered in `app/utils/terms/index.ts`. It
documents this language's terminology decisions: the chosen term, the
alternatives considered, what Joshua Project and PeopleGroups.org use, and why.

Every edition carries the same 20 entries in the same order as `en.ts`. Keep
that parity. Update any entry the glossary has moved, and state plainly in the
rationale where the glossary and the language's reference Bible disagree rather
than quietly picking one.

## 6. CMS pages

Pages on doxa.life live in this site's database, not in the repository. Edit
them through the `doxa-cms` MCP server at `https://doxa.life/mcp`, which needs
an OAuth login with `pages.view` and `pages.write`.

- `list_pages(locale: "{code}", status: "any", limit: 100)` to find them.
- `get_page_translation(page_id, "{code}")`, fix, `upsert_page_translation`.
- **Never pass `status` on a published page.** One row holds each page and
  locale, and the site serves only `published`; passing `draft` takes the page
  off the live site. Omitting it keeps the page published, which also means
  **every edit is live the moment it saves**. Say this to the person before the
  first write.
- Edit `body_json`, not markdown, on any page reported lossy, on any page with
  links, and on any page whose heading starts with a line break. A markdown
  save rewrites link attributes and drops trailing breaks even on a page
  reported clean.
- Run replacements against the fetched body with an assertion that each matches
  exactly once, so untouched prose cannot drift.
- Responses are cached for an hour at the origin. Verify an edit with a
  cache-busting query parameter.

## 7. Report

Per surface: terms changed, defects fixed, what was deliberately left, what a
reviewer still owes an answer on. Repository changes stay uncommitted; CMS
pages are already live and must be reported as such.
