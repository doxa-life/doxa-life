# Decision — header-comment pattern for `.vue` profile files

**Question (card 1db96141):** Of JSDoc, WordPress-style, YAML frontmatter, custom JSON
block, and Storybook CSF meta — which is the **most widely adopted** header pattern that
developers **already know**? If there is no clear consensus, drop the idea entirely.

**Verdict: there IS a clear consensus — JSDoc. Adopt a JSDoc header comment; do not drop
the idea.**

## Why JSDoc wins on adoption

The deciding criterion is *adoption + prior familiarity in the JS/Vue world*, not raw
power. Ranked by that criterion:

| Pattern | Adoption in JS/Vue | Is it a *header comment*? | Developers already know it? |
|---|---|---|---|
| **JSDoc `/** @file/@description … */`** | **Highest** — the de-facto JS doc-comment standard | ✅ yes, native | ✅ yes — universal |
| YAML frontmatter | High, but in **Markdown / SSG / SFC custom blocks**, not JS comments | ✗ a block, not a comment | ✅ yes (from Markdown) |
| Storybook CSF `meta` | High, but **only in `*.stories.*`** and it's an **export object**, not a header | ✗ exported code | partially (Storybook users) |
| WordPress `Key: Value` | Huge — but **PHP world**, not JS/`.vue` | ✅ comment | ✗ not for JS devs |
| Custom JSON block | Low — bespoke | ✅ comment | ✗ no |

**JSDoc is the only option that is simultaneously (a) a comment, (b) JS/Vue-native, and
(c) already known by essentially every JS developer.** It is officially specified
(`@file`/`@fileoverview`/`@overview`, plus free-text `@description`), recognized by VS Code
(hover docs), lintable via `eslint-plugin-jsdoc`, and extractable from a `.vue` SFC by
`@vuedoc/parser`/`comment-parser` *or* a one-line regex. It also matches the JSDoc block
headers this repo's `app-profiles/*/index.js` entries already use — so adopting it is
*consistency*, not a new convention.

The runners-up each fail the brief: YAML frontmatter and CSF are well-known but are **not
header comments** (frontmatter is an SFC custom block; CSF is an exported object); WordPress
headers are widely adopted but in a **different language ecosystem**; a custom JSON block has
**no adoption** and defeats the "developers already know it" requirement.

## Recommended shape (minimal, optional)

A small, **optional** JSDoc header at the top of a profile `.vue`'s `<script setup>` —
human-readable docs that a build script can also scrape:

```vue
<script setup>
/**
 * @file         Engagement / prayer / adoption map screen.
 * @description  One-line human summary of what this map shows.
 * @profile      doxa-simple-map     — must match this filename
 * @bundle       doxa-simple-map
 * @element      doxa-map
 */
</script>
```

Keep it **optional** (a map without it still builds) and a **closed tag set** (warn on
unknown tags). Extract with the zero-dependency regex `/^\s*\*\s*@([\w-]+)\s+(.+?)\s*$/gm`.

## Recommendation to coordinator

- **Proceed**, not drop — JSDoc is the clear-consensus, already-known pattern.
- The implementation belongs to card **b80fbf7e** ("use JSDoc `@description` as optional
  header comment, generate `manifest.json` on build"), which this decision green-lights.
- Full pattern comparison (machine/human readability, OSS usage, pros/cons for all five) is
  in **`docs/RESEARCH-file-header-patterns.md`**; this memo is the distilled decision.
