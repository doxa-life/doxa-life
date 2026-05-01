/**
 * useDoxaSearch.js — Local geocoder search composable
 *
 * Supplements the Mapbox Geocoder (which only knows cities/countries)
 * with results from the local people-groups dataset. Returns matches
 * grouped by four categories: people groups, country groupings,
 * languages, and religions.
 *
 * Usage:
 *   const { search } = useDoxaSearch({ dataStore, dataSourceId })
 *   // Pass `search` as `localGeocoder` option to MapboxGeocoder:
 *   new MapboxGeocoder({ accessToken, localGeocoder: search })
 *
 * Ranking (higher = better):
 *   - name-match     score 100  (people group name)
 *   - country-match  score 50
 *   - religion-match score 25
 *   - language-match score 10
 *
 * Tokenization: the query is whitespace-split and ALL tokens must appear
 * in a record's haystack. "India Muslim" matches records whose combined
 * (name+country+language+religion) text contains both tokens.
 *
 * Feature shape returned follows the Carmen-GeoJSON format expected by
 * mapbox-gl-geocoder:
 *   https://github.com/mapbox/carmen/blob/master/carmen-geojson.md
 */

import { computed } from 'vue'
import langFamilyByLanguage from '../data/langFamilyByLanguage.json'

// ── Emoji prefixes — make local results visually distinct from Mapbox ────────
const EMOJI_PEOPLE   = '🗺️ '   // people group
const EMOJI_COUNTRY  = '🌍 '   // country grouping
const EMOJI_FAMILY   = '🌳 '   // language family
const EMOJI_LANGUAGE = '🗣️ '   // language
const EMOJI_DIALECT  = '💬 '   // dialect / variety
const EMOJI_RELIGION = '🙏 '   // religion / religion family

// ── Score weights ────────────────────────────────────────────────────────────
const SCORE_NAME     = 100
const SCORE_COUNTRY  = 50
const SCORE_RELIGION = 25
const SCORE_LANGUAGE = 10

// ── Caps ─────────────────────────────────────────────────────────────────────
const MAX_PER_CATEGORY = 5
const MAX_TOTAL        = 20

// ── Base-language + dialect parsing (mirrors useLanguageFamilyLegendData rules)
// Per QA building-round-1 R2 A1: each individual sign language is its own
// language; "Pakistan Sign Language" stays whole as the base. The suffix
// regex is reserved for FAMILY resolution only (see resolveFamily below).
// "Arabic, Shihhi" → base "Arabic", dialect "Shihhi"
// "Pakistan Sign Language" → base "Pakistan Sign Language", dialect null
// "Bengali" → base "Bengali", dialect null
const FAMILY_SUFFIXES = [
  [/ sign language$/i, 'Sign Language'],
]
function readBaseLanguage(label) {
  if (!label || typeof label !== 'string') return ''
  const comma = label.indexOf(',')
  if (comma > 0) return label.slice(0, comma).trim()
  return label.trim()
}
function readDialectLabel(label) {
  if (!label || typeof label !== 'string') return null
  const comma = label.indexOf(',')
  if (comma >= 0) return label.slice(comma + 1).trim() || null
  return null
}

// ── Family lookup (same comma-inversion logic as useLanguageFamilyLegendData) ─
function resolveFamily(label) {
  if (!label || typeof label !== 'string') return null
  const parts = label.split(',').map(s => s.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const fullReversed = [...parts].reverse().join(' ')
    if (langFamilyByLanguage[fullReversed]) return langFamilyByLanguage[fullReversed]
    if (parts.length >= 3) {
      const twoReversed = [parts[1], parts[0]].join(' ')
      if (langFamilyByLanguage[twoReversed]) return langFamilyByLanguage[twoReversed]
    }
  }
  if (langFamilyByLanguage[label]) return langFamilyByLanguage[label]
  const stripped = label.replace(/\s*\(.*?\)\s*$/, '').trim()
  if (stripped !== label && langFamilyByLanguage[stripped]) return langFamilyByLanguage[stripped]
  // FAMILY_SUFFIXES fallback so sign-language pins agree with the legend's
  // family bucketing (e.g. "Pakistan Sign Language" → "Sign Language" family).
  for (const [re, base] of FAMILY_SUFFIXES) {
    if (re.test(label)) return base
  }
  return null
}

