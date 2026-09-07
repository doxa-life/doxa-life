// Shared, framework-agnostic helpers for the region and country pages
// (/regions, /regions/<region>, /regions/<country>). Imported by app pages, the
// /api/countries and /api/regions server routes, and the build-time prerender
// module (modules/region-routes.ts), so it must stay free of any Nuxt/Nitro
// runtime imports.
//
// People-group records carry an ISO-3 country code (e.g. "IND") plus a
// localized country label, a WAGF region, lat/lng, and the progress fields the
// dashboards report on (adoption, prayer commitments, engagement status,
// population). Records are grouped by country to produce one CountrySummary per
// country: a stable English-name slug for the URL, the localized display name,
// the WAGF region, progress stats, and a map view (center + zoom) framed on the
// country's pins with a little breathing room so neighbouring countries stay
// visible. Countries are then grouped by WAGF region to produce one
// RegionSummary per region with the same progress stats rolled up.

import { COUNTRIES } from '../app/utils/countries'

/** Fields requested from the prayer API's people-groups list for these summaries. */
export const PEOPLE_GROUP_LIST_FIELDS = 'country_code,wagf_region,latitude,longitude,population,adopted_by_churches,people_committed,engagement_status'

/** A people group counts as fully covered once this many people commit to daily prayer. */
export const FULL_PRAYER_COVERAGE_COUNT = 100

export interface PeopleGroupLite {
  country_code?: { value: string, label: string } | null
  wagf_region?: { value: string, label: string } | null
  latitude?: string | number | null
  longitude?: string | number | null
  population?: string | number | null
  adopted_by_churches?: number | null
  people_committed?: string | number | null
  engagement_status?: { value: string, label: string } | null
}

/**
 * Map bounds [[west, south], [east, north]] framing a set of pins. East may
 * exceed 180 when the box crosses the antimeridian (e.g. Oceania), which Mapbox
 * accepts as a continuous longitude range.
 */
export type MapBounds = [[number, number], [number, number]]

/** Progress figures shared by country and region summaries. */
export interface ProgressStats {
  /** Number of people groups. */
  count: number
  /** Combined population of the people groups. */
  population: number
  /** People groups adopted by at least one church. */
  adopted: number
  /** People groups whose engagement status is "engaged". */
  engaged: number
  /** People groups with at least one person committed to daily prayer. */
  withPrayer: number
  /** People groups with FULL_PRAYER_COVERAGE_COUNT or more people committed. */
  withFullPrayer: number
  /** Total people committed to daily prayer across the people groups. */
  peopleCommitted: number
}

export interface CountrySummary extends ProgressStats {
  /** English-name slug used in the URL, e.g. "papua-new-guinea". */
  slug: string
  /** ISO-3 country code, e.g. "PNG". */
  code: string
  /** Localized display name (from the people-groups API `lang` param). */
  name: string
  /** WAGF region the country belongs to. */
  region: { value: string, label: string }
  /** Map center [lng, lat]. */
  center: [number, number]
  /** Map zoom level. */
  zoom: number
  /** Bounds of the country's pins; null when no record has coordinates. */
  bounds: MapBounds | null
}

export interface RegionSummary extends ProgressStats {
  /** Slug derived from the region's stable value, e.g. "middle-east". */
  slug: string
  /** Raw WAGF region value, e.g. "middle_east". Empty when records carry no region. */
  value: string
  /** Localized region label. Empty when records carry no region. */
  label: string
  /** Number of countries with people groups in this region. */
  countryCount: number
  /** Map center [lng, lat]. */
  center: [number, number]
  /** Map zoom level. */
  zoom: number
  /** Bounds of the region's pins; null when no record has coordinates. */
  bounds: MapBounds | null
  /** Countries in the region, sorted by name. */
  countries: CountrySummary[]
}

// ISO-3 → canonical English name, the basis for slugs. Sourced from the same
// country list the rest of the app uses so slugs stay consistent and locale-
// independent (a French page is still /fr/regions/india, not /fr/regions/inde).
const ENGLISH_NAME_BY_CODE = new Map(COUNTRIES.map(c => [c.value, c.label]))

