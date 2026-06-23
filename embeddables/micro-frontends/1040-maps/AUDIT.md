# 1040-maps Template — Audit Report

> Card: `a1c93774` (portfolio `1040m`, lane `bt`). **Document-only pass — no fixes applied.**
> Generated 2026-06-22. Scope: `src/`, `app-profiles/`, root. `node_modules/` excluded.

## Summary

The template is reasonably well-structured (clear `src/` seams: `components/`, `composables/`,
`stores/`, `config/`, `api-connections/`, `utils/`, `data/`, `i18n/`). The main debt is
**leftover back-compat shims from two refactors (Round 1C + the api-connections seam, card #25)**,
**one large near-duplicate profile clone**, **several oversized files**, and **root-level scratch
clutter**. No tests exist. None of these block builds; all are cleanup candidates.

---

## 1. Back-compat shims left after refactors — HIGH (architecture clarity)

Four files are now pure re-export shims pointing at their new canonical homes. LK10X builder
convention is "no back-compat shims unless explicitly requested — delete unused code rather than
deprecate-then-keep." Each shim should be removed *after* migrating its remaining consumers.

| Shim (old path) | Canonical target | Remaining consumers of the old path |
|---|---|---|
| `src/utils/apiBaseUrl.js` | `src/api-connections/apiBaseUrl.js` | `src/components/PeopleGroupDetail.vue:115` |
| `src/utils/DataSourceManager.js` | `src/api-connections/DataSourceManager.js` | `app-profiles/doxa-countries-map/profiles/countries-map.vue:125`, `app-profiles/doxa-research-map/profiles/research-map.vue:120`, `app-profiles/doxa-simple-map/profiles/doxa-simple-map.vue:18`, `app-profiles/my-upg-100-list/profiles/research-map-clone.vue:117` |
| `src/config/colorStrategies.js` | `src/config/color-strategies/_registry.js` | none found (likely deletable now) |
| `src/config/mapConfig.js` | `src/config/mapDefaults.js` | (grep for `config/mapConfig` before deleting) |

**Suggested fix (later card):** repoint the ~5 import sites to canonical paths, delete the 4 shims,
then grep to confirm zero remaining references. `colorStrategies.js` appears to have no consumers
and may be deletable immediately.

## 2. `research-map-clone.vue` — large near-duplicate — HIGH (duplicate logic)

`app-profiles/my-upg-100-list/profiles/research-map-clone.vue` (2066 lines) is an ~80% copy of
`app-profiles/doxa-research-map/profiles/research-map.vue` (2091 lines) — only ~420 lines differ.
Two 2000-line files that must be kept in sync is the single biggest maintenance hazard here; bug
fixes to one (e.g. the recent country-search / zoom-cap fixes) silently miss the other.

**Suggested fix (later card):** extract the shared map shell into a composable or a shared
profile base, leaving each profile to declare only its differences. Until then, treat any
research-map fix as a two-file change.

## 3. Oversized files — MEDIUM (readability / single-responsibility)

Files past ~600 lines are hard to reason about and likely mix concerns:

| Lines | File |
|---|---|
| 1022 | `src/components/SemanticTreeLegend.vue` |
| 999 | `src/stores/uiStore.js` |
| 799 | `src/composables/useMapLayers.js` |
| 704 | `src/stores/mapStore.js` |
| 682 | `src/composables/useMapClustering.js` |
| 672 | `src/components/PeopleGroupDetail.vue` |
| 664 | `src/components/LegendMobile.vue` |
| 615 | `src/composables/useMapFly.js` |

(The two ~2000-line profile `.vue` files in §2 dwarf these but are tracked separately.)
`uiStore.js` at ~1000 lines is the strongest candidate to split by concern (legend UI / drawer /
poster / theme).

## 4. Root-level scratch clutter — MEDIUM (organization)

Ephemeral builder scratch is committed at the template root instead of `docs/` or `.lk10x/`:

- `BUILDER-NOTE-countries-map.md`
- `BUILDER-NOTE-countries-map-STATUS.md`
- `BUILDER-NOTE-desktop-only-minzoom.md`
- `.lk10x-builder-output.md`  ← note: lives at root, *outside* the gitignored `.lk10x/` dir, so it is tracked

**Suggested fix:** move the `BUILDER-NOTE-*` files into `docs/` (or delete once their content is
folded into `WIKI.md` / `CONTRIBUTING.md`), and move `.lk10x-builder-output.md` into `.lk10x/`
so it is covered by the existing gitignore rule.

## 5. No tests — MEDIUM (template quality)

No `*.test.js` / `*.spec.js` files and no test runner in `package.json` scripts. For a template
meant to be copied and reused, the clustering utils (`MSTClusteringUtil.js`,
`NetworkClusteringUtil.js`, `ClusterHelpers.js`) and `geoUtils.js` are pure-function units that
would benefit most from a small Vitest suite.

## 6. Domain-specific hardcoding marked TODO — LOW (template genericity)

6 TODO/FIXME markers in `src/`, most flag DOXA-specific values that should be config-injected so
the template stays generic:

- `src/composables/useLegendData.js:27` — hardcoded palettes; override via config injection
- `src/composables/useMapEvents.js:70` — hardcoded `uupg.doxa.life` people-group URL
- `src/components/LegendMobile.vue:399` — DOXA CSV-specific `_raw.ImageURL` fallback
- `src/composables/useMapInstance.js:197` — Mapbox token env-var naming note
- `src/composables/useMapPoster.js:27` — unwired package.json deps note
- `src/components/LegendDesktop.vue:307` — **"Implement export functionality"** (unfinished feature)

## 7. Minor

- **`app/.gitkeep` missing** — `.gitignore` ignores `app/` but whitelists `!app/.gitkeep`, which
  does not exist. The `app/` dir currently holds two regenerable build bundles
  (`doxa-research-map.js` 1.2 MB, `doxa-simple-map.js` 374 KB) that are correctly ignored; add the
  `.gitkeep` so the empty dir is preserved on clean checkouts.
- **Naming inconsistency** — `api-connections/` and `color-strategies/` use kebab-case dirs while
  the rest of `src/` uses flat camelCase filenames. Acceptable, but worth a one-line note in
  `CONTRIBUTING.md` so future files follow a deliberate convention.

---

## Recommended follow-up cards (do-not-fix-now backlog)

1. **Kill the 4 back-compat shims** (§1) — migrate ~5 import sites, delete shims, verify with grep.
2. **De-duplicate `research-map-clone.vue`** (§2) — extract a shared base from `research-map.vue`.
3. **Split `uiStore.js` and `SemanticTreeLegend.vue`** (§3) by concern.
4. **Relocate root scratch notes** (§4) into `docs/` and `.lk10x/`.
5. **Add a minimal Vitest suite** (§5) for the clustering + geo utils.
