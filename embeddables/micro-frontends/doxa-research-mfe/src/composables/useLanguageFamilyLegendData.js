/**
 * useLanguageFamilyLegendData — language-family legend rows with
 * carat/expand semantics ported from the OLD doxa-map-app-widget legend
 * onto the NEW LegendRows CSS-table chrome.
 *
 * RESPONSIBILITIES
 *   - Aggregate the normalized people-groups feature collection by language
 *     family, then by language within each family.
 *   - Sort families AND languages-within-a-family by:
 *       1) people-group count DESC
 *       2) population DESC
 *   - Track per-family expand/collapse state (default: ALL collapsed).
 *   - Emit a `legend:highlight` window event when a row is clicked, carrying
 *     `{ kind: 'family' | 'language' | 'cluster', familyKey?, languageKey?,
 *        clusterId?, pinIds }`. The map listener (research-map.vue) is OUT
 *     OF SCOPE here — this composable only EMITS, never dims.
 *
 * CLUSTER-READY
 *   - The `LegendRow` shape carries an optional `clusterId` field. If a row
 *     surfaces a `clusterId`, it is treated as a cluster row: kind === 'cluster'
 *     in the highlight event, and downstream LegendFamilyTree paints a small
 *     cluster icon next to the count. The composable itself never invents a
 *     clusterId — that's the upstream aggregator's job. We just don't paint
 *     into a corner.
 *
 * USAGE
 *   const {
 *     rows, toggle, isExpanded, childRowsFor, highlight
 *   } = useLanguageFamilyLegendData(peopleGroupsRef, { aggregator })
 *
 *   - `peopleGroupsRef`: a `Ref<Array<NormalizedPeopleGroup>>` — typically
 *     `dataStore.sources[activeId].features` mapped through the framework's
 *     normalization. Each member must expose at least:
 *         { id, properties: { primary_language, language_family, population } }
 *     Falls back to `_raw.LanguageFamily` / `_raw.PrimaryLanguage` /
 *     `_raw.Population` when the normalized fields are absent.
 *   - `aggregator` (optional): the name of the active language-family
 *     aggregation method. Reserved for future use ("derive from primary
 *     language" vs "use API-provided family field" vs "cluster-aware"). The
 *     default is 'auto', which uses `language_family` if present and
 *     otherwise treats every distinct language as its own family.
 */

import { computed, reactive } from 'vue'
import { getLanguageFamilyColor, LANGUAGE_FAMILY_COLORS, canonicalFamilyName } from '../config/colors.js'

// ─────────────────────────────────────────────────────────────────────────────
// Field readers — defensive against the four shapes we currently see in the
// wild: GeoJSON.features[i].properties, plain rows, and DOXA `_raw`.
// FRICTION: the API may not group by family natively — we derive it here.
// ─────────────────────────────────────────────────────────────────────────────
function readProps(item) {
  return item?.properties || item || {}
}
// pray-tools API returns {value,label} objects for many fields. Unwrap to label
// when present, fall through to whatever string is there otherwise.
function unwrap(v) {
  if (v && typeof v === 'object' && 'label' in v) return v.label || v.value || ''
  return v
}
function readFamily(p) {
  const v = p.language_family ?? p.languageFamily ?? p._raw?.LanguageFamily ?? p._raw?.language_family
  const s = unwrap(v)
  // Bucket key MUST be deterministic case-canonical so "Sign Language" and
  // "Sign language" merge into one row (UX 2026-04-27).
  return canonicalFamilyName(s) || 'Unknown'
}
function readLanguage(p) {
  const v = p.primary_language ?? p.primaryLanguage ?? p._raw?.PrimaryLanguage ?? p._raw?.primary_language
  const s = unwrap(v)
  return (s && String(s).trim()) || '— Unknown —'
}
function readPopulation(p) {
  const v = p.population ?? p._raw?.Population ?? p._raw?.population ?? 0
  return parseInt(v, 10) || 0
}
function readPinId(item, p) {
  return item?.id ?? p.id ?? p.peopleGroupId ?? p._raw?.PeopleID3 ?? p._raw?.PeopleID ?? null
}
function readClusterId(item, p) {
  // Reserved hook — the aggregator (cluster engine) sets this when it ships.
  return item?.clusterId ?? p.clusterId ?? null
}
// Pull lat/lng from any of the shapes data passes through.
function readCoord(item, p) {
  const lat = parseFloat(p.latitude ?? p.lat ?? p._raw?.Latitude ?? p._raw?.latitude)
  const lng = parseFloat(p.longitude ?? p.lng ?? p._raw?.Longitude ?? p._raw?.longitude)
  if (!isFinite(lat) || !isFinite(lng)) return null
  return [lng, lat] // GeoJSON / Mapbox order: [lng, lat]
}

