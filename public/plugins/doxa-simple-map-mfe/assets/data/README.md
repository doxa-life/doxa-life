# assets/data — Map Data Files

Place your Parquet (or GeoJSON / CSV) data files here.  
They are loaded at runtime by the composables in `src/composables/`.

---

## Expected Parquet Schema

| Column | Type | Description |
|--------|------|-------------|
| `peid` | `int64` | People Group ID (matches Joshua Project PEID) |
| `name` | `utf8` | People group name |
| `country` | `utf8` | ISO 3166-1 alpha-3 country code |
| `lat` | `float64` | Latitude of primary population center |
| `lon` | `float64` | Longitude of primary population center |
| `population` | `int64` | Estimated population |
| `evangelical_pct` | `float32` | % evangelical (0.0 – 100.0) |
| `frontier` | `bool` | `true` if Frontier People Group (< 0.1 % evangelical) |
| `region_code` | `utf8` | World region code |
| `language` | `utf8` | Primary language |

> Add or extend columns as needed — the map profiles read only the fields they use.

---

## Files

| File | Description |
|------|-------------|
| `people-groups.parquet` | Full dataset (not committed — add to .gitignore if large) |
| `people-groups-sample.parquet` | Trimmed sample safe to commit for demos |

---

## Loading in a Profile

```js
// src/app-profiles/your-profile.vue  (inside setup)
import { useDataStore } from '@/stores/dataStore'
const dataStore = useDataStore()
await dataStore.loadParquet('assets/data/people-groups-sample.parquet')
```