// ── Section-header feature (non-clickable visual divider in suggestions) ──────
function makeSectionHeader(label, isAllData) {
  return {
    id: `doxa-section-header-${slugify(label)}`,
    place_name: label,
    text: label,
    center: [0, 0],
    place_type: ['doxa-section-header'],
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: { headerLabel: label, isHeader: true, isAllDataSection: !!isAllData },
    feature: null
  }
}

/**
 * Slugify any text for use in a feature id ('doxa-pg-<slug>').
 */
function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Normalize a string for case-insensitive matching.
 */
function norm(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v.toLowerCase()
  if (typeof v === 'object' && 'label' in v) return String(v.label || '').toLowerCase()
  if (typeof v === 'object' && 'value' in v) return String(v.value || '').toLowerCase()
  return String(v).toLowerCase()
}

/**
 * Human-readable label — pulls .label / .value from {value,label} objects.
 */
function strLabel(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object') return v.label || v.value || ''
  return String(v)
}

/**
 * Build a precomputed search index for the people-groups dataset.
 */
function buildIndex(features) {
  if (!Array.isArray(features)) return []
  const index = []
  for (const pg of features) {
    if (!pg) continue
    const lat = Number(pg.latitude)
    const lng = Number(pg.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

    const nameHay     = norm(pg.name) + ' ' + norm(pg.displayName) + ' ' + norm(pg.alternateName)
    const countryHay  = norm(pg.countryName) + ' ' + norm(pg.country) + ' ' + norm(pg.countryIso) + ' ' + norm(pg.countryIsoLabel)
    const religionHay = norm(pg.religionName) + ' ' + norm(pg.religion) + ' ' + norm(pg.religionLabel) + ' ' + norm(pg.religionCode)
    const languageHay = norm(pg.language) + ' ' + norm(pg.languageFamily) + ' ' + norm(pg.languageCode)

    // Pull the comma-inverted label from _raw first (the original API form,
    // e.g. "Arabic, Sudanese") — pg.language can be overwritten by useMapData.
    const rawLang = pg._raw?.primary_language ?? pg._raw?.PrimaryLanguage
    const langLabel = (rawLang && (typeof rawLang === 'object' ? (rawLang.label || rawLang.value) : rawLang))
      || strLabel(pg.language) || strLabel(pg.primaryLanguage) || ''
    const baseLang     = readBaseLanguage(langLabel)
    const dialectLabel = readDialectLabel(langLabel)
    index.push({
      feature: pg,
      nameHay,
      countryHay,
      religionHay,
      languageHay,
      haystack: nameHay + ' ' + countryHay + ' ' + religionHay + ' ' + languageHay,
      lat,
      lng,
      familyDerived: resolveFamily(langLabel) || null,
      languageLabel: langLabel,
      baseLang,
      dialectLabel,
    })
  }
  return index
}

/**
 * Build aggregate lookup tables for the "places / languages / religions"
 * categories.
 */
function buildAggregates(entries) {
  // extraFn(bucket, entry, isNew) lets a caller stash extra per-bucket data
  // (e.g. originalLabels for dialect aggregates).
  const aggregate = (keyFn, labelFn, extraFn) => {
    const map = new Map()
    for (const e of entries) {
      const key = keyFn(e)
      if (!key) continue
      const existing = map.get(key)
      if (existing) {
        existing.count += 1
        existing.lngSum += e.lng
        existing.latSum += e.lat
        existing.memberIds.push(String(e.feature.uniqueId ?? e.feature.id ?? e.feature.slug ?? ''))
        existing.minLng = Math.min(existing.minLng, e.lng)
        existing.maxLng = Math.max(existing.maxLng, e.lng)
        existing.minLat = Math.min(existing.minLat, e.lat)
        existing.maxLat = Math.max(existing.maxLat, e.lat)
        if (extraFn) extraFn(existing, e, false)
      } else {
        const v = {
          key,
          label: strLabel(labelFn(e)) || key,
          count: 1,
          lngSum: e.lng,
          latSum: e.lat,
          minLng: e.lng, maxLng: e.lng,
          minLat: e.lat, maxLat: e.lat,
          memberIds: [String(e.feature.uniqueId ?? e.feature.id ?? e.feature.slug ?? '')],
        }
        if (extraFn) extraFn(v, e, true)
        map.set(key, v)
      }
    }
    // finalize centroids
    for (const v of map.values()) {
      v.lng = v.lngSum / v.count
      v.lat = v.latSum / v.count
    }
    return Array.from(map.values())
  }

  return {
    countries: aggregate(
      (e) => norm(e.feature.countryName) || norm(e.feature.country) || norm(e.feature.countryIso),
      (e) => e.feature.countryName || e.feature.country || e.feature.countryIso || ''
    ),
    // Language families — derived from primary_language via langFamilyByLanguage lookup
    families: aggregate(
      (e) => norm(e.familyDerived),
      (e) => e.familyDerived || ''
    ),
    // Languages — keyed by BASE language (e.g. "Arabic" not "Arabic, Sudanese")
    // so a search for "Arabic" matches one row covering all Arabic dialects.
    languages: aggregate(
      (e) => norm(e.baseLang),
      (e) => e.baseLang || ''
    ),
    // Dialects — only entries that have a dialectLabel; keyed by base+dialect
    // so "Arabic, Sudanese" and "Sign Language, Pakistan" each get their own row.
    // originalLabels accumulates the raw API labels needed to filter pins exactly.
    dialects: aggregate(
      (e) => e.dialectLabel ? `${norm(e.baseLang)}__${norm(e.dialectLabel)}` : '',
      (e) => `${e.baseLang}, ${e.dialectLabel}`,
      (bucket, e, isNew) => {
        if (isNew) {
          bucket.originalLabels = new Set([e.languageLabel])
          bucket.familyDerived  = e.familyDerived || ''
          bucket.baseLang       = e.baseLang || ''
          bucket.dialectLabel   = e.dialectLabel || ''
        } else {
          bucket.originalLabels.add(e.languageLabel)
          // Keep the first non-empty family in case some pins lack the lookup.
          if (!bucket.familyDerived && e.familyDerived) bucket.familyDerived = e.familyDerived
        }
      }
    ),
    religions: aggregate(
      (e) => norm(e.feature.religionName) || norm(e.feature.religion),
      (e) => e.feature.religionName || e.feature.religion || ''
    ),
  }
}

/**
 * Build a Carmen-GeoJSON feature for a single people group.
 */
function makePeopleFeature(entry) {
  const pg = entry.feature
  const name = pg.name || pg.displayName || pg.slug || 'Unknown'
  const country = pg.countryName || pg.country || pg.countryIso || ''
  const religion = pg.religionName || pg.religion || ''
  const slug = pg.slug || pg.uniqueId || slugify(name + '-' + country)
  const center = [entry.lng, entry.lat]

  const tail = [country, religion].filter(Boolean).join(' — ')
  const label = tail ? `${name}, ${tail}` : name

  return {
    id: `doxa-pg-${slug}`,
    place_name: `${EMOJI_PEOPLE}${label}`,
    text: name,
    center,
    place_type: ['people-group'],
    geometry: { type: 'Point', coordinates: center },
    properties: {
      slug,
      ...pg,
    },
    feature: pg,
  }
}

/**
 * Build a Carmen-GeoJSON feature for a country / language / religion aggregate.
 */
function makeAggregateFeature(kind, agg) {
  let emoji, placeType, idPrefix
  switch (kind) {
    case 'country':         emoji = EMOJI_COUNTRY;  placeType = 'doxa-country';         idPrefix = 'doxa-country-';         break
    case 'language-family': emoji = EMOJI_FAMILY;   placeType = 'doxa-language-family'; idPrefix = 'doxa-language-family-'; break
    case 'language':        emoji = EMOJI_LANGUAGE; placeType = 'doxa-language';        idPrefix = 'doxa-language-';        break
    case 'dialect':         emoji = EMOJI_DIALECT;  placeType = 'doxa-dialect';         idPrefix = 'doxa-dialect-';         break
    case 'religion':        emoji = EMOJI_RELIGION; placeType = 'doxa-religion';        idPrefix = 'doxa-religion-';        break
    default:                emoji = '';             placeType = 'doxa';                 idPrefix = 'doxa-'
  }
  const label = strLabel(agg.label) || agg.key
  const slug = slugify(agg.key)
  const center = [agg.lng, agg.lat]
  const display = `${label} (${agg.count})`

  // Dialect features carry originalLabels + familyDerived so the geocoder
  // result handler in research-map.vue can build a legend-matching dialect key
  // and filter pins on the exact API language string.
  const originalLabels = agg.originalLabels ? Array.from(agg.originalLabels) : undefined
  const dialectExtra = (kind === 'dialect') ? {
    familyDerived: agg.familyDerived || '',
    baseLang:      agg.baseLang || '',
    dialectLabel:  agg.dialectLabel || '',
  } : null

  return {
    id: `${idPrefix}${slug}`,
    place_name: `${emoji}${display}`,
    text: label,
    center,
    bbox: [agg.minLng, agg.minLat, agg.maxLng, agg.maxLat],
    place_type: [placeType],
    geometry: { type: 'Point', coordinates: center },
    properties: {
      slug,
      doxaAggregate: kind,
      count: agg.count,
      label,
      memberIds: agg.memberIds,
      bounds: [agg.minLng, agg.minLat, agg.maxLng, agg.maxLat],
      ...(originalLabels ? { originalLabels } : {}),
      ...(dialectExtra || {}),
    },
    feature: null,
  }
}

/**
 * Main composable.
 *
 * @param {object} opts
 * @param {object} opts.dataStore  Pinia data store (useDataStore())
 * @param {string} [opts.dataSourceId]  Source id to read features from.
 * @returns {{ search: (query:string)=>Array, searchGrouped: (query:string)=>object }}
 */
export function useDoxaSearch(opts = {}) {
  const { dataStore, dataSourceId, getActiveFilter } = opts

  // ── Select the active source's features reactively ─────────────────────────
  const features = computed(() => {
    if (!dataStore || !dataStore.sources) return []
    if (dataSourceId && dataStore.sources[dataSourceId]?.features) {
      return dataStore.sources[dataSourceId].features
    }
    // Fallback: first source that has features
    for (const id of Object.keys(dataStore.sources)) {
      const src = dataStore.sources[id]
      if (src?.features?.length) return src.features
    }
    return []
  })

  // ── Precomputed index + aggregates — rebuild when features change ──────────
  const index = computed(() => buildIndex(features.value))
  const aggregates = computed(() => buildAggregates(index.value))

  /**
   * Returns results grouped by category.
   */
  function searchGrouped(query) {
    const q = String(query || '').trim().toLowerCase()
    const empty = { people: [], places: [], families: [], languages: [], dialects: [], religions: [] }
    if (q.length < 2) return empty

    const tokens = q.split(/[\s,;]+/).filter(Boolean)
    if (!tokens.length) return empty

    const idx = index.value
    if (!idx.length) return empty
    const aggs = aggregates.value

    // ── People group matches ────────────────────────────────────────────────
    const peopleMatches = []
    for (const entry of idx) {
      let allMatch = true
      for (const tok of tokens) {
        if (!entry.haystack.includes(tok)) { allMatch = false; break }
      }
      if (!allMatch) continue

      let score = 0
      if (tokens.some(t => entry.nameHay.includes(t)))     score += SCORE_NAME
      if (tokens.some(t => entry.countryHay.includes(t)))  score += SCORE_COUNTRY
      if (tokens.some(t => entry.religionHay.includes(t))) score += SCORE_RELIGION
      if (tokens.some(t => entry.languageHay.includes(t))) score += SCORE_LANGUAGE

      peopleMatches.push({ entry, score })
    }
    peopleMatches.sort((a, b) => b.score - a.score)
    const peopleFeatures = peopleMatches
      .slice(0, MAX_PER_CATEGORY)
      .map(m => makePeopleFeature(m.entry))

    // ── Aggregate matches (country / language / religion) ───────────────────
    const matchAgg = (bucket) =>
      bucket
        .filter(a => tokens.every(t => a.key.includes(t) || norm(a.label).includes(t)))
        .sort((a, b) => b.count - a.count)
        .slice(0, MAX_PER_CATEGORY)

    const places    = matchAgg(aggs.countries).map(a => makeAggregateFeature('country',         a))
    const families  = matchAgg(aggs.families ).map(a => makeAggregateFeature('language-family', a))
    const languages = matchAgg(aggs.languages).map(a => makeAggregateFeature('language',        a))
    const dialects  = matchAgg(aggs.dialects ).map(a => makeAggregateFeature('dialect',         a))
    const religions = matchAgg(aggs.religions).map(a => makeAggregateFeature('religion',        a))

    return { people: peopleFeatures, places, families, languages, dialects, religions }
  }

  /**
   * Flat array form — what MapboxGeocoder's `localGeocoder` option expects.
   * When getActiveFilter is provided and returns a live selection, results are
   * split into two labelled sections: "Within [selection]" and "All DOXA Data".
   * Section header features (place_type: doxa-section-header) are injected as
   * visual dividers; clicking them is suppressed in GeocoderComponent.vue.
   * "All DOXA Data" results carry properties._allDataSection = true so the
   * geocoder handler knows to deselect the legend when they are clicked.
   */
  function search(query) {
    const activeFilter = typeof getActiveFilter === 'function' ? getActiveFilter() : null
    const g = searchGrouped(query)
    // Order: family → language → dialect (semantic-tree top-down) before places/religions.
    const allFlat = [...g.people, ...g.families, ...g.languages, ...g.dialects, ...g.places, ...g.religions]

    if (!activeFilter?.key || !allFlat.length) {
      return allFlat.slice(0, MAX_TOTAL)
    }

    // Split people-group results into "within selection" and "outside"
    const withinPeople = []
    const outsidePeople = []
    for (const feat of g.people) {
      const entry = index.value.find(e => e.feature === feat.feature)
      let matches = false
      if (entry) {
        if (activeFilter.kind === 'family') {
          matches = (entry.familyDerived || '').toLowerCase() === activeFilter.key.toLowerCase()
        } else if (activeFilter.kind === 'language') {
          matches = entry.languageLabel.toLowerCase() === activeFilter.key.toLowerCase()
        }
      }
      if (matches) withinPeople.push(feat)
      else outsidePeople.push(feat)
    }

    // Build sectioned output
    const result = []
    const selectionLabel = activeFilter.key
    if (withinPeople.length) {
      result.push(makeSectionHeader('Within ' + selectionLabel, false))
      result.push(...withinPeople.slice(0, MAX_PER_CATEGORY))
    }
    // "All DOXA Data" section: tag all results so geocoder handler can deselect legend
    const allTagged = allFlat.map(f => ({
      ...f,
      properties: { ...f.properties, _allDataSection: true }
    }))
    result.push(makeSectionHeader('All DOXA Data', true))
    result.push(...allTagged.slice(0, MAX_PER_CATEGORY))

    return result.slice(0, MAX_TOTAL + 4) // extra room for the 2 header features
  }

  return { search, searchGrouped, index, aggregates }
}

export default useDoxaSearch