export function slugify(name: string): string {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/['’.]/g, '') // drop apostrophes / periods (Côte d'Ivoire → cote-divoire)
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-') // any run of non-alphanumerics → single hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
}

// Slug for a country code. Prefers the canonical English name; falls back to a
// provided label (and finally the raw code) for any code not in the master list.
export function countrySlug(code: string, fallbackLabel?: string): string {
  return slugify(ENGLISH_NAME_BY_CODE.get(code) || fallbackLabel || code)
}

// Slug for a WAGF region. Derived from the stable value rather than the
// localized label so every locale shares one URL (e.g. "middle_east" →
// "middle-east", "latin_america_&_caribbean" → "latin-america-and-caribbean").
// Records with no region fall under "other".
export function regionSlug(value: string): string {
  return slugify(value) || 'other'
}

function toNumber(value: string | number | null | undefined): number {
  const n = typeof value === 'string' ? parseFloat(value) : (value ?? 0)
  return Number.isNaN(n) ? 0 : n
}

function emptyStats(): ProgressStats {
  return { count: 0, population: 0, adopted: 0, engaged: 0, withPrayer: 0, withFullPrayer: 0, peopleCommitted: 0 }
}

function addToStats(stats: ProgressStats, p: PeopleGroupLite): void {
  const committed = toNumber(p.people_committed)
  stats.count++
  stats.population += toNumber(p.population)
  if ((p.adopted_by_churches ?? 0) > 0) stats.adopted++
  if (p.engagement_status?.value === 'engaged') stats.engaged++
  if (committed > 0) stats.withPrayer++
  if (committed >= FULL_PRAYER_COVERAGE_COUNT) stats.withFullPrayer++
  stats.peopleCommitted += committed
}

// Pin coordinates collected for a fit-bounds map view.
interface PinBounds { lats: number[], lngs: number[] }

