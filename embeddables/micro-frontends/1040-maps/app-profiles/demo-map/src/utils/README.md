# src/utils/ — your map's own helper functions

Pure helper functions specific to **this map** live here — small, stateless,
testable functions (formatters, tiny transforms, lookups) that don't need Vue.

## What belongs here vs. in the library

| Helper | Where |
|---|---|
| A helper **only your map** uses | **here** — `src/utils/yourHelper.js` |
| A reusable, general helper (geo math, cluster helpers) | `library/utils/` — reuse via `@map/utils/…` |

The library ships shared helpers already — `geoUtils`, `ClusterHelpers`,
`apiBaseUrl`, and more (see **`docs/REFERENCE-library-index.md`**). Reuse those; keep here only
the small helpers unique to your map.

## How you import

```js
// reuse a shared helper from the library:
import { haversine } from '@map/utils/geoUtils.js'

// use your own helper from this sandbox (relative path):
import { formatLabel } from './src/utils/format.js'
```

## Convention

- Keep functions **pure** (no side effects, no global state) — they're the easiest
  code to reason about and to reuse.
- Named exports, one concern per file.

## See also

- `../../../../docs/REFERENCE-library-index.md` — the menu of reusable `@map/utils/…`.
- `../README.md` — the sandbox overview.
