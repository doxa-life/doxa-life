/**
 * useLegendData — builds a unified, data-driven legend item tree
 * for ANY legend type from a single declarative config map.
 *
 * Each legend type produces an array of LegendItem:
 *   { key, label, color, count?, population?, filterKey?, children?: LegendItem[] }
 *
 * The composable reads from injected Pinia stores (dataStore, uiStore, mapStore)
 * so it works identically in both Desktop and Mobile legend shells.
 *
 * USAGE:
 *   const { items, columns, title, activeFilter, setFilter, totalCount, totalPopulation }
 *     = useLegendData(props.legendType)
 */

import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { PRAYER_COLORS, getPrayerLevel, FULL_PRAYER_THRESHOLD } from '../config/prayerColors.js'
import { ENGAGEMENT_COLORS, ADOPTION_COLORS } from '../config/colorStrategies.js'
import { LANGUAGE_FAMILY_COLORS, getLanguageFamilyColor, RESOURCE_COLORS, RESOURCE_NAMES } from '../config/colors.js'
import { useLanguageFamilyLegendData } from './useLanguageFamilyLegendData.js'

const COLUMNS_SIMPLE = [] // e.g. affinity-blocs — no numeric columns

// ─── Region / Bloc color palettes ──────────────────────────────────────────────
// TODO: domain-specific. Override these palettes via config injection if your
// app uses different region or affinity-bloc names.
const DOXA_REGION_COLORS = {
  'Africa': '#e74c3c', 'Asia': '#3498db', 'Europe': '#2ecc71',
  'Latin America & Caribbean': '#f39c12', 'Middle East': '#9b59b6',
  'No WAGF Region/Bloc': '#95a5a6', 'North America & Non-Spanish Caribbean': '#1abc9c',
  'Oceania': '#e67e22'
}

const AFFINITY_BLOC_COLORS = {
  'Arab World': '#3aac4c', 'Deaf': '#FFFFFF', 'East Asian Peoples': '#f7ee6a',
  'Eurasian Peoples': '#ffefbd', 'Horn of Africa Peoples': '#d37429',
  'Jews': '#710f11', 'Latin-Caribbean Americans': '#e61e24',
  'Malay Peoples': '#acd566', 'North American Peoples': '#f87d80',
  'Pacific Islanders': '#418c71', 'Persian-Median': '#20306c',
  'South Asian Peoples': '#a7892f', 'Southeast Asian Peoples': '#e84e21',
  'Sub-Saharan Peoples': '#9e4821', 'Tibetan-Himalayan Peoples': '#426eb5',
  'Turkic Peoples': '#b57bb5'
}

// ─── Helper: scan all loaded sources for features matching a predicate ────────
function scanFeatures(dataStore, filterFn) {
  const allSources = Object.values(dataStore.sources || {})
  const features = allSources.flatMap(src => src?.features || [])
  const matched = features.filter(item => filterFn(item.properties || item))
  return {
    count: matched.length,
    population: matched.reduce((sum, item) => {
      const p = item.properties || item
      return sum + (parseInt(p.population || p._raw?.Population || 0) || 0)
    }, 0)
  }
}

// ─── Engagement / Adoption checkers ───────────────────────────────────────────
function checkHasEngagement(props) {
  const val = props.engagementStatus ?? props._raw?.people_committed
  return val === true || val === 1 || val === '1' || val === 'true'
      || (typeof val === 'number' && val > 0)
      || (typeof val === 'string' && parseInt(val, 10) > 0)
}
function checkHasAdoption(props) {
  const val = props.adoptionStatus ?? props._raw?.adopted_by_churches
  return val === true || val === 1 || val === '1' || val === 'true'
      || (typeof val === 'number' && val > 0)
      || (typeof val === 'string' && parseInt(val, 10) > 0)
}

// ─── Title i18n-key map ───────────────────────────────────────────────────────
// Maps legend type → i18n key under `legend.title.*`.
const TITLE_KEYS = {
  'prayer':            'legend.title.prayer',
  'engagement':        'legend.title.engagement',
  'adoption':          'legend.title.adoption',
  'language-families': 'legend.title.languageFamilies',
  // 'language-family' (singular) is the NEW expand/collapse tree variant —
  // its rows come from useLanguageFamilyLegendData. Title falls back to the
  // plural i18n key so existing translations work.
  'language-family':   'legend.title.languageFamilies',
  'doxa-regions':      'legend.title.doxaRegions',
  // Alias: research-map profile uses 'doxa-region' (singular) for symmetry
  // with 'language-family'. Resolved to the same data path below.
  'doxa-region':       'legend.title.doxaRegions',
  'affinity-blocs':    'legend.title.affinityBlocs',
  'gospel-resources':  'legend.title.gospelResources'
}

