/**
 * researchLegendOptions.js — research-mfe-only options passed to the shared
 * useLegendData composable in @/composables/useLegendData.js.
 *
 * Houses the research-specific legend variants that don't belong in the shared
 * blueprint:
 *   - legendTypeAliases: research uses singular `doxa-region` interchangeably
 *     with the canonical plural `doxa-regions`
 *   - customItemBuilders['language-family']: research-only expand/collapse
 *     tree variant that delegates row construction to useLanguageFamilyLegendData
 */
import { useLanguageFamilyLegendData } from './useLanguageFamilyLegendData.js'
import { getLanguageFamilyColor, RESOURCE_COLORS, RESOURCE_NAMES, DOXA_REGION_COLORS } from '../config/colors.js'

export const RESEARCH_LEGEND_OPTIONS = {
  legendTypeAliases: {
    'doxa-region': 'doxa-regions'
  },
  colorsApi: {
    getLanguageFamilyColor,
    resourceColors: RESOURCE_COLORS,
    resourceNames:  RESOURCE_NAMES
  },
  customItemBuilders: {
    'language-family': ({ dataStore }) => {
      const features = Object.values(dataStore.sources || {})
        .flatMap(src => src?.features || [])
      const featuresRef = { value: features }
      const { rows: famRows } = useLanguageFamilyLegendData(featuresRef)
      return famRows.value.map(r => ({
        key: r.key,
        label: r.label,
        color: r.color,
        count: r.peopleGroupCount,
        population: r.population,
        filterKey: r.key,
        // coords + pinIds carry through so Auto-Fly tour and the legend:highlight
        // event handler can fit-bounds onto each family during iteration.
        coords: r.coords || [],
        pinIds: r.pinIds || [],
        children: []
      }))
    },
    // Doxa Regions tab — show ALL known regions even if zero people-groups
    // currently match (seeded from DOXA_REGION_COLORS), with live counts
    // populated from whatever sources are loaded into dataStore.
    'doxa-regions': ({ dataStore }) => {
      const features = Object.values(dataStore.sources || {})
        .flatMap(src => src?.features || [])
      // Map lowercase / snake_case region keys (e.g. pray-tools `wagf_region.value`
      // = "asia", "latin_america_&_caribbean", "na") onto the canonical
      // DOXA_REGION_COLORS keys so we don't end up with duplicate rows for the
      // same region. Normalize both sides to lowercase-alphanumeric so "asia"
      // and "Asia" collapse, and "latin_america_&_caribbean" matches
      // "Latin America & Caribbean".
      const normalizeKey = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
      const REGION_KEY_ALIASES = {}
      for (const canonical of Object.keys(DOXA_REGION_COLORS)) {
        REGION_KEY_ALIASES[normalizeKey(canonical)] = canonical
      }
      // pray-tools' "na" (label "N/A") = "No WAGF Region/Bloc"
      REGION_KEY_ALIASES['na'] = 'No WAGF Region/Bloc'
      const canonicalize = (raw) => {
        if (!raw) return ''
        const trimmed = String(raw).trim()
        return REGION_KEY_ALIASES[normalizeKey(trimmed)] || trimmed
      }
      const agg = new Map()
      for (const item of features) {
        const p = item?.properties || item || {}
        // pray-tools normalizes wagf_region → doxaRegion; might be {value,label}
        let raw = p.doxaRegion ?? p.wagfRegion ?? p._raw?.['WAGF Region']
        if (raw && typeof raw === 'object') raw = raw.label || raw.value
        const key = canonicalize(raw)
        if (!key) continue
        const pop = parseInt(p.population ?? p._raw?.Pop ?? 0, 10) || 0
        const lat = parseFloat(p.latitude ?? p._raw?.Latitude)
        const lng = parseFloat(p.longitude ?? p._raw?.Longitude)
        let bucket = agg.get(key)
        if (!bucket) { bucket = { count: 0, population: 0, coords: [] }; agg.set(key, bucket) }
        bucket.count += 1
        bucket.population += pop
        if (isFinite(lat) && isFinite(lng)) bucket.coords.push([lng, lat])
      }
      const rows = []
      const seen = new Set()
      for (const [name, b] of agg) {
        rows.push({
          key: name, label: name, color: DOXA_REGION_COLORS[name] || '#999',
          count: b.count, population: b.population, filterKey: name,
          coords: b.coords, children: []
        })
        seen.add(name)
      }
      // Seed remaining known regions with 0 counts so the legend is a stable
      // canonical list regardless of which subset of regions the data covers.
      for (const name of Object.keys(DOXA_REGION_COLORS)) {
        if (seen.has(name)) continue
        rows.push({
          key: name, label: name, color: DOXA_REGION_COLORS[name],
          count: 0, population: 0, filterKey: name, coords: [], children: []
        })
      }
      rows.sort((a, b) => (b.count - a.count) || (b.population - a.population))
      return rows
    }
  }
}
