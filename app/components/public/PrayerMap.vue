<script setup lang="ts">
// Port of marketing-theme/js/prayer-map.js. Mapbox GL Mercator globe
// showing ~2k people groups coloured by prayer coverage. Includes the
// same search box (local name match + Mapbox geocoding fallback) and
// modal overlay with `Pray for them` / `Info` links.
//
// The markup is kept minimal — #prayer-map is the container, the legend,
// search, and modal are built imperatively to match the source exactly
// (same classes, same DOM structure). prayer-map.css is imported at
// module scope and applies via the component's scope.

import mapboxgl, { type Map as MapboxMap } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface PrayerMapT {
  no_prayer?: string
  has_prayer?: string
  search_placeholder?: string
  close?: string
  language?: string
  country?: string
  population?: string
  prayer_coverage?: string
  pray_for_them?: string
  info?: string
  unknown?: string
}

const props = withDefaults(defineProps<{
  researchUrl?: string
  languageCode?: string
  t?: PrayerMapT
}>(), {
  researchUrl: '/research',
  languageCode: 'en',
  t: () => ({})
})

const config = useRuntimeConfig()
const mapboxToken = config.public.mapboxToken as string
const prayBaseUrl = config.public.prayBaseUrl as string

const COLOR_NO_PRAYER = '#e57373'
const COLOR_HAS_PRAYER = '#4caf50'

const containerRef = ref<HTMLDivElement | null>(null)

interface FeatureProps {
  slug: string
  name: string
  people_committed?: number
  population?: number
  language: string | null
  country: string | null
  picture_url?: string
  hasPrayer: 0 | 1
}

type PGFeature = {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: FeatureProps
}

let map: MapboxMap | null = null
let allFeatures: PGFeature[] = []
let highlightedSlug: string | null = null
let overlayEl: HTMLDivElement | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let geocodeController: AbortController | null = null

function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return props.t.unknown || 'Unknown'
  return Number(n).toLocaleString()
}

function highlightFeature(feature: PGFeature) {
  highlightedSlug = feature.properties.slug
  if (!map) return
  map.setPaintProperty('people-groups-dots', 'circle-color', [
    'case',
    ['==', ['get', 'slug'], highlightedSlug],
    '#ff9800',
    ['==', ['get', 'hasPrayer'], 1],
    COLOR_HAS_PRAYER,
    COLOR_NO_PRAYER
  ])
  map.setPaintProperty('people-groups-dots', 'circle-radius', [
    'case',
    ['==', ['get', 'slug'], highlightedSlug],
    12,
    ['interpolate', ['linear'], ['zoom'], 1, 3, 5, 5, 10, 8]
  ])
}

function clearHighlight() {
  if (!highlightedSlug || !map) return
  highlightedSlug = null
  map.setPaintProperty('people-groups-dots', 'circle-color', [
    'case',
    ['==', ['get', 'hasPrayer'], 1],
    COLOR_HAS_PRAYER,
    COLOR_NO_PRAYER
  ])
  map.setPaintProperty('people-groups-dots', 'circle-radius', [
    'interpolate', ['linear'], ['zoom'],
    1, 3, 5, 5, 10, 8
  ])
}

function buildLegend(container: HTMLElement) {
  const legend = document.createElement('div')
  legend.className = 'prayer-map-legend'
  legend.innerHTML
    = '<div class="prayer-map-legend__item">'
    + `<span class="prayer-map-legend__dot" style="background:${COLOR_NO_PRAYER}"></span>`
    + `<span>${props.t.no_prayer || 'No prayer coverage'}</span>`
    + '</div>'
    + '<div class="prayer-map-legend__item">'
    + `<span class="prayer-map-legend__dot" style="background:${COLOR_HAS_PRAYER}"></span>`
    + `<span>${props.t.has_prayer || 'Has prayer coverage'}</span>`
    + '</div>'
  container.appendChild(legend)
}