// ─── Legend-type alias normalizer ─────────────────────────────────────────────
// Profiles may use either singular or plural forms; normalize so the items
// computed below can use a single canonical key per type.
function normalizeLegendType(t) {
  if (t === 'doxa-region') return 'doxa-regions'
  return t
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function fmtPop(pop) {
  if (!pop) return '0'
  if (pop >= 1_000_000) return (pop / 1_000_000).toFixed(1) + 'M'
  if (pop >= 1_000)     return (pop / 1_000).toFixed(1) + 'K'
  return pop.toLocaleString()
}
function fmtCount(n) { return (Number(n) || 0).toLocaleString() }

// ═══════════════════════════════════════════════════════════════════════════════
// Main composable
// ═══════════════════════════════════════════════════════════════════════════════
export function useLegendData(legendTypeRef) {
  const dataStore = inject('dataStore')
  const uiStore   = inject('uiStore')
  const mapStore  = inject('mapStore')
  const { t: $t } = useI18n()

  // ── Title ─────────────────────────────────────────────────────────────────
  const title = computed(() => {
    const key = TITLE_KEYS[legendTypeRef.value]
    return key ? $t(key) : ''
  })

  // ── Columns ───────────────────────────────────────────────────────────────
  // Column labels translated at read-time so locale switches re-render headers.
  const columns = computed(() => {
    const type = normalizeLegendType(legendTypeRef.value)
    if (type === 'affinity-blocs') return COLUMNS_SIMPLE
    return [
      { key: 'count',      label: $t('legend.columns.upgs'),       width: 48 },
      { key: 'population', label: $t('legend.columns.population'), width: 48 }
    ]
  })

  // ── Active filter key (for highlight ring on selected row) ────────────────
  const activeFilter = computed(() => {
    const t = normalizeLegendType(legendTypeRef.value)
    if (t === 'prayer')     return uiStore.prayerFilter
    if (t === 'engagement') return uiStore.engagementFilter
    if (t === 'adoption')   return uiStore.adoptionFilter
    if (t === 'language-families') return mapStore.selectedFamily
    if (t === 'doxa-regions')     return mapStore.selectedRegion
    if (t === 'gospel-resources') return mapStore.selectedResource
    return null
  })

  // ── Set filter (called when a row is clicked) ─────────────────────────────
  function setFilter(filterKey) {
    const t = normalizeLegendType(legendTypeRef.value)
    if (t === 'prayer') {
      uiStore.setPrayerFilter(uiStore.prayerFilter === filterKey ? null : filterKey)
    } else if (t === 'engagement') {
      uiStore.setEngagementFilter(uiStore.engagementFilter === filterKey ? null : filterKey)
    } else if (t === 'adoption') {
      uiStore.setAdoptionFilter(uiStore.adoptionFilter === filterKey ? null : filterKey)
    } else if (t === 'language-families') {
      mapStore.selectFamily(mapStore.selectedFamily === filterKey ? null : filterKey)
    } else if (t === 'doxa-regions') {
      mapStore.selectRegion(mapStore.selectedRegion === filterKey ? null : filterKey)
    } else if (t === 'gospel-resources') {
      mapStore.selectResource(mapStore.selectedResource === filterKey ? null : filterKey)
    }
  }

  // ── Items tree ────────────────────────────────────────────────────────────
  const items = computed(() => {
    const t = normalizeLegendType(legendTypeRef.value)

    // ── Prayer (3-tier: parent + 2 children) ────────────────────────────────
    if (t === 'prayer') {
      const no   = scanFeatures(dataStore, p => getPrayerLevel(p) === 'noPrayer')
      const has  = scanFeatures(dataStore, p => getPrayerLevel(p) === 'hasPrayer')
      const full = scanFeatures(dataStore, p => getPrayerLevel(p) === 'fullPrayer')
      return [{
        key: 'noPrayer', label: $t('legend.prayer.needsPrayer'), color: PRAYER_COLORS.noPrayer,
        count: no.count, population: no.population, filterKey: 'noPrayer',
        children: [
          { key: 'hasPrayer', label: $t('legend.prayer.hasPrayer'), color: PRAYER_COLORS.hasPrayer,
            count: has.count, population: has.population, filterKey: 'hasPrayer' },
          { key: 'fullPrayer', label: $t('legend.prayer.fullPrayerCoverage'), color: PRAYER_COLORS.fullPrayer,
            count: full.count, population: full.population, filterKey: 'fullPrayer' }
        ]
      }]
    }

    // ── Engagement (binary parent/child) ────────────────────────────────────
    if (t === 'engagement') {
      const no  = scanFeatures(dataStore, p => !checkHasEngagement(p))
      const has = scanFeatures(dataStore, p => checkHasEngagement(p))
      return [{
        key: 'notEngaged', label: $t('legend.engagement.needsEngagement'), color: ENGAGEMENT_COLORS.notEngaged,
        count: no.count, population: no.population, filterKey: 'notEngaged',
        children: [
          { key: 'hasEngagement', label: $t('legend.engagement.hasEngagement'), color: ENGAGEMENT_COLORS.hasEngagement,
            count: has.count, population: has.population, filterKey: 'hasEngagement' }
        ]
      }]
    }

    // ── Adoption (binary parent/child) ──────────────────────────────────────
    if (t === 'adoption') {
      const no  = scanFeatures(dataStore, p => !checkHasAdoption(p))
      const has = scanFeatures(dataStore, p => checkHasAdoption(p))
      return [{
        key: 'notAdopted', label: $t('legend.adoption.needsAdoption'), color: ADOPTION_COLORS.notAdopted,
        count: no.count, population: no.population, filterKey: 'notAdopted',
        children: [
          { key: 'hasAdoption', label: $t('legend.adoption.hasAdoption'), color: ADOPTION_COLORS.hasAdoption,
            count: has.count, population: has.population, filterKey: 'hasAdoption' }
        ]
      }]
    }

    // ── Language Families (flat list, each is a "parent" with no children) ───
    if (t === 'language-families') {
      return (dataStore.languageFamiliesData || []).map(f => ({
        key: f.name, label: f.name, color: getLanguageFamilyColor(f.name),
        count: f.count, population: f.population, filterKey: f.name,
        children: []
      }))
    }

    // ── Language Family TREE (singular) — delegate row construction to the
    // dedicated composable. The returned shape is the LegendRow shape from
    // useLanguageFamilyLegendData ({ peopleGroupCount, ..., kind, pinIds }).
    // LegendDesktop / LegendMobile branch on `legendType === 'language-family'`
    // BEFORE consuming items, so this is a fallback for any caller that still
    // reads `items` directly (e.g. a custom host).
    if (t === 'language-family') {
      const features = Object.values(dataStore.sources || {})
        .flatMap(src => src?.features || [])
      const featuresRef = { value: features }
      const { rows: famRows } = useLanguageFamilyLegendData(featuresRef)
      return famRows.value.map(r => ({
        key: r.key, label: r.label, color: r.color,
        count: r.peopleGroupCount, population: r.population,
        filterKey: r.key, children: []
      }))
    }

    // ── Doxa Regions (flat) ─────────────────────────────────────────────────
    if (t === 'doxa-regions') {
      return (dataStore.doxaRegionsData || []).map(r => ({
        key: r.name, label: r.name, color: DOXA_REGION_COLORS[r.name] || '#999',
        count: r.count, population: r.population, filterKey: r.name,
        children: []
      }))
    }

    // ── Gospel Resources (parent/child tree) ────────────────────────────────
    if (t === 'gospel-resources') {
      const resources = dataStore.resourcesData || []
      return Object.keys(RESOURCE_COLORS).map(rKey => {
        const data = resources.find(r => r.key === rKey)
        return {
          key: rKey, label: RESOURCE_NAMES[rKey] || rKey, color: RESOURCE_COLORS[rKey],
          count: data?.count || 0, population: data?.population || 0, filterKey: rKey,
          children: (data?.children || []).map(c => ({
            key: c.key, label: c.name || c.key, color: c.color || RESOURCE_COLORS[rKey],
            count: c.count || 0, population: c.population || 0, filterKey: c.key
          }))
        }
      })
    }

    // ── Affinity Blocs (flat, no counts) ────────────────────────────────────
    if (t === 'affinity-blocs') {
      return Object.keys(AFFINITY_BLOC_COLORS).map(b => ({
        key: b, label: b, color: AFFINITY_BLOC_COLORS[b], filterKey: b, children: []
      }))
    }

    return []
  })

  // ── Totals ────────────────────────────────────────────────────────────────
  function sumTree(arr, field) {
    return arr.reduce((s, item) => {
      let v = item[field] || 0
      if (item.children?.length) v += sumTree(item.children, field)
      return s + v
    }, 0)
  }
  const totalCount      = computed(() => sumTree(items.value, 'count'))
  const totalPopulation = computed(() => sumTree(items.value, 'population'))

  return {
    items, columns, title, activeFilter, setFilter,
    totalCount, totalPopulation,
    fmtPop, fmtCount
  }
}
