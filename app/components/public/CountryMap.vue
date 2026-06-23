<script setup lang="ts">
// Dedicated map for a country page. Highlights the focus country (filled +
// outlined polygon from Mapbox's country-boundaries tileset) and plots every
// people group as a pin — the focus country's groups in a bright brand green,
// groups in surrounding countries muted — so the viewer sees both the country's
// people groups and the general area around it. Clicking a pin opens a popup
// with that people group's details (photo, country, population, religion,
// description) plus links to its full profile and prayer page, mirroring the
// research map's detail panel.
//
// Self-contained (uses the npm mapbox-gl directly, not the shared embed bundle):
// the country page is the only map on the page, so there's no second copy to
// clash with. mapbox-gl is loaded client-side only.

import 'mapbox-gl/dist/mapbox-gl.css'

const props = withDefaults(defineProps<{
  /** ISO-3 code of the country to highlight (e.g. "IND"). */
  countryCode: string
  /** Initial map center [lng, lat]. */
  center: [number, number]
  /** Initial map zoom. */
  zoom: number
  /** Language for people-group names in pin popups. */
  languageCode?: string
  /** Base path for "view profile" links, e.g. "/research/". */
  researchUrl?: string
}>(), {
  languageCode: 'en',
  researchUrl: '/research/'
})

const config = useRuntimeConfig()
const mapboxToken = (config.public as { mapboxToken?: string }).mapboxToken || ''
const prayBaseUrl = config.public.prayBaseUrl as string
const { t } = useI18n()

const container = ref<HTMLElement | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let map: any = null

// Map colours:
//  - brand: dark brand green (#3b463d) — the highlighted country's fill + outline.
//  - inCountry: brighter brand green (#73A17F, green-100) — pins inside the focus
//    country, kept distinct from the dark outline and the muted neighbour pins.
//  - muted: grey-green — pins in surrounding countries.
// brand/muted resolve from the design tokens (theme-aware); the pin accent is
// fixed so it always reads as a clear, non-dark green against the country fill.
function mapColors() {
  const fallback = { brand: '#3b463d', muted: '#b8bdb9' }
  const inCountry = '#73A17F'
  if (typeof document === 'undefined') return { ...fallback, inCountry }
  const s = getComputedStyle(document.documentElement)
  return {
    brand: s.getPropertyValue('--color-brand').trim() || fallback.brand,
    muted: s.getPropertyValue('--color-brand-lighter').trim() || fallback.muted,
    inCountry
  }
}

const PIN_FIELDS = 'name,slug,country_code,rop1,religion,population,location_description,image_url,has_photo,latitude,longitude'

async function loadPins() {
  const url = `${prayBaseUrl}/api/people-groups/list?fields=${PIN_FIELDS}&lang=${props.languageCode}`
  const res = await fetch(url)
  const data = await res.json()
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
        inCountry: p.country_code?.value === props.countryCode,
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
// population/religion stats, a short description, and Pray / Full Profile links.
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

  const { brand, muted, inCountry } = mapColors()

  map = new mapboxgl.Map({
    container: container.value,
    style: 'mapbox://styles/mapbox/light-v11',
    center: props.center,
    zoom: props.zoom
  })
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right')

  map.on('load', async () => {
    // ── Country highlight ──────────────────────────────────────────────────
    // The country-boundaries tileset carries one feature per worldview; filter
    // to a single worldview so the highlight isn't drawn two or three times.
    const countryFilter = [
      'all',
      ['==', ['get', 'iso_3166_1_alpha_3'], props.countryCode],
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
    const geojson = await loadPins()
    map.addSource('people-groups', { type: 'geojson', data: geojson })
    map.addLayer({
      id: 'people-group-pins',
      type: 'circle',
      source: 'people-groups',
      // Focus-country pins (sort key 1) draw on top of the muted ones (0).
      layout: { 'circle-sort-key': ['case', ['get', 'inCountry'], 1, 0] },
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 3, 6, 6.5],
        'circle-color': ['case', ['get', 'inCountry'], inCountry, muted],
        // Surrounding/border people groups stay visible (so they can be seen on
        // the map) but a touch dimmer than the focus country's groups.
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

onMounted(() => { initMap() })
onBeforeUnmount(() => { if (map) { map.remove(); map = null } })
</script>

<template>
  <div ref="container" class="country-map" />
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
