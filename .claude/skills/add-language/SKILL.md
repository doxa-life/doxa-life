---
name: add-language
description: Bring a new language onto the marketing site — the config/languages.ts entry from its glossary record, the site strings, the map widget locales and bundles, the /terms edition, and the CMS pages. Use after the language has a glossary with reviewed terms. Invoke with /add-language <code>.
user-invocable: true
---

# Add a language to doxa.life

Argument: the language code. The language must already exist in the DOXA
glossary, which is maintained in the campaigns server's admin and published at
`https://pray.doxa.life/api/glossary/{code}`. That is where a language is born;
this site follows it.

## 1. Refuse to start without a glossary

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://pray.doxa.life/api/glossary/{code}
```

A 404 means the language has no terminology yet. Stop, and say what has to
happen first: an admin adds it at `/admin/glossary` on pray.doxa.life, drafts
its terms, and a reviewer confirms them. Copy written before that has to be
rewritten after.

Read the whole glossary before writing anything, `notes` included.

## 2. Create the `config/languages.ts` entry

From the glossary record:

| Glossary field | Entry field |
|---|---|
| `language.name_en` | `name` |
| `language.name_local` | `nativeName` |
| `language.text_direction` | `dir: 'rtl'`, omitted when `ltr` |
| `language.bible_id` | `bibleId` |

Ask the person for `flag`, and for `translationName` when the plain English name
is ambiguous in a translation prompt. Set `latinHeadings: false` for any
non-Latin script, so the site does not try to set headings in a display face
that has no glyphs for it.

Add it with `enabled: false`. The language then has routes and can be worked on
while the public switcher stays unchanged.

`hideFromSwitcher: true` is the middle state: routable and translated, but not
offered until someone decides it is ready.

## 3. Site strings

`i18n/locales/{code}/common.json`, with exactly the key structure of
`i18n/locales/en/common.json`.

Translate from English with the glossary and its notes in front of you. Never
add or drop a key. Validate the JSON and compare the key set against English
before moving on.

Missing keys fall back to English rather than showing a key, so a half-finished
file is not obviously broken. Check the count, not the appearance.

## 4. The map widget

1. Copy `embeddables/micro-frontends/1040-maps/src/i18n/locales/en/` to
   `{code}/` and translate every file. `legend.json`, `search.json` and
   `prayerLaps.json` carry terminology; the rest is interface wording.
2. Rebuild: `npm run build` inside `embeddables/micro-frontends/1040-maps/`,
   which writes `public/js/`.
3. `public/js/pplr-data-maps.iife.js` has no build profile. If it carries
   per-language strings for the languages it supports, add this one by patching
   its literals in place; otherwise leave it and say so.

## 5. The `/terms` edition

Create `app/utils/terms/{code}.ts` from `en.ts` and register it in
`app/utils/terms/index.ts`. A locale with no edition falls back to English.

**Entry parity is the rule:** the same 20 entries in the same order as `en.ts`.
Per entry, fill what applies — the chosen term, the English original, the
definition, the alternatives considered, what Joshua Project and
PeopleGroups.org use, and a rationale that cites this language's reference Bible
wherever the choice is Scripture-driven. An entry that needed no real decision
in this language still appears, with its definition and a one-line rationale.

Two rendering rules already encoded in `app/pages/terms.vue` that a new edition
must not break: entries stay flat children of `.page-body`, because the site's
typography uses direct-child selectors and a global rule gives every `<section>`
landing-page padding; and a space at the edge of a `<template>` fragment has to
be interpolated as `{{ ' ' }}` or Vue's whitespace handling strips it.

## 6. CMS pages

Pages live in this site's database. Create the translations through the
`doxa-cms` MCP server at `https://doxa.life/mcp`.

- `list_pages(locale: "en", status: "any", limit: 100)` for the set to
  translate. Match the set an established language already has rather than
  translating everything: signed letters and one-off event pages are
  deliberately left in English.
- `upsert_page_translation` creates a draft. `publish_translation` is a separate
  call, and publishing is the person's decision, not yours. Draft everything,
  then ask.
- Edit `body_json` on any page reported lossy, any page with links, and any page
  whose heading begins with a line break.
- One subagent per page works well, each given the glossary, the language's
  notes, and the register. Follow it with a pass across all the pages together,
  because per-page agents diverge on wording the glossary does not fix.

## 7. Switch it on

Set `enabled: true` once the site strings and the map locales are done. Then run
`npx nuxi typecheck`, start the dev server, and read the home page, a people
group page, the adopt flow and `/{code}/terms` end to end. For a right-to-left
language, confirm the layout mirrors.

The typecheck baseline is 122 pre-existing errors in the external layers and
`server/api/maps/token.get.ts`. None of them are yours.

## 8. Report

What was added, what is still English, which CMS pages are drafted and awaiting
a decision to publish, and anything a reviewer must answer. Repository changes
stay uncommitted.