// Sort comparator: people-group count DESC, then population DESC.
// FRICTION: tiebreaker behavior when both count and population match is
// implementation-defined here (stable insertion order — relies on V8/JS
// engine stability).
function byCountThenPop(a, b) {
  if (b.peopleGroupCount !== a.peopleGroupCount) return b.peopleGroupCount - a.peopleGroupCount
  return (b.population || 0) - (a.population || 0)
}
// Languages within a family sort by population DESC (per UX request).
function byPopulation(a, b) {
  if ((b.population || 0) !== (a.population || 0)) return (b.population || 0) - (a.population || 0)
  return b.peopleGroupCount - a.peopleGroupCount
}

/**
 * @typedef {Object} LegendRow
 * @property {string} key                     stable row key (familyKey, languageKey, or clusterId)
 * @property {string} label                   displayed name
 * @property {string} color                   pill background color
 * @property {number} peopleGroupCount        number of people groups under this row
 * @property {number} population              summed population
 * @property {'family'|'language'|'cluster'} kind
 * @property {string} [familyKey]             for kind: 'language' rows, the parent family
 * @property {string} [clusterId]             when set, render the cluster icon and emit kind: 'cluster'
 * @property {string[]} pinIds                pin IDs the map should highlight when this row is clicked
 */

export function useLanguageFamilyLegendData(peopleGroupsRef, options = {}) {
  // Reserved for future cluster-aware / API-native family aggregation.
  // eslint-disable-next-line no-unused-vars
  const aggregator = options.aggregator ?? 'auto'

  // ── Expanded family state — default: ALL COLLAPSED (per requirements §2) ──
  // reactive plain object keyed by familyKey → boolean.
  const expanded = reactive({})

  function isExpanded(familyKey) {
    return !!expanded[familyKey]
  }
  function toggle(familyKey) {
    expanded[familyKey] = !expanded[familyKey]
  }

  // ── Aggregation: feature[] → Map<familyKey, { language → bucket }> ────────
  // bucket = { peopleGroupCount, population, pinIds, languages: Map<langKey, bucket> }
  const aggregated = computed(() => {
    const features = peopleGroupsRef?.value || []
    const families = new Map()

    for (const item of features) {
      const p = readProps(item)
      const familyKey = readFamily(p)
      const langKey = readLanguage(p)
      const pop = readPopulation(p)
      const pinId = readPinId(item, p)
      const clusterId = readClusterId(item, p)

      let fam = families.get(familyKey)
      if (!fam) {
        fam = {
          key: familyKey,
          peopleGroupCount: 0,
          population: 0,
          pinIds: [],
          coords: [],
          clusterId: null,
          languages: new Map()
        }
        families.set(familyKey, fam)
      }
      fam.peopleGroupCount += 1
      fam.population += pop
      if (pinId != null) fam.pinIds.push(pinId)
      const c = readCoord(item, p)
      if (c) fam.coords.push(c)
      // First non-null clusterId wins for the family bucket. The cluster
      // engine, when it lands, will be responsible for ensuring all features
      // in a single cluster carry the same id — this is just a placeholder.
      if (clusterId && !fam.clusterId) fam.clusterId = clusterId

      let lang = fam.languages.get(langKey)
      if (!lang) {
        lang = {
          key: langKey,
          peopleGroupCount: 0,
          population: 0,
          pinIds: [],
          coords: [],
          clusterId: null
        }
        fam.languages.set(langKey, lang)
      }
      lang.peopleGroupCount += 1
      lang.population += pop
      if (pinId != null) lang.pinIds.push(pinId)
      if (c) lang.coords.push(c)
      if (clusterId && !lang.clusterId) lang.clusterId = clusterId
    }

    return families
  })

  // ── Top-level family rows, sorted by (count DESC, population DESC) ────────
  // When `showAllKnown` is true (default), every family in LANGUAGE_FAMILY_COLORS
  // appears in the legend even if zero people-groups currently match — the
  // expand-caret then opens to an empty list rather than the family being
  // missing entirely. Useful for global comparison views.
  const showAllKnown = options.showAllKnown !== false
  const rows = computed(() => {
    const families = aggregated.value
    const list = []
    const seen = new Set()
    for (const fam of families.values()) {
      list.push({
        key: fam.key,
        label: fam.key,
        color: getLanguageFamilyColor(fam.key),
        peopleGroupCount: fam.peopleGroupCount,
        population: fam.population,
        kind: fam.clusterId ? 'cluster' : 'family',
        clusterId: fam.clusterId || undefined,
        pinIds: fam.pinIds,
        coords: fam.coords
      })
      seen.add(fam.key)
    }
    if (showAllKnown) {
      for (const familyName of Object.keys(LANGUAGE_FAMILY_COLORS)) {
        if (seen.has(familyName)) continue
        list.push({
          key: familyName,
          label: familyName,
          color: getLanguageFamilyColor(familyName),
          peopleGroupCount: 0,
          population: 0,
          kind: 'family',
          pinIds: [],
          coords: []
        })
      }
    }
    list.sort(byCountThenPop)
    return list
  })

  // ── Language rows for a given family — same sort order ────────────────────
  function childRowsFor(familyKey) {
    const fam = aggregated.value.get(familyKey)
    if (!fam) return []
    const out = []
    for (const lang of fam.languages.values()) {
      out.push({
        key: `${familyKey}__${lang.key}`,
        label: lang.key,
        color: getLanguageFamilyColor(familyKey),
        peopleGroupCount: lang.peopleGroupCount,
        population: lang.population,
        kind: lang.clusterId ? 'cluster' : 'language',
        familyKey,
        clusterId: lang.clusterId || undefined,
        pinIds: lang.pinIds,
        coords: lang.coords
      })
    }
    out.sort(byPopulation)
    return out
  }

  // ── highlight — fires the legend:highlight window event ───────────────────
  // The map listener (research-map.vue) is responsible for dimming non-matching
  // pins. This composable's contract is only to emit the event.
  function highlight(rowOrKey) {
    let row = rowOrKey
    if (typeof rowOrKey === 'string') {
      // Allow callers to pass a familyKey directly (top-level row shortcut)
      row = rows.value.find(r => r.key === rowOrKey)
      if (!row) return
    }
    const detail = {
      kind: row.kind,
      pinIds: row.pinIds || [],
      coords: row.coords || []
    }
    if (row.kind === 'family')   detail.familyKey   = row.label
    if (row.kind === 'language') {
      detail.languageKey = row.label
      detail.familyKey   = row.familyKey
    }
    if (row.kind === 'cluster')  detail.clusterId   = row.clusterId

    if (typeof window !== 'undefined' && typeof window.CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('legend:highlight', { detail }))
    }
  }

  return { rows, toggle, isExpanded, childRowsFor, highlight }
}
