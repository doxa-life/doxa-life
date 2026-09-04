<script setup lang="ts">
// Map for the region and country pages. Highlights the focus countries (filled
// + outlined polygons from Mapbox's country-boundaries tileset) and plots every
// people group as a pin — groups inside the focus countries in a bright brand
// green, groups elsewhere muted — so the viewer sees both the area's people
// groups and its surroundings. With `colorByPrayer`, pins inside the focus
// countries are instead coloured by prayer coverage (100+ committed, 1+, none)
// using the same colours as the prayer-coverage card, and a legend explains
// them. Clicking a pin opens a popup with that people group's details (photo,
// country, population, religion, intercessors, description) plus links to its
// full profile and prayer page, mirroring the research map's detail panel.
//
// Self-contained (uses the npm mapbox-gl directly, not the shared embed bundle):
// this is the only map on the page, so there's no second copy to clash with.
// mapbox-gl is loaded client-side only.

import 'mapbox-gl/dist/mapbox-gl.css'
import { FULL_PRAYER_COVERAGE_COUNT, type MapBounds } from '~~/config/countries-meta'

const props = withDefaults(defineProps<{
  /** ISO-3 codes of the countries to highlight (e.g. ["IND"]). */
  countryCodes: string[]
  /** Initial map center [lng, lat]; used when no bounds are given. */
  center: [number, number]
  /** Initial map zoom; used when no bounds are given. */
  zoom: number
  /** Bounds [[west, south], [east, north]] to frame with padding instead of center/zoom. */
  bounds?: MapBounds | null
  /** Language for people-group names in pin popups. */
  languageCode?: string
  /** Base path for "view profile" links, e.g. "/research/". */
  researchUrl?: string
  /** Colour pins inside the focus countries by prayer coverage and show a legend. */
  colorByPrayer?: boolean
}>(), {
  bounds: null,
  languageCode: 'en',
  researchUrl: '/research/',
  colorByPrayer: false
})

const config = useRuntimeConfig()
const mapboxToken = (config.public as { mapboxToken?: string }).mapboxToken || ''
const prayBaseUrl = config.public.prayBaseUrl as string
const { t } = useI18n()

const container = ref<HTMLElement | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let map: any = null

// Map colours:
//  - brand: dark brand green (#3b463d) — the highlighted countries' fill + outline.
//  - inCountry: brighter brand green (#73A17F, green-100) — pins inside the focus
//    countries, kept distinct from the dark outline and the muted neighbour pins.
//  - muted: grey-green — pins in surrounding countries.
//  - prayerFull / prayerPartial / prayerNone: the prayer-coverage card's colours
//    (brand primary, yellow, brand light) for pins inside the focus countries
//    when colouring by prayer.
//  - outside: warm grey (brand secondary dark) — pins in surrounding countries
//    when colouring by prayer, so they don't compete with the dark "no one
//    praying" pins.
// Token-backed colours resolve from the design tokens (theme-aware); the fixed
// accents always read clearly against the country fill.
const FALLBACK_COLORS = {
  brand: '#3b463d',
  muted: '#b8bdb9',
  inCountry: '#73A17F',
  prayerFull: '#92b195',
  prayerPartial: '#f0c64a',
  prayerNone: '#4e594f',
  outside: '#a59d92'
}
const colors = ref({ ...FALLBACK_COLORS })

function mapColors() {
  if (typeof document === 'undefined') return { ...FALLBACK_COLORS }
  const s = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback
  return {
    ...FALLBACK_COLORS,
    brand: token('--color-brand', FALLBACK_COLORS.brand),
    muted: token('--color-brand-lighter', FALLBACK_COLORS.muted),
    prayerFull: token('--color-brand-primary', FALLBACK_COLORS.prayerFull),
    prayerNone: token('--color-brand-light', FALLBACK_COLORS.prayerNone),
    outside: token('--color-brand-secondary-dark', FALLBACK_COLORS.outside)
  }
}

const PIN_FIELDS = 'name,slug,country_code,rop1,religion,population,location_description,image_url,has_photo,latitude,longitude,people_committed'

async function loadPins() {
  const url = `${prayBaseUrl}/api/people-groups/list?fields=${PIN_FIELDS}&lang=${props.languageCode}`
  const res = await fetch(url)
  const data = await res.json()
  const focus = new Set(props.countryCodes)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const features = (data.posts ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((p: any) => p.latitude != null && p.longitude != null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [parseFloat(p.longitude), parseFloat(p.latitude)] },
      // Only JSON primitives — Mapbox feature properties can't hold nested objects.
      properties: {
        name: p.name,
        slug: p.slug,
        inCountry: focus.has(p.country_code?.value),
        committed: Number(p.people_committed) || 0,
        country: p.country_code?.label ?? '',
        rop1: p.rop1?.label ?? '',
        religion: p.religion?.label ?? '',
        population: p.population ?? 0,
        description: p.location_description ?? '',
        imageUrl: (p.has_photo && p.image_url) ? p.image_url : ''
      }
    }))
  return { type: 'FeatureCollection' as const, features }
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function formatPopulation(pop: number): string {
  if (!pop || Number.isNaN(pop)) return ''
  return Number(pop).toLocaleString(props.languageCode || 'en')
}

