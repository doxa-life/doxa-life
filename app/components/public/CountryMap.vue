<script setup lang="ts">
// Dedicated map for a country page. Highlights the focus country (filled +
// outlined polygon from Mapbox's country-boundaries tileset) and plots every
// people group as a pin — the focus country's groups in a bright brand green,
// groups in surrounding countries muted — so the viewer sees both the country's
// people groups and the general area around it.
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

async function loadPins() {
  const url = `${prayBaseUrl}/api/people-groups/list?fields=name,slug,country_code,latitude,longitude&lang=${props.languageCode}`
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
      properties: {
        name: p.name,
        slug: p.slug,
        inCountry: p.country_code?.value === props.countryCode
      }
    }))
  return { type: 'FeatureCollection' as const, features }
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
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
      const { name, slug } = f.properties
      const href = `${props.researchUrl}${slug}`
      new mapboxgl.Popup({ closeButton: true, offset: 10 })
        .setLngLat(f.geometry.coordinates)
        .setHTML(`<strong>${escapeHtml(name)}</strong><br><a href="${href}">${escapeHtml(name)} &rarr;</a>`)
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
