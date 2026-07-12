# src/api/ — your map's data wiring

Where you declare **which data source** this map reads. The library owns the
*mechanism* (how to fetch/parse a source); you own the *declaration* (which source,
which endpoint, how its fields map to yours).

## The split

| Piece | Where | Edit it? |
|---|---|---|
| The fetch/parse **mechanism** (`DataSourceManager`, the source registry) | `library/api/` — import via `@map/api/…` | **No** — reuse only |
| **Which** source this map uses (endpoint, type, field mappings) | **here**, in your own `sources.json` | **Yes** — this is your surface |

The library's `library/api/README.md` documents the source-entry contract
(`type`, endpoint/path/url, `fieldMappings`, `imageConfig`, `activeSource`). Copy
one entry, point it at your data, done — **no code**.

## How you use it

Your data usually arrives at runtime through the host page's `profile-config`
(`inject('dataSource')` inside your `.vue`), so the *same* bundle can point at
different data without a rebuild. Use a bundled `sources.json` here only when you
want to ship a fixed default source with the map.

```js
// in your profile .vue — reuse the mechanism from the library:
import { DataSourceManager } from '@map/api/DataSourceManager.js'

// …and, if you ship a fixed source, your own declaration from this folder:
import sources from './src/api/sources.json'
```

Add a REST API, a plain JSON URL, or a CSV by adding one entry — no code. Prefer a
real API over inlining large JSON into the bundle. If you must ship static data,
put the file in `src/data/` (create it) and reference it here.

## See also

- `../../../../library/api/README.md` — the source-entry contract (types + fields).
- `../../../../docs/REFERENCE-library-index.md` — the `@map/api` mechanism entry.
