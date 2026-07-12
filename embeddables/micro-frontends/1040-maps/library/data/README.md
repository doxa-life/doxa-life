# data/ — static lookup tables

Small JSON lookup tables inlined into every bundle that imports them (eager JSON
imports; no fetch at runtime). Importable from bundles as
`@map/data/<file>.json`.

## Files

### `langFamilyByLanguage.json`
Language display label → language family (e.g. `"Telugu": "Dravidian"`,
`"Kazakh": "Turkic"`). Used to derive `languageFamily` when the upstream API
returns `null` for `imb_language_family`. Label-keyed, so it only matches
English labels — the ISO table below exists to cover non-English locales.

Consumers: `composables/useMapData.js`, `composables/useDoxaSearch.js`,
`composables/useMapLayers.js`,
`composables/legends/useLanguageFamilyLegendData.js`.

### `langFamilyByIso.json`
ISO 639-3 language code → language family (e.g. `"afr": "Indo-European"`).
The pray-tools API localizes `primary_language.label`, so label-based family
lookups fail in non-English locales; `primary_language.value` is the stable ISO
code, and this table resolves the family from it first.

Generated from the EN API responses + `langFamilyByLanguage.json` (map each EN
label's family onto the row's ISO code). There is no regeneration script in the
repo — regenerate by re-running that join against a fresh EN API pull if the
upstream language set changes.

Consumer: `composables/useMapData.js`.

### `iso-numeric-to-alpha2.json`
ISO 3166-1 numeric country code (string-keyed) → alpha-2 code
(e.g. `"4": "AF"`, `"840": "US"`). Useful for joining numeric-keyed geodata
(e.g. world-atlas TopoJSON ids) to alpha-2-keyed records.

NOTE: currently has NO code consumers in `library/` or `app-profiles/` — kept
as a ready lookup for country-outline / geodata joins.