function addPin(bounds: PinBounds, p: PeopleGroupLite): void {
  const lat = typeof p.latitude === 'string' ? parseFloat(p.latitude) : p.latitude
  const lng = typeof p.longitude === 'string' ? parseFloat(p.longitude) : p.longitude
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    bounds.lats.push(lat)
    bounds.lngs.push(lng)
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

// Web-Mercator latitude in radians, used by the fit-bounds zoom math.
function latRad(lat: number): number {
  const s = Math.sin((lat * Math.PI) / 180)
  return Math.log((1 + s) / (1 - s)) / 2
}

// Compute a map center + zoom that frames the given bounding box. Zooms out
// slightly beyond a tight fit so surrounding countries remain in view (the
// whole point of the country page's map). The viewport dimensions are an
// approximation of the map slot; exact framing isn't important because the
// map keeps its own pan/zoom controls.
function fitView(minLng: number, minLat: number, maxLng: number, maxLat: number): { center: [number, number], zoom: number } {
  const WORLD_DIM = 512
  const VIEW_W = 1000
  const VIEW_H = 560
  const MAX_ZOOM = 6
  const MIN_ZOOM = 1.6
  const NEIGHBOUR_PADDING = 0.6 // zoom out this much so neighbours stay visible

  const latFraction = Math.max((latRad(maxLat) - latRad(minLat)) / Math.PI, 1e-6)
  let lngDiff = maxLng - minLng
  if (lngDiff < 0) lngDiff += 360
  const lngFraction = Math.max(lngDiff / 360, 1e-6)

  const latZoom = Math.log2(VIEW_H / WORLD_DIM / latFraction)
  const lngZoom = Math.log2(VIEW_W / WORLD_DIM / lngFraction)

  let zoom = Math.min(latZoom, lngZoom, MAX_ZOOM) - NEIGHBOUR_PADDING
  zoom = Math.max(MIN_ZOOM, Math.min(zoom, MAX_ZOOM))

  return {
    center: [round((minLng + maxLng) / 2), round((minLat + maxLat) / 2)],
    zoom: round(zoom)
  }
}

// Longitude extent covering all pins along the shortest arc: sorts the
// longitudes, finds the largest gap between neighbours (including the
// wrap-around gap past 180), and spans everything else. When the extent
// crosses the antimeridian the east edge exceeds 180 so the range stays
// continuous.
function lngExtent(lngs: number[]): [number, number] {
  const sorted = [...lngs].sort((a, b) => a - b)
  const last = sorted.length - 1
  let gapStart = last
  let maxGap = sorted[0]! + 360 - sorted[last]!
  for (let i = 0; i < last; i++) {
    const gap = sorted[i + 1]! - sorted[i]!
    if (gap > maxGap) {
      maxGap = gap
      gapStart = i
    }
  }
  if (gapStart === last) return [sorted[0]!, sorted[last]!]
  return [sorted[gapStart + 1]!, sorted[gapStart]! + 360]
}

// Default whole-world view for a set of records with no coordinates.
const WORLD_VIEW: MapView = { center: [20, 10], zoom: 1.8, bounds: null }

interface MapView { center: [number, number], zoom: number, bounds: MapBounds | null }

function viewFor(pins: PinBounds): MapView {
  if (pins.lats.length === 0) return WORLD_VIEW
  const [west, east] = lngExtent(pins.lngs)
  const south = Math.min(...pins.lats)
  const north = Math.max(...pins.lats)
  return { ...fitView(west, south, east, north), bounds: [[west, south], [east, north]] }
}

// Group people-group records into one summary per country, sorted by name.
export function summarizeCountries(posts: PeopleGroupLite[]): CountrySummary[] {
  const groups = new Map<string, {
    name: string
    region: { value: string, label: string }
    pins: PinBounds
    stats: ProgressStats
  }>()

  for (const p of posts) {
    const code = p.country_code?.value
    if (!code) continue

    let g = groups.get(code)
    if (!g) {
      g = { name: p.country_code!.label, region: { value: '', label: '' }, pins: { lats: [], lngs: [] }, stats: emptyStats() }
      groups.set(code, g)
    }
    // A few records carry no region; the country takes the first region seen.
    if (!g.region.value && p.wagf_region?.value) g.region = p.wagf_region
    addToStats(g.stats, p)
    addPin(g.pins, p)
  }

  const out: CountrySummary[] = []
  for (const [code, g] of groups) {
    const view = viewFor(g.pins)
    out.push({
      slug: countrySlug(code, g.name),
      code,
      name: g.name,
      region: g.region,
      center: view.center,
      zoom: view.zoom,
      bounds: view.bounds,
      ...g.stats
    })
  }

  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

// Group people-group records into one summary per WAGF region, sorted by label.
// Each people group rolls up under its country's region, so the region totals,
// the per-country rows and the map's in-region pins all agree.
export function summarizeRegions(posts: PeopleGroupLite[]): RegionSummary[] {
  const countries = summarizeCountries(posts)
  const regionSlugByCountry = new Map(countries.map(c => [c.code, regionSlug(c.region.value)]))

  const groups = new Map<string, {
    value: string
    label: string
    countries: CountrySummary[]
    pins: PinBounds
    stats: ProgressStats
  }>()

  for (const c of countries) {
    const slug = regionSlugByCountry.get(c.code)!
    let g = groups.get(slug)
    if (!g) {
      g = { value: c.region.value, label: c.region.label, countries: [], pins: { lats: [], lngs: [] }, stats: emptyStats() }
      groups.set(slug, g)
    }
    g.countries.push(c)
  }

  for (const p of posts) {
    const code = p.country_code?.value
    if (!code) continue
    const g = groups.get(regionSlugByCountry.get(code)!)!
    addToStats(g.stats, p)
    addPin(g.pins, p)
  }

  const out: RegionSummary[] = []
  for (const [slug, g] of groups) {
    const view = viewFor(g.pins)
    out.push({
      slug,
      value: g.value,
      label: g.label,
      countryCount: g.countries.length,
      center: view.center,
      zoom: view.zoom,
      bounds: view.bounds,
      countries: g.countries,
      ...g.stats
    })
  }

  out.sort((a, b) => a.label.localeCompare(b.label))
  return out
}
