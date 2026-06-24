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
import { useShadowStyles } from '../../composables/useShadowStyles.js'

// iOS Safari auto-zooms the page whenever a text input with computed
// font-size < 16px receives focus, and the "Done" keyboard button re-fires
// the same zoom on blur. We override the Mapbox geocoder input to 16px in
// the shadow root so the auto-zoom never triggers. 16px is the documented
// threshold; setting it explicitly here also stops the page from getting
// stuck zoomed-in on devices that disallow pinch-zoom recovery.
useShadowStyles(
  '.mapboxgl-ctrl-geocoder--input,'
  + '.mapboxgl-ctrl-geocoder input[type="text"],'
  + '.mapboxgl-ctrl-geocoder input[type="search"]'
  + '{font-size:16px !important;line-height:1.3;}',
  'geocoder-ios-zoom-fix'
)

const { t, locale } = useI18n()

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
  dataSourceId: { type: String,  default: '' },
  /**
   * Active search context — one of 'people-groups' | 'language' | 'regions' |
   * 'religion' (or '' for the default order). Mirrors the active legend tab so
   * the unified search surfaces the tab-relevant category first while still
   * matching every category (Round 16). Read live by useDoxaSearch on each
   * keystroke, so changing tabs needs no geocoder rebuild.
   */
  activeContext: { type: String, default: '' }
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

// ── Category tags (Round 16 — replace emoji prefixes with clear labels) ───────
// place_type → i18n key under `search.kinds`. The tag is a small labeled pill
// (with a matching title for a11y/tooltip) so each result's category is
// unambiguous — e.g. "Deaf" can appear as an Affinity Block, a Cluster AND a
// People Group; the tag disambiguates what a bare name + emoji used to.
const KIND_TAG_KEY = {
  'people-group':         'people',
  'doxa-people-group':    'peopleGroup',
  'doxa-affinity-bloc':   'bloc',
  'doxa-cluster':         'cluster',
  'doxa-country':         'country',
  'doxa-region':          'region',
  'doxa-language-family': 'family',
  'doxa-language':        'languageKind',
  'doxa-dialect':         'dialect',
  'doxa-religion':        'religionKind',
}
function kindTag(placeType) {
  const key = KIND_TAG_KEY[placeType]
  if (!key) return ''
  const label = t('search.kinds.' + key)
  return `<span class="dg-tag" title="${esc(label)}">${esc(label)}</span>`
}

