<!--
  GeocoderComponent.vue — Mapbox Geocoder search bar as a self-contained Vue component.

  Handles:
  • Injecting the Mapbox Geocoder CSS stylesheet into the Shadow DOM root
    (so styles aren't blocked by the custom element boundary).
  • Creating the MapboxGeocoder control and adding it to the provided map.
  • Supplementing Mapbox's forward-geocoder results with local people-group,
    country, language and religion matches via `useDoxaSearch` (passed as
    the `localGeocoder` option).
  • Forwarding geocoder events (`result`, `clear`, `error`) as Vue emits.
  • Emitting a dedicated `people-group-result` event when the selected result
    is a local people group, so the parent can open the PG detail popup.
  • Removing the control cleanly on unmount.

  Props:
    mapInstance  — live mapboxgl.Map instance (required once map is ready)
    accessToken  — Mapbox public access token string
    isDark       — mirrors app theme; adds 'geocoder-dark' class for CSS cascade
    placeholder  — input placeholder text (defaults to i18n `search.placeholder`)
    dataSourceId — optional id for the local-geocoder source

  Emits:
    result(event)              — a Mapbox geocoder result was selected
    people-group-result(pg)    — a local people-group result was selected
    aggregate-result(payload)  — a country/language/religion aggregate was selected
    clear                      — the search input was cleared
    error(event)               — geocoder encountered an error

  Exposes:
    geocoder       — the raw MapboxGeocoder instance (for advanced usage)
-->
<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
// TODO: port useDoxaSearch composable. The composable will be ported separately
// by another agent. Until then this import will fail at build time.
import { useDoxaSearch } from '../../composables/useDoxaSearch.js'

const { t } = useI18n()

const props = defineProps({
  mapInstance:  { type: Object,  required: true },
  accessToken:  { type: String,  required: true },
  isDark:       { type: Boolean, default: false },
  /**
   * Optional explicit placeholder. If omitted, falls back to the i18n key
   * `search.placeholder` — translated per active locale.
   */
  placeholder:  { type: String,  default: '' },
  /**
   * Optional data source id the local-geocoder should search.
   * Defaults to "auto" (first populated source in dataStore.sources).
   */
  dataSourceId: { type: String,  default: '' }
})

// Effective placeholder: explicit prop > i18n default
const effectivePlaceholder = computed(() => props.placeholder || t('search.placeholder'))

const emit = defineEmits(['result', 'people-group-result', 'aggregate-result', 'clear', 'error'])

// ── HTML escape for user-supplied text — the `render` option below injects
//    strings via innerHTML so every dynamic value must be escaped. --------
const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPE_MAP[c])
}
// Unwraps {value, label} objects the same way our popup does.
function strLabel(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object') return v.label || v.value || ''
  return String(v)
}

/**
 * Custom row renderer for suggestions. Receives a Carmen-GeoJSON feature
 * and returns an HTML string that Mapbox injects into the suggestion `<a>`.
 *
 * People-group layout:
 *     🗺️ People: <bold Name>
 *        Place: <country>   Language: <lang>   Religion: <religion>
 */
function renderSuggestion(item) {
  if (!item) return ''
  const types = item.place_type || []

  if (types.includes('people-group')) {
    const props = item.properties || {}
    const name     = strLabel(props.name) || strLabel(props.displayName) || strLabel(item.text) || ''
    const country  = strLabel(props.countryName) || strLabel(props.country) || strLabel(props.countryIso) || ''
    const language = strLabel(props.language) || strLabel(props.primaryLanguage) || strLabel(props.languageFamily) || ''
    const religion = strLabel(props.religionName) || strLabel(props.religion) || ''

    const peopleLabel   = t('search.labels.people')
    const placeLabel    = t('search.labels.place')
    const languageLabel = t('search.labels.language')
    const religionLabel = t('search.labels.religion')

    const meta = []
    if (country)  meta.push(`<span class="dg-field"><strong>${esc(placeLabel)}</strong> ${esc(country)}</span>`)
    if (language) meta.push(`<span class="dg-field"><strong>${esc(languageLabel)}</strong> ${esc(language)}</span>`)
    if (religion) meta.push(`<span class="dg-field"><strong>${esc(religionLabel)}</strong> ${esc(religion)}</span>`)

    return (
      `<div class="dg-main">🗺️ <strong>${esc(peopleLabel)}</strong> <strong>${esc(name)}</strong></div>` +
      (meta.length ? `<div class="dg-meta">${meta.join('')}</div>` : '')
    )
  }

  // Local aggregate (country / language / religion)
  // TODO: 'doxa-' place_type prefix is brand-specific. Generalize when the
  // local search composable is ported (e.g. 'local-country', 'agg-country').
  if (types.some((t) => t.startsWith('doxa-'))) {
    return `<div class="dg-main">${esc(item.place_name || item.text || '')}</div>`
  }

  // Native Mapbox remote result — keep its default rendering style.
  return `<div class="dg-main">${esc(item.place_name || item.text || '')}</div>`
}

