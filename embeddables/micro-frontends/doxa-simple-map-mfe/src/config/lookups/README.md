# Lookup Tables

Canonical reference data used to decode API codes into human-readable labels **when the pray-tools API doesn't supply a pre-decoded value**.

## Files

| File | Purpose | Shape | Entries |
|---|---|---|---|
| [`country-iso3.json`](./country-iso3.json) | ISO 3166-1 alpha-3 code → country name (English) | `[{value, label}]` | 242 |
| [`religion-ror.json`](./religion-ror.json) | Fine-grained religion code → label + description | `[{value, label, description}]` | 40 |
| [`religion-ror3.json`](./religion-ror3.json) | Coarse religion family code → label | `[{value, label}]` | 10 |

All three match the shape that pray-tools API returns for `country_code`, `religion`, `religion_3`.

## Source

Copied verbatim from the canonical DOXA standards reference:

```
DOXA/00 reverse-engineer-1/05-standards/similar-products/
  disciple-tools-people-groups-api/data/
    ├── isoalpha3.json  →  country-iso3.json
    ├── ror.json        →  religion-ror.json
    └── ror3.json       →  religion-ror3.json
```

Same shape, same values. Renamed for clarity in this project.

## Usage

**At runtime**, prefer `pray-tools API` decoded labels (locale-aware via `lang=${locale}` query param):

```js
// pray-tools gives us this for matched records — no lookup needed:
pg.country_code  = { value: "MYS", label: "Malaysia"  }   // or "Malaisie" with lang=fr
pg.religion      = { value: "MSN", label: "Islam - Sunni" }
```

**Fallback** to these tables for UUPG-only records (no pray-tools match by `slug`):

```js
import countries from './country-iso3.json'
import religions from './religion-ror.json'

const COUNTRY_BY_CODE  = Object.fromEntries(countries.map(x => [x.value, x.label]))
const RELIGION_BY_CODE = Object.fromEntries(religions.map(x => [x.value, x.label]))

const countryName   = COUNTRY_BY_CODE[uupg.imb_isoalpha3]      ?? uupg.imb_isoalpha3
const religionLabel = RELIGION_BY_CODE[uupg.imb_reg_of_religion] ?? uupg.imb_reg_of_religion
```

## i18n note

English-only for now. Other locales come from the pray-tools API's `lang=${locale}` parameter at runtime — no need to translate these tables inline.

If a UUPG-only record is displayed to a non-English user, it will fall through to English labels from these tables. Acceptable v1 trade-off; ~34% of the dataset.

## Updating

Re-sync from the standards folder whenever the DOXA reference changes:

```bash
STANDARDS="DOXA/00 reverse-engineer-1/05-standards/similar-products/disciple-tools-people-groups-api/data"
cp "$STANDARDS/isoalpha3.json" src/config/lookups/country-iso3.json
cp "$STANDARDS/ror.json"        src/config/lookups/religion-ror.json
cp "$STANDARDS/ror3.json"       src/config/lookups/religion-ror3.json
```
