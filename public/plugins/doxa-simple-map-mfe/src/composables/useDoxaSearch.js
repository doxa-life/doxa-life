/**
 * useDoxaSearch.js — DOXA local-geocoder search composable
 *
 * Supplements the Mapbox Geocoder (which only knows cities/countries)
 * with results from the DOXA people-groups dataset. Returns matches
 * grouped by four categories: people groups, DOXA-country groupings,
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
 *
 * Returned categories:
 *   { people: [...], places: [...], languages: [...], religions: [...] }
 * Top 5 per category, max 20 total. Mapbox will render the flattened
 * concatenation under its suggestions dropdown.
 */

import { computed } from 'vue'

// ── Emoji prefixes — make DOXA results visually distinct from Mapbox ─────────
const EMOJI_PEOPLE   = '🗺️ '   // people group
const EMOJI_COUNTRY  = '🌍 '   // DOXA country grouping
const EMOJI_LANGUAGE = '🗣️ '   // language family / language
const EMOJI_RELIGION = '🙏 '   // religion / religion family

// ── Score weights ────────────────────────────────────────────────────────────
const SCORE_NAME     = 100
const SCORE_COUNTRY  = 50
const SCORE_RELIGION = 25
const SCORE_LANGUAGE = 10

// ── Caps ─────────────────────────────────────────────────────────────────────
const MAX_PER_CATEGORY = 5
const MAX_TOTAL        = 20

/**
 * Slugify any text for use in a feature id ('doxa-pg-<slug>').
 * Prefer the normalized .slug / .uniqueId when available on the record.
 */
function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Normalize a string for case-insensitive matching.
 * Returns '' for nullish/non-string values.
 */
function norm(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v.toLowerCase()
  if (typeof v === 'object' && 'label' in v) return String(v.label || '').toLowerCase()
  if (typeof v === 'object' && 'value' in v) return String(v.value || '').toLowerCase()
  return String(v).toLowerCase()
}

/**
 * Human-readable label — pulls .label / .value from {value,label} objects,
 * falls back to the string itself, else ''. Used for display-side text
 * (place_name, aggregate labels) to avoid the "[object Object]" bug when
 * pray-tools sends a field as {value, label} rather than a plain string.
 */
function strLabel(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object') return v.label || v.value || ''
  return String(v)
}

/**
 * Build a precomputed search index for the people-groups dataset.
 * Each entry carries four haystack strings (one per match category) plus
 * a combined haystack used for the "all tokens must match" filter.
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

    index.push({
      feature: pg,
      nameHay,
      countryHay,
      religionHay,
      languageHay,
      haystack: nameHay + ' ' + countryHay + ' ' + religionHay + ' ' + languageHay,
      lat,
      lng,
    })
  }
  return index
}

/**
 * Build aggregate lookup tables for the "places / languages / religions"
 * categories. Each aggregate returns a representative center (centroid of
 * its members) plus the count for the place_name display.
 */
function buildAggregates(entries) {
  const aggregate = (keyFn, labelFn) => {
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
      } else {
        map.set(key, {
          key,
          label: strLabel(labelFn(e)) || key,     // strLabel avoids [object Object]
          count: 1,
          lngSum: e.lng,
          latSum: e.lat,
          minLng: e.lng, maxLng: e.lng,
          minLat: e.lat, maxLat: e.lat,
          memberIds: [String(e.feature.uniqueId ?? e.feature.id ?? e.feature.slug ?? '')],
        })
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
    languages: aggregate(
      (e) => norm(e.feature.language) || norm(e.feature.languageFamily),
      (e) => e.feature.language || e.feature.languageFamily || ''
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

  // Tail — "Name, Country — Religion" (omit empty segments gracefully)
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
      ...pg,  // preserve the full original normalized properties
    },
    feature: pg,
  }
}

/**
 * Build a Carmen-GeoJSON feature for a country / language / religion
 * aggregate. These open the map centered on the centroid and do NOT
 * trigger the people-group popup.
 */
