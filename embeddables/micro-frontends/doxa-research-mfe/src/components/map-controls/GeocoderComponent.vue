<!--
  GeocoderComponent.vue — Mapbox Geocoder search bar as a self-contained Vue component.

  Handles:
  • Injecting the Mapbox Geocoder CSS stylesheet into the Shadow DOM root
    (so styles aren't blocked by the custom element boundary).
  • Creating the MapboxGeocoder control and adding it to the provided map.
  • Supplementing Mapbox's forward-geocoder results with DOXA people-group,
    country, language and religion matches via `useDoxaSearch` (passed as
    the `localGeocoder` option — see Mapbox "custom-geocoder" example).
  • Forwarding geocoder events (`result`, `clear`, `error`) as Vue emits so
    parent components can react (e.g. fly to result, filter pins, log analytics).
  • Emitting a dedicated `people-group-result` event when the selected result
    is a DOXA people group, so the parent can open the PG detail popup in
    addition to the default Mapbox flyTo behavior.
  • Removing the control cleanly on unmount to avoid memory leaks.

  Service logic extension point:
  • Listen to the `result` emit to run your own search enrichment, filter data,
    or highlight a region.
  • Replace/wrap the geocoder creation logic inside onMounted to swap in a
    different search provider (e.g. Pelias, Google Places) while keeping the
    same component API.
  • Use the default `<slot />` to render additional UI below the search input
    (e.g. recent searches, filter chips, alternate search tabs).

  Props:
    mapInstance  — live mapboxgl.Map instance (required once map is ready)
    accessToken  — Mapbox public access token string
    isDark       — mirrors app theme; adds 'geocoder-dark' class for CSS cascade
    placeholder  — input placeholder text (default: 'Search places…')

  Emits:
    result(event)              — a Mapbox geocoder result was selected
    people-group-result(pg)    — a DOXA people-group result was selected;
                                 payload is the original normalized PG record
                                 (already wrapped in { properties } shape)
    clear                      — the search input was cleared
    error(event)               — geocoder encountered an error

  Exposes:
    geocoder       — the raw MapboxGeocoder instance (for advanced usage)
-->
<script setup>
import { ref, onMounted, onBeforeUnmount, computed, inject, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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
 * People-group layout (match the search placeholder "People, place, language,
 * religion" — same 4 words, same order, all bold-labeled):
 *
 *     🗺️ People: <bold Name>
 *        Place: <country>   Language: <lang>   Religion: <religion>
 */
function renderSuggestion(item) {
  if (!item) return ''
  const types = item.place_type || []

  // Section dividers — rendered as non-interactive labels.
  // CSS (.dg-section-header-item) makes the parent <li> non-clickable.
  if (types.includes('doxa-section-header')) {
    const label = esc(item.properties?.headerLabel || item.text || '')
    return `<div class="dg-section-header-item">${label}</div>`
  }

  if (types.includes('people-group')) {
    const props = item.properties || {}
    const name     = strLabel(props.name) || strLabel(props.displayName) || strLabel(item.text) || ''
    const country  = strLabel(props.countryName) || strLabel(props.country) || strLabel(props.countryIso) || ''
    const language = strLabel(props.language) || strLabel(props.primaryLanguage) || strLabel(props.languageFamily) || ''
    const religion = strLabel(props.religionName) || strLabel(props.religion) || ''

    // Bold labels mirror the placeholder text word-for-word: People / Place / Language / Religion.
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

  // DOXA aggregate (country / language / religion) — emoji + label + count
  if (types.some((t) => t.startsWith('doxa-'))) {
    return `<div class="dg-main">${esc(item.place_name || item.text || '')}</div>`
  }

  // Native Mapbox remote result — keep its default rendering style.
  return `<div class="dg-main">${esc(item.place_name || item.text || '')}</div>`
}

// ── DOXA local geocoder ───────────────────────────────────────────────────────
// Inject the dataStore provided by the ProfileLoader / app-profile and build
// a search function that Mapbox's `localGeocoder` option will invoke for
// every keystroke. We read the store non-reactively (inject returns the
// store instance directly) — the composable re-computes its index when the
// underlying features change.
const dataStore = inject('dataStore', null)
const mapStore  = inject('mapStore',  null)

// getActiveFilter is a closure over the live mapStore so each search call
// reads the current selection without re-creating the geocoder instance.
function getActiveFilter() {
  if (!mapStore) return null
  if (mapStore.selectedFamily)   return { kind: 'family',   key: mapStore.selectedFamily }
  if (mapStore.selectedLanguage) return { kind: 'language', key: mapStore.selectedLanguage }
  return null
}

const { search: doxaLocalGeocoder } = useDoxaSearch({
  dataStore,
  dataSourceId: props.dataSourceId || undefined,
  getActiveFilter
})

// Exposed so a parent can call geocoder.value.query('...') or add custom filters
const geocoder = ref(null)

// ── CSS injection ─────────────────────────────────────────────────────────────
// The geocoder stylesheet must live inside the shadow root; injecting it into
// the document head has no effect because the widget renders inside a
// ShadowRoot. We target the closest ShadowRoot of the map container.
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
  //
  // `localGeocoder` is the Mapbox plugin's extension point for supplementing
  // the hosted forward-geocoder results with client-side matches. The callback
  // must return an array of Carmen-GeoJSON features — see
  //   https://github.com/mapbox/carmen/blob/master/carmen-geojson.md
  // Our `doxaLocalGeocoder` returns people-group + country + language +
  // religion matches from the DOXA dataset. Mapbox will render them in the
  // same suggestions dropdown, visually distinguished by the emoji prefix
  // baked into each feature's `place_name`.
  //
  // `localGeocoderOnly` is intentionally LEFT OUT — we want BOTH sources
  // (Mapbox places AND DOXA records) visible in the suggestions list.
  // eslint-disable-next-line no-undef
  geocoder.value = new MapboxGeocoder({
    accessToken:    props.accessToken,
    mapboxgl:       mapboxgl,   // CDN global — same reference used by the map instance
    marker:         false,
    placeholder:    effectivePlaceholder.value,
    localGeocoder:  doxaLocalGeocoder,
    // Raise suggestion limit well above Mapbox's default (5) so a query like
    // "India" can surface many people-groups. CSS caps the dropdown height
    // and adds overflow-y:auto so the user can scroll through them.
    limit:          20,
    // Ensure our local results show even when Mapbox has remote matches.
    // (Some versions default to localGeocoder results appearing AFTER the
    // remote ones; keeping default order is fine — the emoji prefix makes
    // our rows unambiguous.)
    zoom:           6,
    // Custom row renderer — injects structured, bold-labeled metadata
    // for DOXA results. See renderSuggestion() above.
    render:         renderSuggestion
  })

  // Forward geocoder events as Vue emits. When a DOXA people-group result
  // is chosen we additionally emit `people-group-result` carrying the
  // original normalized record so the parent can open the popup /
  // selectedPin highlight while Mapbox handles the flyTo.
  geocoder.value.on('result', (e) => {
    const f = e?.result
    if (!f) return

    // Section headers are non-selectable visual dividers — swallow the event.
    if (f.place_type?.includes('doxa-section-header')) return

    // "All DOXA Data" result: deselect the active legend selection so the full
    // pin set shows alongside the geocoder result (QA R1 A2 Option B).
    if (f.properties?._allDataSection && mapStore) {
      mapStore.selectFamily?.(null)
      mapStore.selectLanguage?.(null)
      mapStore.selectDialect?.(null)
    }

    emit('result', e)
    if (f.place_type?.includes('people-group') && f.feature) {
      // Wrap in a GeoJSON-Feature-like shape (properties + geometry) to match
      // what pin-click handlers pass to uiStore.selectPeopleGroup.
      emit('people-group-result', {
        type: 'Feature',
        properties: f.properties || f.feature,
        geometry: f.geometry || { type: 'Point', coordinates: f.center }
      })
    } else if (
      f.place_type?.includes('doxa-country')         ||
      f.place_type?.includes('doxa-language-family') ||
      f.place_type?.includes('doxa-language')        ||
      f.place_type?.includes('doxa-dialect')         ||
      f.place_type?.includes('doxa-religion')
    ) {
      // DOXA aggregate (country / language-family / language / dialect / religion).
      // Parent handler dims non-matching pins and fitBounds on the member set,
      // and for family/language/dialect kinds also drives the legend tab + selection.
      emit('aggregate-result', {
        kind:           f.place_type[0].replace(/^doxa-/, ''),
        label:          f.properties?.label || f.text,
        count:          f.properties?.count || 0,
        memberIds:      f.properties?.memberIds || [],
        bounds:         f.properties?.bounds || null,
        center:         f.center,
        originalLabels: f.properties?.originalLabels || null,
        familyDerived:  f.properties?.familyDerived || '',
        baseLang:       f.properties?.baseLang || '',
        dialectLabel:   f.properties?.dialectLabel || '',
        slug:           f.properties?.slug || null,
        id:             f.id || null
      })
    }
  })
  geocoder.value.on('clear',  ()   => emit('clear'))
  geocoder.value.on('error',  (e)  => emit('error', e))

  map.addControl(geocoder.value, 'top-left')
})

// Mapbox Geocoder sets `placeholder` once at construction; it has no public
// updater method. Watch the effective placeholder and patch the DOM input
// directly so the per-map prop can change as the user switches profile tabs.
watch(effectivePlaceholder, (next) => {
  const inst = geocoder.value
  if (!inst) return
  const inputEl = inst._inputEl || inst.container?.querySelector?.('input.mapboxgl-ctrl-geocoder--input')
  if (inputEl) {
    inputEl.placeholder = next
    inputEl.setAttribute('placeholder', next)
  }
  // Also stash on the instance so any internal reads pick it up.
  if (inst.options) inst.options.placeholder = next
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
  future extension point for rendering sibling search UI (e.g. recent searches,
  filter chips) that you want to place adjacent to the geocoder input.
-->
<template>
  <slot />
</template>
