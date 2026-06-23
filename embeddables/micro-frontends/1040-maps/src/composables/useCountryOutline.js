/**
 * useCountryOutline.js — country boundary OUTLINE overlay on country search.
 *
 * Shared across every map profile (research / countries / simple / homepage).
 * When the user selects a country result from the geocoder, we:
 *   1. resolve the aggregate → its alpha-3 ISO (locale-independent, from the
 *      people-group data — `countryIso` is already alpha-3, e.g. 'IND'),
 *   2. draw an OUTLINE-ONLY line layer from the SAME Mapbox vector tileset the
 *      Regions-tab legend already uses (`mapbox.country-boundaries-v1`), so the
 *      highlight is INSTANT (vector tiles stream from the same CDN as the
 *      basemap and are cached) — no per-country GeoJSON fetch.
 *
 * WHY VECTOR TILES (card aee14dbc): the previous implementation fetched a
 * per-country geoBoundaries ADM0 GeoJSON over the network, which cost ~5s on the
 * first selection and duplicated the country-polygon data the Regions legend
 * already paints from `country-boundaries-v1`. Reusing that one tileset removes
 * the delay AND the duplicate code path — one country-highlight source, used
 * everywhere. Camera framing is the caller's job (every call site already
 * fitBounds() to the country bbox from the search aggregate's `bounds`).
 *
 * The outline is a singleton (one source + one line layer per map). Calling
 * showCountry() again swaps the filter; clearCountry() removes it (wired to the
 * geocoder "clear" + any non-country pick so it disappears when the user clicks
 * elsewhere or clears the search).
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

// Same vector tileset the Regions-tab legend highlights from (see
// useMapLayers.addRegionsLayer). Exposes iso_3166_1_alpha_3 (alpha-3) so we
// match the locale-independent ISO the search aggregate resolves to.
const COUNTRY_BOUNDARIES_URL = 'mapbox://mapbox.country-boundaries-v1'
const SOURCE_LAYER = 'country_boundaries'

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

// The country-boundaries-v1 tileset carries one feature per WORLDVIEW (e.g.
// 'all', 'US', 'CN', 'IN'); without a worldview filter an outline would be
// drawn 2-3× over itself. Mirror the homepage CountryMap.vue filter: keep the
// 'all' worldview plus the US-recognized worldview.
function countryFilter(code) {
  return [
    'all',
    ['==', ['get', 'iso_3166_1_alpha_3'], code],
    ['any', ['==', ['get', 'worldview'], 'all'], ['in', 'US', ['get', 'worldview']]]
  ]
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
      if (m.getLayer(LAYER_ID))   m.removeLayer(LAYER_ID)
      if (m.getSource(SOURCE_ID)) m.removeSource(SOURCE_ID)
    } catch (_) { /* style mid-load — nothing to remove */ }
  }

  /**
   * Draw the country's outline from the country-boundaries vector tileset.
   * INSTANT — no network fetch. Camera framing is the caller's responsibility
   * (every call site already fitBounds() to the aggregate's bbox).
   *
   * @param {string} iso3  alpha-3 ISO (e.g. 'IND')
   */
  function showCountry(iso3) {
    const code = String(iso3 || '').trim().toUpperCase()
    if (code.length !== 3) return

    const m = typeof getMap === 'function' ? getMap() : null
    if (!m) return

    const filter = countryFilter(code)

    // Fast path: source/layer already present from a prior pick — just swap the
    // filter so the highlight moves to the new country with zero teardown.
    if (m.getLayer(LAYER_ID)) {
      try { m.setFilter(LAYER_ID, filter); return } catch (_) { /* fall through to rebuild */ }
    }

    // Swap any stale source, then (re)create the singleton outline layer.
    clearCountry()
    try {
      m.addSource(SOURCE_ID, { type: 'vector', url: COUNTRY_BOUNDARIES_URL })
      m.addLayer({
        id: LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        'source-layer': SOURCE_LAYER,
        filter,
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
      // style not ready — outline is a nice-to-have, never break the search flow.
    }
  }

  return { showCountry, clearCountry }
}

export default useCountryOutline
