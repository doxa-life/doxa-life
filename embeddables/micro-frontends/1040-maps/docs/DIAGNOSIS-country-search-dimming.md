# Diagnosis: country search on Regions tab — no dimming / legend selection

> **Card:** `7899f4f7`. Symptom: searching a COUNTRY while on the WAGF Regions tab
> zooms in but does NOT dim other countries or highlight the country in the legend.
> People-Group search dims fine. **Build/runtime can't run headlessly here
> (COMMIT-LOG §1)** — this bug's crux is a runtime value, so it's diagnosed +
> handed off for repro, not blind-patched (it's a shared handler in a 1900-line
> just-merged .vue; a wrong guess regresses the Regions tab for ALL selections).

## The path (all file refs: `app-profiles/doxa-countries-map/countries-map.vue`)
1. Country geocoder pick → `onGeocoderAggregateResult(evt)`, `evt.kind==='country'` branch (**1692–1724**).
2. `wantIso = _isoForCountryAggregate(evt)` (**1519–1531**) → resolves a people-group from
   `evt.memberIds` (vs `p.uniqueId/id/slug`) or, fallback, `evt.label` (vs `p.countryName/country`,
   lowercased), then returns `String(pg?.countryIso).trim().toUpperCase()` — **`''` if no pg matched**.
3. `goRegions()` (**1702–1711**): `node = wantIso ? _findNodeInTree(regionsTree, n => n.id.startsWith('country:') && (n.isoCodes?.[0]||'').toUpperCase()===wantIso) : null`.
4. **Only if `node` is found** → `onSemanticTreeSelect(node)` (**835/945–974**) applies the pin
   filter + the polygon highlight (regions-fill/border) AND `pplrInstance.selection = node` (legend row).

`onSemanticTreeSelect`'s region/country branch (**945–974**) is CORRECT — it dims (filters pins to
`node.filter`) and highlights polygons via `node.isoCodes`. **So the dim logic works; it's just never
reached** because `node` is `null`.

## Root cause (one of these — needs runtime to disambiguate)
`node === null`, i.e. either:
- **(a) `wantIso === ''`** — `_isoForCountryAggregate` found no people-group:
  - `evt.memberIds` empty AND `evt.label` (which on a non-English locale is the **localized** country
    name) ≠ `p.countryName` (English) → fallback miss. **Most likely on non-en locales.**
  - or `mapData.normalizedPeopleGroups` not yet populated when the search fires (timing).
- **(b) `wantIso` set but no tree node matches** — `regionsTree` country nodes don't carry
  `isoCodes[0]` in alpha-3 uppercase (mismatch vs `countryIso`), or the regions tree isn't built yet
  on first Regions-tab entry (the `switchTab('doxa-regions')` + `ensureRegionsLoaded()` path, **1712–1718**,
  resolves before the tree's legend nodes settle).

## Confirm in a build-capable env (one line)
In `goRegions()` (~**1707**) add temporarily:
`console.debug('[country-search]', { wantIso, evtLabel: evt.label, memberIds: evt.memberIds, node: node?.id, treeLen: regionsTree.value?.length })`
Reproduce: Regions tab → search a country (try en + a non-en locale). The log says which branch fails.

## Candidate fix (apply after the log identifies the branch)
- If **(a) locale label mismatch:** resolve `wantIso` from a locale-independent source — prefer
  `evt.memberIds`/feature `countryIso`, or match `evt.label` against a localized country-name map, not
  only English `p.countryName`. (Mirror how PG search uses the feature's own `uniqueId`, not a label.)
- If **(a) timing:** gate the search handler on `normalizedPeopleGroups.value?.length`, or defer
  `goRegions` until data ready (it already wraps in `ensureRegionsLoaded().finally(nextTick(goRegions))`
  for the tab-switch case — extend that readiness wait to the pg-data case).
- If **(b) tree not ready / iso format:** make `goRegions` robust — when the node lookup fails but
  `wantIso` is set, apply the dim+highlight DIRECTLY from `wantIso` (build `filter = ['==', ['get','countryIso'], wantIso]`
  and `isoCodes = [wantIso]`, then run the same setFilter + regions-fill/border paint as
  `onSemanticTreeSelect`'s country branch), and still set `pplrInstance.selection` if a node later exists.
  This makes search-pick independent of tree-build timing.

## Recommendation
Runtime-repro the one debug line to pick the branch, then apply the matching candidate fix above and
`npm run dev`-verify (en + non-en locale, Regions tab). Do NOT land a blind guess into the shared
`onSemanticTreeSelect`/geocoder path.