/**
 * Custom row renderer for suggestions. Receives a Carmen-GeoJSON feature
 * and returns an HTML string that Mapbox injects into the suggestion `<a>`.
 *
 * Layout (Round 16 — no emoji; a labeled category tag leads every row):
 *
 *   People-group pin — shows the 2-4 valid indicators (only the ones present):
 *     [People] <bold Name>
 *        Place: <country>   Language: <lang>   Religion: <religion>
 *
 *   DOXA aggregate (bloc / cluster / PG / country / region / family / language
 *   / dialect / religion):
 *     [Affinity Block] <label>  <count>
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

    // The 2-4 indicator combo: People (always — it's the pin) + only the valid
    // ones of Place / Language / Religion. Bold labels mirror the placeholder
    // text word-for-word (Place / Language / Religion).
    const placeLabel    = t('search.labels.place')
    const languageLabel = t('search.labels.language')
    const religionLabel = t('search.labels.religion')

    const meta = []
    if (country)  meta.push(`<span class="dg-field"><strong>${esc(placeLabel)}</strong> ${esc(country)}</span>`)
    if (language) meta.push(`<span class="dg-field"><strong>${esc(languageLabel)}</strong> ${esc(language)}</span>`)
    if (religion) meta.push(`<span class="dg-field"><strong>${esc(religionLabel)}</strong> ${esc(religion)}</span>`)

    return (
      `<div class="dg-main">${kindTag('people-group')}<strong>${esc(name)}</strong></div>` +
      (meta.length ? `<div class="dg-meta">${meta.join('')}</div>` : '')
    )
  }

  // DOXA aggregate — labeled category tag + clean label + member count. Built
  // from properties (not place_name) so the tag carries the tier and we drop
  // the old "(Cluster)/(PG)" suffix the emoji layout needed for disambiguation.
  const aggType = types.find((tp) => tp.startsWith('doxa-'))
  if (aggType) {
    const props = item.properties || {}
    const label = esc(strLabel(props.label) || item.text || '')
    const count = Number(props.count) || 0
    const countHtml = count ? ` <span class="dg-count">${count}</span>` : ''
    return `<div class="dg-main">${kindTag(aggType)}<span class="dg-agg-label">${label}</span>${countHtml}</div>`
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
// uiStore holds the prayer / engagement / adoption / religion legend filters,
// which live outside mapStore. Needed so a search result can clear them too
// (otherwise filter ∩ result = zero pins → blank map).
const uiStore   = inject('uiStore',   null)

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
  getActiveFilter,
  // Read live so a tab switch re-orders results without rebuilding the geocoder.
  getActiveContext: () => props.activeContext || null
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
    // Localize Mapbox's remote place results AND the geocoder's own UI strings.
    // Mapbox accepts ISO-639-1 codes (comma-separated); the active i18n locale
    // is set once at mount from profile-config.lang (default 'en'). See loc-002.
    language:       locale.value || 'en',
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

    // A chosen search result must not stay hidden behind a still-active legend
    // filter — the filter and result intersect to zero pins (the blank-map bug,
    // Clear every legend selection that has NO "within selection"
    // UX: region, resource, affinity-bloc, dialect (mapStore) + prayer /
    // engagement / adoption / religion (uiStore). Map selections are mutually
    // exclusive, so assign state directly — the select*(null) actions cross-clear
    // family/language, which would defeat the two-section UX handled below.
    if (mapStore) {
      mapStore.selectedRegion        = null
      mapStore.selectedResource      = null
      mapStore.selectedAffinityBlock = null
      mapStore.selectedDialect       = null
    }
    if (uiStore) {
      uiStore.setPrayerFilter?.(null)
      uiStore.setEngagementFilter?.(null)
      uiStore.setAdoptionFilter?.(null)
      uiStore.setReligionFilter?.(null)
    }

    // Family / language DO have a two-section UX: a "Within [selection]" result
    // keeps the filter, an "All DOXA Data" result (tagged _allDataSection) clears
    // it (QA R1 A2 Option B). Only clear them in the latter case.
    if (f.properties?._allDataSection && mapStore) {
      mapStore.selectedFamily   = null
      mapStore.selectedLanguage = null
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
      f.place_type?.includes('doxa-region')          ||
      f.place_type?.includes('doxa-language-family') ||
      f.place_type?.includes('doxa-language')        ||
      f.place_type?.includes('doxa-dialect')         ||
      f.place_type?.includes('doxa-religion')        ||
      f.place_type?.includes('doxa-affinity-bloc')   ||
      f.place_type?.includes('doxa-cluster')         ||
      f.place_type?.includes('doxa-people-group')
    ) {
      // DOXA aggregate (country / language-family / language / dialect / religion).
      // Parent handler dims non-matching pins and fitBounds on the member set,
      // and for family/language/dialect kinds also drives the legend tab + selection.
      emit('aggregate-result', {
        kind:            f.place_type[0].replace(/^doxa-/, ''),
        label:           f.properties?.label || f.text,
        count:           f.properties?.count || 0,
        memberIds:       f.properties?.memberIds || [],
        bounds:          f.properties?.bounds || null,
        center:          f.center,
        originalLabels:  f.properties?.originalLabels || null,
        familyDerived:   f.properties?.familyDerived || '',
        baseLang:        f.properties?.baseLang || '',
        dialectLabel:    f.properties?.dialectLabel || '',
        slug:            f.properties?.slug || null,
        id:              f.id || null,
        // Affinity-tier codes — needed by research-map's onGeocoderAggregateResult
        // to build the synthetic tree node for legend dim + selection.
        blocCode:        f.properties?.blocCode || '',
        blocLabel:       f.properties?.blocLabel || '',
        clusterCode:     f.properties?.clusterCode || '',
        clusterLabel:    f.properties?.clusterLabel || '',
        peopleGroupCode: f.properties?.peopleGroupCode || '',
        properties:      f.properties || null   // full bag for forward-compat
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

// Locale can change at runtime via the LanguageSelector control (loc-005).
// MapboxGeocoder reads `language` only at construction and has no public
// updater, so patch the stashed option directly — the next forward query then
// localizes remote results to the new locale without a costly geocoder rebuild.
watch(locale, (next) => {
  const inst = geocoder.value
  if (inst?.options) inst.options.language = next || 'en'
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