// Build the pin popup's inner HTML from a feature's properties. Mirrors the
// research map's detail panel: photo, name, country · people-group, the
// population/religion stats and intercessor count (out of the full-coverage
// goal, as on the people-group cards), a short description, and Pray / Full
// Profile links.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function popupHtml(p: any): string {
  const name = escapeHtml(p.name || '')
  const subtitle = [p.country, p.rop1].filter(Boolean).map(escapeHtml).join(' · ')
  const pop = formatPopulation(p.population)
  const profileUrl = `${props.researchUrl}${p.slug}`
  const prayUrl = `${prayBaseUrl}/${p.slug}?source=doxalife`

  const rows: string[] = []
  if (pop) rows.push(`<div><dt>${escapeHtml(t('Population'))}</dt><dd>${pop}</dd></div>`)
  if (p.religion) rows.push(`<div><dt>${escapeHtml(t('Religion'))}</dt><dd>${escapeHtml(p.religion)}</dd></div>`)
  rows.push(`<div><dt>${escapeHtml(t('Intercessors'))}</dt><dd>${Number(p.committed) || 0}/${FULL_PRAYER_COVERAGE_COUNT}</dd></div>`)

  return `<div class="cm-popup">
      ${p.imageUrl ? `<img class="cm-popup__img" src="${escapeHtml(p.imageUrl)}" alt="${name}" loading="lazy">` : ''}
      <div class="cm-popup__body">
        <div class="cm-popup__name">${name}</div>
        ${subtitle ? `<div class="cm-popup__sub">${subtitle}</div>` : ''}
        ${rows.length ? `<dl class="cm-popup__stats">${rows.join('')}</dl>` : ''}
        ${p.description ? `<p class="cm-popup__desc">${escapeHtml(p.description)}</p>` : ''}
        <div class="cm-popup__actions">
          <a class="cm-popup__btn cm-popup__btn--primary" href="${prayUrl}">${escapeHtml(t('Pray'))}</a>
          <a class="cm-popup__btn" href="${profileUrl}">${escapeHtml(t('Full Profile'))}</a>
        </div>
      </div>
    </div>`
}

async function initMap() {
  if (!container.value || !mapboxToken) return

  const mapboxgl = (await import('mapbox-gl')).default
  mapboxgl.accessToken = mapboxToken

  const { brand, muted, inCountry, prayerFull, prayerPartial, prayerNone, outside } = colors.value

  map = new mapboxgl.Map({
    container: container.value,
    style: 'mapbox://styles/mapbox/light-v11',
    center: props.center,
    zoom: props.zoom,
    // Bounds take precedence over center/zoom so the frame fits the real
    // viewport rather than the build-time approximation.
    ...(props.bounds ? { bounds: props.bounds, fitBoundsOptions: { padding: 40, maxZoom: 6 } } : {})
  })
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right')

  map.on('load', async () => {
    // ── Country highlight ──────────────────────────────────────────────────
    // The country-boundaries tileset carries one feature per worldview; filter
    // to a single worldview so the highlight isn't drawn two or three times.
    const countryFilter = [
      'all',
      ['in', ['get', 'iso_3166_1_alpha_3'], ['literal', props.countryCodes]],
      ['any', ['==', ['get', 'worldview'], 'all'], ['in', 'US', ['get', 'worldview']]]
    ]
    map.addSource('country-boundaries', { type: 'vector', url: 'mapbox://mapbox.country-boundaries-v1' })
    map.addLayer({
      id: 'focus-country-fill',
      type: 'fill',
      source: 'country-boundaries',
      'source-layer': 'country_boundaries',
      filter: countryFilter,
      paint: { 'fill-color': brand, 'fill-opacity': 0.12 }
    })
    map.addLayer({
      id: 'focus-country-outline',
      type: 'line',
      source: 'country-boundaries',
      'source-layer': 'country_boundaries',
      filter: countryFilter,
      paint: { 'line-color': brand, 'line-width': 2 }
    })

    // ── People-group pins ──────────────────────────────────────────────────
    // Prayer mode colours focus-country pins by committed intercessors (full
    // coverage, some, none) and draws the better-covered pins on top; the
    // default mode is a single focus colour.
    const outsideFocus = ['!', ['get', 'inCountry']]
    const fullCoverage = ['>=', ['get', 'committed'], FULL_PRAYER_COVERAGE_COUNT]
    const someCoverage = ['>', ['get', 'committed'], 0]
    const pinColor = props.colorByPrayer
      ? ['case', outsideFocus, outside, fullCoverage, prayerFull, someCoverage, prayerPartial, prayerNone]
      : ['case', ['get', 'inCountry'], inCountry, muted]
    const pinSortKey = props.colorByPrayer
      ? ['case', outsideFocus, 0, fullCoverage, 3, someCoverage, 2, 1]
      : ['case', ['get', 'inCountry'], 1, 0]
    const geojson = await loadPins()
    map.addSource('people-groups', { type: 'geojson', data: geojson })
    map.addLayer({
      id: 'people-group-pins',
      type: 'circle',
      source: 'people-groups',
      layout: { 'circle-sort-key': pinSortKey },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 3, 6, 6.5],
        'circle-color': pinColor,
        // Surrounding/border people groups stay visible (so they can be seen on
        // the map) but a touch dimmer than the focus countries' groups.
        'circle-opacity': ['case', ['get', 'inCountry'], 1, 0.75],
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff'
      }
    })

    // ── Popup + cursor on pin click ────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on('click', 'people-group-pins', (e: any) => {
      const f = e.features?.[0]
      if (!f) return
      new mapboxgl.Popup({ closeButton: true, maxWidth: '264px', offset: 12 })
        .setLngLat(f.geometry.coordinates)
        .setHTML(popupHtml(f.properties))
        .addTo(map)
    })
    map.on('mouseenter', 'people-group-pins', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', 'people-group-pins', () => { map.getCanvas().style.cursor = '' })
  })
}

