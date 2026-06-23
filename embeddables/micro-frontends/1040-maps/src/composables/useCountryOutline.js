/**
 * useCountryOutline.js — country boundary OUTLINE overlay on country search.
 *
 * Shared across every map profile (research / countries / simple / homepage).
 * When the user selects a country result from the geocoder, we:
 *   1. resolve the aggregate → its alpha-3 ISO (locale-independent, from the
 *      people-group data — `countryIso` is already alpha-3, e.g. 'IND'),
 *   2. fetch that country's ADM0 boundary from geoBoundaries (gbOpen,
 *      simplified — same data source the my-upg-100-list admin-2 layer uses,
 *      just the ADM0 level instead of ADM2),
 *   3. draw an OUTLINE-ONLY line layer (no fill, so the underlying pins /
 *      basemap data stay visible), and
 *   4. fitBounds to the country's bounding box.
 *
 * The outline is a singleton (one source + one line layer per map). Calling
 * showCountry() again swaps it; clearCountry() removes it (wired to the
 * geocoder "clear" + any non-country pick so it disappears when the user
 * clicks elsewhere or clears the search).
 *
 * Usage:
 *   const outline = useCountryOutline(() => map.value)
 *   const iso = resolveCountryIso(evt, normalizedPeopleGroups)
 *   outline.showCountry(iso)
 *   ...
 *   outline.clearCountry()
 */

const SOURCE_ID = 'doxa-country-outline'
const LAYER_ID  = 'doxa-country-outline-line'

// gbOpen ADM0 simplified — pinned to the same geoBoundaries commit the
// admin-2 (ADM2) loader uses, so the whole app draws from one frozen release.
const GEOBOUNDARIES_COMMIT = '9469f09592ced973a3448cf66b6100b741b64c0d'
function adm0Url(iso3) {
  return `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/${GEOBOUNDARIES_COMMIT}/releaseData/gbOpen/${iso3}/ADM0/geoBoundaries-${iso3}-ADM0_simplified.geojson`
}

// Module-level cache: a country's ADM0 GeoJSON is identical across every map
// instance and never changes, so fetch each ISO at most once per page load.
const ADM0_CACHE = {}

/**
 * Resolve a doxa-country search aggregate to its alpha-3 ISO using the
 * normalized people-group data. Matches on the aggregate's memberIds first
 * (the exact pins it was built from), then falls back to the canonical
 * countryName/country field. Both keys are locale-INDEPENDENT, so the lookup
 * never depends on the active UI locale or a translated country label.
 *
 * @param {object} evt  the @aggregate-result payload (has .memberIds, .label)
 * @param {Array}  pgs  normalized people-groups (each has .countryIso alpha-3)
 * @returns {string} alpha-3 ISO uppercased, or '' if unresolved
 */
export function resolveCountryIso(evt, pgs) {
  if (!evt) return ''
  const list = Array.isArray(pgs) ? pgs : []
  const ids = Array.isArray(evt.memberIds) ? evt.memberIds.map(String) : []
  const idSet = new Set(ids)
  let pg = ids.length
    ? list.find(p => idSet.has(String(p.uniqueId ?? p.id ?? p.slug ?? '')))
    : null
  if (!pg) {
    const want = String(evt.label ?? '').toLowerCase()
    pg = list.find(p => String(p.countryName ?? p.country ?? '').toLowerCase() === want)
  }
  return String(pg?.countryIso ?? '').trim().toUpperCase()
}

// Walk every coordinate in a GeoJSON FeatureCollection and accumulate a bbox.
function bboxOfFeatureCollection(fc) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  const walk = (coords) => {
    if (!Array.isArray(coords)) return
    if (typeof coords[0] === 'number') {
      const [lng, lat] = coords
      if (lng < minLng) minLng = lng
      if (lat < minLat) minLat = lat
      if (lng > maxLng) maxLng = lng
      if (lat > maxLat) maxLat = lat
      return
    }
    for (const c of coords) walk(c)
  }
  for (const f of fc?.features || []) {
    if (f?.geometry?.coordinates) walk(f.geometry.coordinates)
  }
  return Number.isFinite(minLng) ? [minLng, minLat, maxLng, maxLat] : null
}

async function fetchAdm0(iso3) {
  if (ADM0_CACHE[iso3]) return ADM0_CACHE[iso3]
  const r = await fetch(adm0Url(iso3))
  if (!r.ok) throw new Error(`geoBoundaries ADM0 ${iso3}: HTTP ${r.status}`)
  const fc = await r.json()
  ADM0_CACHE[iso3] = fc
  return fc
}

/**
 * @param {() => any} getMap  returns the mapbox-gl Map instance (or null)
 * @param {object} [opts]
 * @param {string} [opts.lineColor='#2563eb']
 * @param {number} [opts.lineWidth=2.5]
 * @param {number} [opts.lineOpacity=0.8]
 */
export function useCountryOutline(getMap, opts = {}) {
  const lineColor   = opts.lineColor   ?? '#2563eb'
  const lineWidth   = opts.lineWidth   ?? 2.5
  const lineOpacity = opts.lineOpacity ?? 0.8

  function clearCountry() {
    const m = typeof getMap === 'function' ? getMap() : null
    if (!m) return
    try {
      if (m.getLayer(LAYER_ID))  m.removeLayer(LAYER_ID)
      if (m.getSource(SOURCE_ID)) m.removeSource(SOURCE_ID)
    } catch (_) { /* style mid-load — nothing to remove */ }
  }

  /**
   * Draw the country's ADM0 outline + fit the camera to its bounding box.
   * @param {string} iso3  alpha-3 ISO (e.g. 'IND')
   * @param {object} [o]
   * @param {boolean} [o.fit=true]  fitBounds to the country bbox
   */
  async function showCountry(iso3, o = {}) {
    const code = String(iso3 || '').trim().toUpperCase()
    if (code.length !== 3) return
    const fit = o.fit !== false

    let fc
    try {
      fc = await fetchAdm0(code)
    } catch (e) {
      // Network / 404 — outline is a nice-to-have, never break the search flow.
      if (typeof console !== 'undefined') console.warn('[country-outline]', e?.message || e)
      return
    }

    const m = typeof getMap === 'function' ? getMap() : null
    if (!m) return

    // Swap any existing outline (different country, or re-pick).
    clearCountry()
    try {
      m.addSource(SOURCE_ID, { type: 'geojson', data: fc })
      m.addLayer({
        id: LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        // Outline only — no fill layer — so pins / labels under the country
        // stay fully visible (Driver spec: "just an outline/border").
        paint: {
          'line-color': lineColor,
          'line-width': lineWidth,
          'line-opacity': lineOpacity,
        },
      })
    } catch (_) {
      return // style not ready — skip silently
    }

    if (fit) {
      const bbox = bboxOfFeatureCollection(fc)
      if (bbox) {
        const [minLng, minLat, maxLng, maxLat] = bbox
        try {
          m.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, duration: 1000 })
        } catch (_) { /* degenerate bounds */ }
      }
    }
  }

  return { showCountry, clearCountry }
}

export default useCountryOutline