// ── Local geocoder ────────────────────────────────────────────────────────
const dataStore = inject('dataStore', null)
const { search: doxaLocalGeocoder } = useDoxaSearch({
  dataStore,
  dataSourceId: props.dataSourceId || undefined
})

// Exposed so a parent can call geocoder.value.query('...') or add custom filters
const geocoder = ref(null)

// ── CSS injection ─────────────────────────────────────────────────────────────
// The geocoder stylesheet must live inside the shadow root.
function injectGeocoderCSS(shadowRoot) {
  const HREF = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css'
  if (shadowRoot.querySelector(`link[href="${HREF}"]`)) return  // already injected
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = HREF
  shadowRoot.prepend(link)
}

// ── Geocoder lifecycle ────────────────────────────────────────────────────────
onMounted(() => {
  if (typeof MapboxGeocoder === 'undefined') {
    return
  }

  const map = props.mapInstance
  if (!map) {
    return
  }

  // Inject CSS into shadow root
  const shadowRoot = map.getContainer?.()?.getRootNode?.()
  if (shadowRoot instanceof ShadowRoot) {
    injectGeocoderCSS(shadowRoot)
  }

  // Create geocoder instance.
  // eslint-disable-next-line no-undef
  geocoder.value = new MapboxGeocoder({
    accessToken:    props.accessToken,
    mapboxgl:       mapboxgl,   // CDN global — same reference used by the map instance
    marker:         false,
    placeholder:    effectivePlaceholder.value,
    localGeocoder:  doxaLocalGeocoder,
    // Raise suggestion limit well above Mapbox's default (5).
    limit:          20,
    zoom:           6,
    // Custom row renderer — injects structured, bold-labeled metadata.
    render:         renderSuggestion
  })

  // Forward geocoder events as Vue emits.
  geocoder.value.on('result', (e) => {
    emit('result', e)
    const f = e?.result
    if (!f) return
    if (f.place_type?.includes('people-group') && f.feature) {
      emit('people-group-result', {
        type: 'Feature',
        properties: f.properties || f.feature,
        geometry: f.geometry || { type: 'Point', coordinates: f.center }
      })
    } else if (
      f.place_type?.includes('doxa-country')  ||
      f.place_type?.includes('doxa-language') ||
      f.place_type?.includes('doxa-religion')
    ) {
      // TODO: 'doxa-' prefix is brand-specific. Generalize when local
      // search composable is ported.
      emit('aggregate-result', {
        kind:      f.place_type[0].replace(/^doxa-/, ''),
        label:     f.properties?.label || f.text,
        count:     f.properties?.count || 0,
        memberIds: f.properties?.memberIds || [],
        bounds:    f.properties?.bounds || null,
        center:    f.center
      })
    }
  })
  geocoder.value.on('clear',  ()   => emit('clear'))
  geocoder.value.on('error',  (e)  => emit('error', e))

  map.addControl(geocoder.value, 'top-left')
})

onBeforeUnmount(() => {
  if (geocoder.value && props.mapInstance) {
    try {
      props.mapInstance.removeControl(geocoder.value)
    } catch (e) {
      // Map may already be destroyed; ignore
    }
    geocoder.value = null
  }
})

defineExpose({ geocoder })
</script>

<!--
  This component renders no DOM of its own — the geocoder widget is injected
  directly into the map container by addControl(). The slot is provided as a
  future extension point for rendering sibling search UI.
-->
<template>
  <slot />
</template>
