// Shared, framework-agnostic helpers for the per-country pages (/countries/*).
// Imported by app pages, the /api/countries server route, and the build-time
// prerender module (modules/country-routes.ts), so it must stay free of any
// Nuxt/Nitro runtime imports.
//
// People-group records carry an ISO-3 country code (e.g. "IND") plus a
// localized country label and lat/lng. We group records by country to produce
// one CountrySummary per country: a stable English-name slug for the URL, the
// localized display name, the WAGF region (for the index grouping), a count,
// and a map view (center + zoom) framed on the country's pins with a little
// breathing room so neighbouring countries stay visible.

import { COUNTRIES } from '../app/utils/countries'

export interface PeopleGroupLite {
  country_code?: { value: string, label: string } | null
  wagf_region?: { value: string, label: string } | null
  latitude?: string | number | null
  longitude?: string | number | null
}

export interface CountrySummary {
  /** English-name slug used in the URL, e.g. "papua-new-guinea". */
  slug: string
  /** ISO-3 country code, e.g. "PNG". */
  code: string
  /** Localized display name (from the people-groups API `lang` param). */
  name: string
  /** WAGF region, used to group countries on the index page. */
  region: { value: string, label: string }
  /** Number of people groups in this country. */
  count: number
  /** Map center [lng, lat]. */
  center: [number, number]
  /** Map zoom level. */
  zoom: number
}

// ISO-3 → canonical English name, the basis for slugs. Sourced from the same
// country list the rest of the app uses so slugs stay consistent and locale-
// independent (a French page is still /fr/countries/india, not /fr/countries/inde).
const ENGLISH_NAME_BY_CODE = new Map(COUNTRIES.map(c => [c.value, c.label]))

export function slugifyCountry(name: string): string {
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
  return slugifyCountry(ENGLISH_NAME_BY_CODE.get(code) || fallbackLabel || code)
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
// research-map keeps its own pan/zoom controls.
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

// Default whole-world view for a country whose records have no coordinates.
const WORLD_VIEW: { center: [number, number], zoom: number } = { center: [20, 10], zoom: 1.8 }

// Group people-group records into one summary per country, sorted by name.
export function summarizeCountries(posts: PeopleGroupLite[]): CountrySummary[] {
  const groups = new Map<string, {
    name: string
    region: { value: string, label: string }
    lats: number[]
    lngs: number[]
    count: number
  }>()

  for (const p of posts) {
    const code = p.country_code?.value
    if (!code) continue

    let g = groups.get(code)
    if (!g) {
      g = {
        name: p.country_code!.label,
        region: p.wagf_region ?? { value: '', label: '' },
        lats: [],
        lngs: [],
        count: 0
      }
      groups.set(code, g)
    }
    g.count++

    const lat = typeof p.latitude === 'string' ? parseFloat(p.latitude) : p.latitude
    const lng = typeof p.longitude === 'string' ? parseFloat(p.longitude) : p.longitude
    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      g.lats.push(lat)
      g.lngs.push(lng)
    }
  }

  const out: CountrySummary[] = []
  for (const [code, g] of groups) {
    const view = g.lats.length > 0
      ? fitView(Math.min(...g.lngs), Math.min(...g.lats), Math.max(...g.lngs), Math.max(...g.lats))
      : WORLD_VIEW
    out.push({
      slug: countrySlug(code, g.name),
      code,
      name: g.name,
      region: g.region,
      count: g.count,
      center: view.center,
      zoom: view.zoom
    })
  }

  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}