onMounted(() => {
  colors.value = mapColors()
  initMap()
})
onBeforeUnmount(() => { if (map) { map.remove(); map = null } })
</script>

<template>
  <div class="country-map">
    <div ref="container" class="country-map__canvas" />
    <div v-if="colorByPrayer" class="country-map__legend">
      <span><i :style="{ background: colors.prayerFull }" />{{ t('100+ People Praying') }}</span>
      <span><i :style="{ background: colors.prayerPartial }" />{{ t('1+ People Praying') }}</span>
      <span><i :style="{ background: colors.prayerNone }" />{{ t('No One Praying') }}</span>
      <span><i :style="{ background: colors.outside }" />{{ t('Outside this region') }}</span>
    </div>
  </div>
</template>

<style scoped>
.country-map {
  display: block;
  position: relative;
  width: 100%;
  min-height: 780px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: inherit;
}

@media (max-width: 768px) {
  .country-map {
    min-height: 0;
    aspect-ratio: 1 / 2;
  }
}

.country-map__canvas {
  position: absolute;
  inset: 0;
}

/* Colour key, overlaid on the map's bottom-left corner above the canvas. */
.country-map__legend {
  position: absolute;
  left: 10px;
  bottom: 28px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 12px;
  font-weight: 600;
  color: #1f1f1f;
  pointer-events: none;
}

.country-map__legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.country-map__legend i {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 100px;
  border: 1px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
}
</style>

<style>
/* Pin popup. Injected into the Mapbox popup as raw HTML, which scoped styles
   can't reach, so these rules are global — namespaced under .cm-popup. */
.mapboxgl-popup-content:has(.cm-popup) {
  padding: 12px;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
}

.cm-popup {
  width: 240px;
}

/* Portrait thumbnail (4:5), centred — never a wide landscape crop. */
.cm-popup__img {
  display: block;
  width: 150px;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  border-radius: 8px;
  margin: 0 auto 8px;
}

.cm-popup__body {
  padding: 0;
}

.cm-popup__name {
  font-weight: 700;
  font-size: 15px;
  line-height: 1.25;
  color: var(--color-black, #1f1f1f);
}

.cm-popup__sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-brand-lighter, #6d766e);
}

.cm-popup__stats {
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.cm-popup__stats > div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
}

.cm-popup__stats dt {
  margin: 0;
  color: var(--color-brand-lighter, #6d766e);
}

.cm-popup__stats dd {
  margin: 0;
  text-align: right;
  font-weight: 600;
  color: var(--color-black, #1f1f1f);
}

.cm-popup__desc {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: #555;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cm-popup__actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}

.cm-popup__btn {
  flex: 1;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  background: #ecf0f1;
  color: var(--color-black, #1f1f1f);
}

.cm-popup__btn--primary {
  background: var(--color-brand, #3b463d);
  color: #fff;
}
</style>