function makeAggregateFeature(kind, agg) {
  let emoji, placeType, idPrefix
  switch (kind) {
    case 'country':  emoji = EMOJI_COUNTRY;  placeType = 'doxa-country';  idPrefix = 'doxa-country-'; break
    case 'language': emoji = EMOJI_LANGUAGE; placeType = 'doxa-language'; idPrefix = 'doxa-language-'; break
    case 'religion': emoji = EMOJI_RELIGION; placeType = 'doxa-religion'; idPrefix = 'doxa-religion-'; break
    default:         emoji = '';             placeType = 'doxa';          idPrefix = 'doxa-'
  }
  const label = strLabel(agg.label) || agg.key      // strLabel handles {value,label} objects
  const slug = slugify(agg.key)
  const center = [agg.lng, agg.lat]
  const display = `${label} (${agg.count})`

  return {
    id: `${idPrefix}${slug}`,
    place_name: `${emoji}${display}`,
    text: label,
    center,
    // Pre-computed bounds fit ALL member pins in the map viewport when
    // the aggregate is selected (handler calls map.fitBounds on this).
    bbox: [agg.minLng, agg.minLat, agg.maxLng, agg.maxLat],
    place_type: [placeType],
    geometry: { type: 'Point', coordinates: center },
    properties: {
      slug,
      doxaAggregate: kind,
      count: agg.count,
      label,
      // uniqueIds of every member pin — the dim/highlight filter uses this
      // to show only matching pins at full color and gray out the rest.
      memberIds: agg.memberIds,
      bounds: [agg.minLng, agg.minLat, agg.maxLng, agg.maxLat],
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
 *                                      If omitted, picks the first populated source.
 * @returns {{ search: (query:string)=>Array, searchGrouped: (query:string)=>object }}
 */
export function useDoxaSearch(opts = {}) {
  const { dataStore, dataSourceId } = opts

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
   * Returns results grouped by category. Useful for callers that want to
   * render the groups themselves (e.g. a custom UI above the geocoder).
   */
  function searchGrouped(query) {
    const q = String(query || '').trim().toLowerCase()
    const empty = { people: [], places: [], languages: [], religions: [] }
    if (q.length < 2) return empty

    // Split on whitespace, commas, and semicolons so users can type
    // "Tunisian, Islam" or "Tunisian; Islam" and still get matches.
    const tokens = q.split(/[\s,;]+/).filter(Boolean)
    if (!tokens.length) return empty

    const idx = index.value
    if (!idx.length) return empty
    const aggs = aggregates.value

    // ── People group matches ────────────────────────────────────────────────
    const peopleMatches = []
    for (const entry of idx) {
      // Every token must appear somewhere in the haystack
      let allMatch = true
      for (const tok of tokens) {
        if (!entry.haystack.includes(tok)) { allMatch = false; break }
      }
      if (!allMatch) continue

      // Score — sum per-field when ANY token hits that field.
      // A token-level hit counts once per field (not per token) so that
      // single-word queries and multi-word queries score comparably.
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

    const places    = matchAgg(aggs.countries).map(a => makeAggregateFeature('country',  a))
    const languages = matchAgg(aggs.languages).map(a => makeAggregateFeature('language', a))
    const religions = matchAgg(aggs.religions).map(a => makeAggregateFeature('religion', a))

    return { people: peopleFeatures, places, languages, religions }
  }

  /**
   * Flat array form — this is what MapboxGeocoder's `localGeocoder` option
   * expects. Concatenates the four category arrays in order
   * (people → places → languages → religions) and caps at MAX_TOTAL.
   */
  function search(query) {
    const g = searchGrouped(query)
    return [...g.people, ...g.places, ...g.languages, ...g.religions].slice(0, MAX_TOTAL)
  }

  return { search, searchGrouped, index, aggregates }
}

export default useDoxaSearch
