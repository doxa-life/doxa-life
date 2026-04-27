# template/src/config/

> **The five mandatory config files plus optional poster configs.** All external configuration lives here; never inline in components (LL-010, LL-012). Contracts documented in [`/docs/configs/`](../../../docs/configs/).

| File | Role | Doc |
|---|---|---|
| `sources.json` | Data source registry + field mappings | [sources-json.md](../../../docs/configs/sources-json.md) |
| `mapConfig.js` | Default Mapbox init (style, center, zoom, projection, layer order) | [map-config.md](../../../docs/configs/map-config.md) |
| `zoom.js` | Region zoom presets, interpolation curves, clustering thresholds, fly durations | [zoom-config.md](../../../docs/configs/zoom-config.md) |
| `colorStrategies.js` | Pluggable color modes — each builds a Mapbox paint expression | [color-strategies.md](../../../docs/configs/color-strategies.md) |
| `colors.js` | Named color constants + palettes (regions, affinity blocks, language families) | [colors-palette.md](../../../docs/configs/colors-palette.md) |
| `posterDefaults.js` | Default poster theme, fonts, paddings — research-map only | (incidentally documented in `/docs/print-export/`) |
| `posterSizes.js` | Page-size table (A3, A4, US Letter, US Tabloid, custom) — research-map only | same |

## Conventions

- One concern per file.
- No imports from Vue, Pinia, or Mapbox in this folder — these are pure data + helper functions.
- Optional domain palettes (e.g. `prayerColors.js`) live next to `colors.js` and are imported by `colorStrategies.js` when needed.

## Cross-references

- Configs catalog → [`/docs/configs/`](../../../docs/configs/)
- Profile-config contract (the outer JSON attribute) → [`/docs/configs/profile-config-contract.md`](../../../docs/configs/profile-config-contract.md)
- Lessons → [LL-010](../../../docs/lessons/LL-010-per-instance-pinia.md), [LL-012](../../../docs/lessons/LL-012-config-folder.md), [LL-029](../../../docs/lessons/LL-029-color-legend-popup-atomic.md)

## Next

To add a new config (e.g. a new color palette), drop a `.js` file here and import it from `colorStrategies.js` if it feeds a color mode. Update [`/docs/configs/`](../../../docs/configs/) with the contract spec.