function buildSearch(container: HTMLElement) {
  const searchWrap = document.createElement('div')
  searchWrap.className = 'prayer-map-search'
  searchWrap.innerHTML
    = `<input class="prayer-map-search__input" type="search" placeholder="${props.t.search_placeholder || 'Search people groups or locations'}" autocomplete="off">`
    + '<div class="prayer-map-search__results"></div>'
  container.appendChild(searchWrap)

  const searchInput = searchWrap.querySelector<HTMLInputElement>('.prayer-map-search__input')!
  const searchResults = searchWrap.querySelector<HTMLDivElement>('.prayer-map-search__results')!

  function closeSearch() {
    searchResults.innerHTML = ''
    searchResults.style.display = 'none'
  }

  type SearchItem = { type: 'people'; name: string; sub: string; index: number } | { type: 'location'; name: string; lng: number; lat: number }

  function showResults(items: SearchItem[]) {
    if (items.length === 0) {
      closeSearch()
      return
    }
    searchResults.innerHTML = items.map((item) => {
      const idx = item.type === 'people' ? String(item.index) : ''
      const lng = item.type === 'location' ? String(item.lng) : ''
      const lat = item.type === 'location' ? String(item.lat) : ''
      const sub = item.type === 'people' ? item.sub : ''
      return `<button class="prayer-map-search__item" data-type="${item.type}" data-index="${idx}" data-lng="${lng}" data-lat="${lat}">`
        + `<span class="prayer-map-search__item-name">${escapeHtml(item.name)}</span>`
        + (sub ? `<span class="prayer-map-search__item-sub">${escapeHtml(sub)}</span>` : '')
        + '</button>'
    }).join('')
    searchResults.style.display = 'block'
  }

  searchResults.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.prayer-map-search__item')
    if (!btn) return
    const type = btn.getAttribute('data-type')
    if (type === 'people') {
      const i = parseInt(btn.getAttribute('data-index') || '', 10)
      const feature = allFeatures[i]
      if (feature && map) {
        const coords = feature.geometry.coordinates
        map.flyTo({ center: coords, zoom: 8 })
        highlightFeature(feature)
      }
    } else {
      const lng = parseFloat(btn.getAttribute('data-lng') || '')
      const lat = parseFloat(btn.getAttribute('data-lat') || '')
      if (!isNaN(lng) && !isNaN(lat) && map) {
        map.flyTo({ center: [lng, lat], zoom: 5 })
      }
    }
    searchInput.value = ''
    closeSearch()
  })

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim()
    if (debounceTimer) clearTimeout(debounceTimer)
    if (geocodeController) {
      geocodeController.abort()
      geocodeController = null
    }
    if (query.length < 2) {
      closeSearch()
      return
    }
    debounceTimer = setTimeout(() => {
      const lower = query.toLowerCase()
      const peopleResults: SearchItem[] = []
      for (let i = 0; i < allFeatures.length && peopleResults.length < 5; i++) {
        const name = allFeatures[i]!.properties.name
        if (name && name.toLowerCase().includes(lower)) {
          peopleResults.push({
            type: 'people',
            name,
            sub: allFeatures[i]!.properties.country || '',
            index: i
          })
        }
      }
      if (peopleResults.length >= 2) {
        showResults(peopleResults)
        return
      }
      geocodeController = new AbortController()
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=3`
      fetch(geocodeUrl, { signal: geocodeController.signal })
        .then(res => res.json())
        .then((data) => {
          const locationResults: SearchItem[] = (data.features || []).map((f: any) => ({
            type: 'location' as const,
            name: f.place_name,
            lng: f.center[0],
            lat: f.center[1]
          }))
          showResults(peopleResults.concat(locationResults))
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') showResults(peopleResults)
        })
    }, 300)
  })

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = ''
      closeSearch()
      searchInput.blur()
    }
  })

  document.addEventListener('click', (e) => {
    if (!searchWrap.contains(e.target as Node)) closeSearch()
  })
}

function buildOverlay() {
  const overlay = document.createElement('div')
  overlay.className = 'prayer-map-overlay'
  overlay.innerHTML
    = '<div class="prayer-map-modal" role="dialog">'
    + `<button class="prayer-map-modal__close" aria-label="${props.t.close || 'Close'}">&times;</button>`
    + '<img class="prayer-map-modal__image" src="" alt="">'
    + '<div class="prayer-map-modal__body stack stack--md">'
    + '<h3 class="prayer-map-modal__name"></h3>'
    + '<div class="prayer-map-modal__details"></div>'
    + '<div class="prayer-map-modal__actions">'
    + `<a id="prayer-map-modal__btn-pray" class="button" href="#" target="_blank">${props.t.pray_for_them || 'Pray for them'}</a>`
    + `<a id="prayer-map-modal__btn-info" class="button outline" href="#" target="_blank">${props.t.info || 'Info'}</a>`
    + '</div>'
    + '</div>'
    + '</div>'
  document.body.appendChild(overlay)

  const modalImage = overlay.querySelector<HTMLImageElement>('.prayer-map-modal__image')!
  const modalName = overlay.querySelector<HTMLHeadingElement>('.prayer-map-modal__name')!
  const modalDetails = overlay.querySelector<HTMLDivElement>('.prayer-map-modal__details')!
  const btnPray = overlay.querySelector<HTMLAnchorElement>('#prayer-map-modal__btn-pray')!
  const btnInfo = overlay.querySelector<HTMLAnchorElement>('#prayer-map-modal__btn-info')!

  function closeModal() {
    overlay.classList.remove('is-visible')
  }
  overlay.querySelector<HTMLButtonElement>('.prayer-map-modal__close')!.addEventListener('click', closeModal)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal()
  })

  return { overlay, modalImage, modalName, modalDetails, btnPray, btnInfo }
}

onMounted(async () => {
  if (!containerRef.value || !mapboxToken) return

  mapboxgl.accessToken = mapboxToken

  map = new mapboxgl.Map({
    container: containerRef.value,
    style: 'mapbox://styles/mapbox/light-v11',
    projection: 'mercator',
    center: [20, 10],
    zoom: 1.5,
    minZoom: 1,
    maxZoom: 12
  })

  map.addControl(new mapboxgl.NavigationControl(), 'top-right')
  map.scrollZoom.disable()

  containerRef.value.addEventListener('click', () => map?.scrollZoom.enable())
  containerRef.value.addEventListener('mouseleave', () => map?.scrollZoom.disable())

  buildLegend(containerRef.value)
  buildSearch(containerRef.value)
  const { overlay, modalImage, modalName, modalDetails, btnPray, btnInfo } = buildOverlay()
  overlayEl = overlay

  function openModal(raw: Record<string, unknown>) {
    // Mapbox serializes feature.properties to strings — parse back where needed.
    const props2 = raw as FeatureProps & Record<string, string>
    const fallbackImage = `${prayBaseUrl}/images/default-people-group.jpg`
    modalImage.src = props2.picture_url || fallbackImage
    modalImage.alt = props2.name
    modalName.textContent = props2.name
    modalDetails.innerHTML
      = `<span><strong>${props.t.language || 'Language'}:</strong> ${props2.language || props.t.unknown || 'Unknown'}</span>`
      + `<span><strong>${props.t.country || 'Country'}:</strong> ${props2.country || props.t.unknown || 'Unknown'}</span>`
      + `<span><strong>${props.t.population || 'Population'}:</strong> ${formatNumber(Number(props2.population))}</span>`
      + `<span><strong>${props.t.prayer_coverage || 'Prayer Coverage'}:</strong> ${props2.people_committed || 0}/144</span>`
    btnPray.href = `${prayBaseUrl}/${props2.slug}?source=doxalife`
    btnInfo.href = `${props.researchUrl.replace(/\/+$/, '')}/${props2.slug}`
    overlay.classList.add('is-visible')
  }

  map.on('click', (e) => {
    if (highlightedSlug && map) {
      const features = map.queryRenderedFeatures(e.point, { layers: ['people-groups-dots'] })
      if (!features.length || (features[0]!.properties as any).slug !== highlightedSlug) {
        clearHighlight()
      }
    }
  })

  map.on('load', async () => {
    try {
      const apiUrl = `${prayBaseUrl}/api/people-groups/list?fields=slug,name,latitude,longitude,people_committed,population,image_url,country_code,primary_language&lang=${props.languageCode}`
      const res = await fetch(apiUrl)
      const data = await res.json()
      const posts: any[] = data.posts || []

      const features: PGFeature[] = []
      for (const p of posts) {
        const lat = parseFloat(p.latitude)
        const lng = parseFloat(p.longitude)
        if (isNaN(lat) || isNaN(lng)) continue
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: {
            slug: p.slug,
            name: p.name,
            people_committed: p.people_committed,
            population: p.population,
            language: p.primary_language ? p.primary_language.label : null,
            country: p.country_code ? p.country_code.label : null,
            picture_url: p.image_url,
            hasPrayer: p.people_committed > 0 ? 1 : 0
          }
        })
      }

      allFeatures = features

      if (!map) return
      if (map.getSource('people-groups')) return

      map.addSource('people-groups', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features } as any
      })

      map.addLayer({
        id: 'people-groups-dots',
        type: 'circle',
        source: 'people-groups',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            1, 3, 5, 5, 10, 8
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'hasPrayer'], 1],
            COLOR_HAS_PRAYER,
            COLOR_NO_PRAYER
          ],
          'circle-opacity': 0.85,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.5
        }
      })

      map.on('click', 'people-groups-dots', (e) => {
        if (e.features && e.features.length > 0) {
          openModal(e.features[0]!.properties as Record<string, unknown>)
        }
      })
      map.on('mouseenter', 'people-groups-dots', () => {
        if (map) map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'people-groups-dots', () => {
        if (map) map.getCanvas().style.cursor = ''
      })
    } catch (err) {
      console.error('Prayer map: failed to load people groups', err)
    }
  })
})

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (geocodeController) geocodeController.abort()
  if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl)
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div ref="containerRef" id="prayer-map" />
</template>

<style src="~/assets/styles/prayer-map.css"></style>
