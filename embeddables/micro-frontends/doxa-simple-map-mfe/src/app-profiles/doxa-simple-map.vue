<script setup>
/**
 * doxa-simple-map.vue — Application Profile: Doxa Simple Map
 *
 * Direct clone of doxa-simple-map-component/MapComponent.vue initialization pattern.
 * Reads profile-config via inject() from ProfileLoader.
 * Shadow DOM safe: all CSS via useShadowStyles, geocoder CSS injected at runtime.
 */

import { inject, provide, ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RTL_LOCALES } from '../i18n/index.js'
import { useMapInstance } from '../composables/useMapInstance.js'
import { useMapData } from '../composables/useMapData.js'
import { useMapLayers } from '../composables/useMapLayers.js'
import { useSelectedPin } from '../composables/useSelectedPin.js'
import { useShadowStyles } from '../composables/useShadowStyles.js'
import { DataSourceManager } from '../utils/DataSourceManager.js'
import { getLanguageFamilyColor, COLOR_MODES } from '../config/colors.js'
import { buildColorExpression } from '../config/colorStrategies.js'
import { FULL_PRAYER_THRESHOLD } from '../config/prayerColors.js'
import { mapDefaults } from '../config/mapConfig.js'
import LegendDesktop   from '../components/LegendDesktop.vue'
import SideMenuDrawer    from '../components/SideMenuDrawer.vue'
// ─── Map control components ───────────────────────────────────────────────────
// Each button is imported individually so the profile can compose any subset
// and bind them explicitly to its own map instance.  In a multi-map profile
// you would place a separate <MapToolbar> + button set for each map.
import MapToolbar        from '../components/map-controls/MapToolbar.vue'
import ZoomInButton      from '../components/map-controls/ZoomInButton.vue'
import ZoomOutButton     from '../components/map-controls/ZoomOutButton.vue'
import LocationButton    from '../components/map-controls/LocationButton.vue'
import FullscreenButton  from '../components/map-controls/FullscreenButton.vue'
import ThemeToggleButton from '../components/map-controls/ThemeToggleButton.vue'
import HelpButton        from '../components/map-controls/HelpButton.vue'
import HamburgerButton   from '../components/map-controls/HamburgerButton.vue'
import GeocoderComponent from '../components/map-controls/GeocoderComponent.vue'

// ─── Shadow DOM style injection ──────────────────────────────────────────────
useShadowStyles(`
  .dsm-root { position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden; }
  .dsm-tab-bar { flex:0 0 auto;display:flex;align-items:center;background:#fff;border-bottom:2px solid #e0e0e0;box-shadow:0 2px 4px rgba(0,0,0,.08);height:48px;padding:0 12px;gap:4px;z-index:10; }
  .dsm-tab { background:none;border:none;padding:0 20px;height:100%;font-size:14px;font-weight:500;color:#555;cursor:pointer;border-bottom:3px solid transparent;transition:color .15s,border-color .15s,background .15s;white-space:nowrap; }
  .dsm-tab:hover { background:rgba(52,152,219,.06);color:#3498db; }
  .dsm-tab.active { color:#3498db;border-bottom-color:#3498db;background:rgba(52,152,219,.06); }
  .dsm-map-area { flex:1 1 0;position:relative;overflow:hidden; }
  .dsm-map-canvas { position:absolute;inset:0; }
  .dsm-loading { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#f8f9fa;color:#555;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;z-index:5; }

  /* ── Light mode: geocoder ── */
  /* Search bar matches legend width EXACTLY via the shared --map-legend-width
     CSS variable (set by applyContainerScale). Responsive at same breakpoints. */
  /* Outer control container: positioned 10px from top + left of the map area
     (matches legend's 10px left inset). Locked to legend width. The Mapbox
     default 10px child margin is NEUTRALIZED here by our positioning —
     without this override the geocoder would nest-indent another 10px. */
  .mapboxgl-ctrl-top-left { top:10px!important;left:10px!important;width:var(--map-legend-width,340px)!important;max-width:var(--map-legend-width,340px)!important;z-index:1200!important; }
  .mapboxgl-ctrl-top-left .mapboxgl-ctrl { margin:0!important;float:none!important; }
  /* Geocoder pill: inherit Mapbox's DEFAULT height + icon positions. Only
     override width + rounded border + shadow. This keeps the search-icon
     and X-button perfectly aligned by Mapbox's own calibrated CSS. */
  .mapboxgl-ctrl-geocoder { width:100%!important;max-width:100%!important;min-width:0!important;border-radius:20px!important;box-shadow:0 2px 8px rgba(0,0,0,0.15)!important;background:#fff; }
  .mapboxgl-ctrl-geocoder--input { border-radius:20px!important; }
  /* Keep the clear (X) button visible whenever the input has text, not just
     while focused. Mapbox's default only shows X on focus, so after picking
     a search result on mobile (tap → input blurs) the X vanished until the
     user tapped BACK into the input. :has + :not(:placeholder-shown) detects
     a non-empty input. */
  .mapboxgl-ctrl-geocoder:has(.mapboxgl-ctrl-geocoder--input:not(:placeholder-shown)) .mapboxgl-ctrl-geocoder--button { display:block!important; }
  /* Suggestions dropdown — higher limit (20) can produce a tall list;
     cap height + add overflow-y so the user can scroll through all matches
     (e.g. many people-groups under "India"). Visible scrollbar styling. */
  .mapboxgl-ctrl-geocoder--suggestions { z-index:1200!important;position:absolute;max-height:60vh!important;overflow-y:auto!important; }
  .suggestions { border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-height:60vh!important;overflow-y:auto!important; }
  .mapboxgl-ctrl-geocoder--suggestions::-webkit-scrollbar,
  .suggestions::-webkit-scrollbar { width:8px; }
  .mapboxgl-ctrl-geocoder--suggestions::-webkit-scrollbar-thumb,
  .suggestions::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.3);border-radius:4px; }
  .mapboxgl-ctrl-geocoder--suggestions::-webkit-scrollbar-track,
  .suggestions::-webkit-scrollbar-track { background:rgba(0,0,0,0.05); }

  /* ── DOXA custom suggestion rows — bold labels + compact meta ─────── */
  /* GeocoderComponent.renderSuggestion() produces <div class="dg-main">
     Name</div><div class="dg-meta"><span class="dg-field">…</span>…</div> */
  .dg-main { font-weight:500;font-size:13px;color:#222;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .dg-main strong { font-weight:700; }
  .dg-meta { margin-top:2px;display:flex;flex-wrap:wrap;gap:4px 10px;font-size:11px;color:#555;line-height:1.35; }
  .dg-field strong { font-weight:600;color:#333;margin-right:2px; }
  /* Dark theme variants */
  .dsm-dark .dg-main { color:#F3F3F1; }
  .dsm-dark .dg-meta { color:rgba(243,243,241,0.7); }
  .dsm-dark .dg-field strong { color:#F3F3F1; }
  @media(max-width:767px){
    /* Mobile: centered full-width pill, using native Mapbox geocoder height + icons. */
    .mapboxgl-ctrl-top-left { top:10px!important;left:10px!important;right:10px!important;width:calc(100% - 20px)!important;max-width:none!important; }
  }

  /* ── Dark mode: root class drives all child overrides ── */
  .dsm-dark .mapboxgl-ctrl-geocoder { background:#4e594f!important;border:1px solid rgba(255,255,255,0.14)!important;box-shadow:0 2px 8px rgba(0,0,0,0.4)!important; }
  .dsm-dark .mapboxgl-ctrl-geocoder--input { color:#F3F3F1!important;background:transparent!important; }
  .dsm-dark .mapboxgl-ctrl-geocoder--input::placeholder { color:rgba(243,243,241,0.65)!important; }
  /* X (clear) button — the SVG <svg> AND its wrapper <button> both need
     dark-mode styling or Mapbox's default white fill bleeds through. */
  .dsm-dark .mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--icon { fill:rgba(243,243,241,0.75)!important; }
  .dsm-dark .mapboxgl-ctrl-geocoder--button { background:transparent!important; }
  .dsm-dark .mapboxgl-ctrl-geocoder--icon-close { fill:rgba(243,243,241,0.75)!important; }
  .dsm-dark .mapboxgl-ctrl-geocoder--button:hover .mapboxgl-ctrl-geocoder--icon-close { fill:#F3F3F1!important; }
  /* Suggestions dropdown — every wrapper level needs explicit dark bg.
     Mapbox uses UL.suggestions > LI > A; the default .active / .selected
     class on the top match keeps a light bg without these overrides. */
  .dsm-dark .suggestions { background:#3b463d!important;border:1px solid rgba(255,255,255,0.12)!important; }
  .dsm-dark .suggestions > li { background:transparent!important; }
  .dsm-dark .suggestions > li > a { background:transparent!important;color:#F3F3F1!important; }
  .dsm-dark .suggestions > li.active > a,
  .dsm-dark .suggestions > li.selected > a,
  .dsm-dark .suggestions > li:hover > a,
  .dsm-dark .suggestions > li > a:hover,
  .dsm-dark .suggestions > li > a:focus { background:rgba(255,255,255,0.1)!important;color:#F3F3F1!important; }
  /* DOXA custom row bits inside dark mode — re-assert in case the row-<a>
     sets a color that our .dg-* spans inherit from. */
  .dsm-dark .dg-main { color:#F3F3F1!important; }
  .dsm-dark .dg-meta { color:rgba(243,243,241,0.75)!important; }
  .dsm-dark .dg-field strong { color:#F3F3F1!important; }

  /* ── Fullscreen ── */
  :host(:fullscreen) { width:100vw!important;height:100vh!important;display:block!important; }
  :host(:fullscreen) .dsm-root { position:fixed;inset:0; }
  :host(:-webkit-full-screen) { width:100vw!important;height:100vh!important;display:block!important; }
  :host(:-webkit-full-screen) .dsm-root { position:fixed;inset:0; }

  /* ── Help modal ── */
  .dsm-help-overlay { position:absolute;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:2000; }
  .dsm-help-modal { background:#2a332a;color:#F3F3F1;border-radius:12px;padding:28px 32px;max-width:420px;width:90%;position:relative;box-shadow:0 8px 32px rgba(0,0,0,0.4);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;z-index:2001; }
  .dsm-help-modal h2 { margin:0 0 12px;font-size:18px;font-weight:600; }
  .dsm-help-modal p { margin:0 0 10px;font-size:14px;line-height:1.6;color:#ccc; }
  .dsm-help-modal p:last-of-type { margin-bottom:0; }
  .dsm-help-close { position:absolute;top:12px;right:14px;background:none;border:none;color:#fff;font-size:20px;cursor:pointer;line-height:1;padding:4px 6px;border-radius:4px; }
  .dsm-help-close:hover { background:rgba(255,255,255,0.12); }
`, 'doxa-simple-map')

// ─── i18n ─────────────────────────────────────────────────────────────────────
const { t, locale } = useI18n()

// ─── Mapbox basemap localisation ──────────────────────────────────────────────
// On Mapbox Standard / Streets styles, common label layers carry per-locale
// name fields (name_ar, name_de, name_en, name_fr, …). Setting the text-field
// expression to `['get', 'name_' + locale]` switches country/place/state names
// without reloading the style. See docs/feedback.md → Section A.
const MAPBOX_LABEL_LAYERS = [
  'country-label',
  'state-label',
  'settlement-major-label',
  'settlement-minor-label',
  'place-label',
  'continent-label',
  'water-point-label',
  'water-line-label',
]

function applyBasemapLocale(loc) {
  const m = map?.value
  if (!m) return
  for (const layerId of MAPBOX_LABEL_LAYERS) {
    if (!m.getLayer(layerId)) continue
    try {
      m.setLayoutProperty(layerId, 'text-field', ['coalesce',
        ['get', 'name_' + loc],
        ['get', 'name_en'],
        ['get', 'name'],
      ])
    } catch (e) {
      // Layer may not support name_* in this style — skip silently
    }
  }
}

const isRTL = computed(() => RTL_LOCALES.has(locale.value))

// ─── Feature flags (baked into this profile) ─────────────────────────────────
// Keep the underlying code in the repo; flip these to re-enable on a per-profile
// basis. Other application profiles may set these true and still work.
//   hamburgerMenu      — side menu drawer + hamburger button
//   infoButton         — "About this map" help modal trigger
//   overlapDensity     — dim non-matched pins to 0.08 when a legend filter is
//                        active (causes overlap-density bleed that can wash out
//                        orange pins). OFF here per feedback 2026-04-20.
//   darkPinBorder      — dark stroke on active pins in light mode. Previously
//                        needed to compensate for density bleed; irrelevant
//                        without overlapDensity.
const FEATURES = {
  hamburgerMenu: false,
  infoButton:    false,
  overlapDensity: false,
  darkPinBorder:  false,
}

// ─── Config from ProfileLoader ────────────────────────────────────────────────
const profileConfig = inject('profileConfig')
const mapboxToken   = inject('mapboxToken')
const dataSource    = inject('dataSource')

// ─── Tabs child prop ──────────────────────────────────────────────────────────
const DEFAULT_TABS = [
  { id: 'prayer', label: 'Prayer', colorStrategy: 'prayer', legend: 'prayer', popup: 'prayer' }
]
const tabs       = computed(() => profileConfig?.value?.tabs ?? DEFAULT_TABS)
const showTabBar = computed(() => tabs.value.length > 1)

// ─── Tab state ────────────────────────────────────────────────────────────────
const activeTabId = ref(null)
const activeTab   = computed(() => tabs.value.find(t => t.id === activeTabId.value) ?? tabs.value[0])

// Maps tab legend key → LegendComponent legendType prop
const legendTypeMap = { prayer: 'prayer', engagement: 'engagement', adoption: 'adoption' }
const activeLegendType = computed(() => legendTypeMap[activeTab.value?.legend] ?? 'prayer')

// Maps tab `popup` config → PeopleGroupDetail `action` prop.
// 'adoption' → Adopt button (→ /adopt/<slug>/?source=doxalife on current origin)
// anything else → Pray button (→ https://pray.doxa.life/<slug>?source=doxalife)
const activePopupAction = computed(() => activeTab.value?.popup === 'adoption' ? 'adopt' : 'pray')

// ─── Map ID ───────────────────────────────────────────────────────────────────
// Prefer instanceId from profile-config (set in WordPress embed) for deterministic isolation.
// Falls back to a random ID if not provided (safe for single-map pages).
const injectedInstanceId = inject('instanceId', null)
const mapId = (injectedInstanceId?.value || injectedInstanceId) || ('doxa-simple-map-' + Math.random().toString(36).slice(2, 7))
// Re-provide mapId so children (LegendComponent, etc.) can inject it for window event scoping
provide('mapId', mapId)
const mapContainer = ref(null)
const dsmRoot = ref(null)

// ─── Container-based responsive scaling ──────────────────────────────────────
// Watches the component's root element width via ResizeObserver and sets CSS
// custom properties that button + legend components consume. This ensures
// correct sizing when the map is embedded in a small slot on desktop
// (viewport media queries alone can't detect container size).
//
// Breakpoints (desktop only — mobile media queries handle ≤767px viewport):
//   ≥ 700 px → full size  (btn 40 px, font-md 13 px, font-sm 11 px)
//   500–699 px → medium   (btn 36 px, font-md 12 px, font-sm 10 px)
//   < 500 px  → compact   (btn 32 px, font-md 11 px, font-sm 10 px)
//
// Minimums: button 32 px, text 10 px — below that text would wrap or disappear.
let _containerObserver = null
function applyContainerScale(width) {
  const el = dsmRoot.value
  if (!el) return
  if (width >= 700) {
    el.style.setProperty('--map-btn-size',       '40px')
    el.style.setProperty('--map-toolbar-gap',    '8px')
    el.style.setProperty('--map-font-md',        '13px')
    el.style.setProperty('--map-font-sm',        '11px')
    el.style.setProperty('--map-legend-width',   '400px')
  } else if (width >= 500) {
    el.style.setProperty('--map-btn-size',       '36px')
    el.style.setProperty('--map-toolbar-gap',    '6px')
    el.style.setProperty('--map-font-md',        '12px')
    el.style.setProperty('--map-font-sm',        '10px')
    el.style.setProperty('--map-legend-width',   '360px')
  } else {
    el.style.setProperty('--map-btn-size',       '32px')
    el.style.setProperty('--map-toolbar-gap',    '5px')
    el.style.setProperty('--map-font-md',        '11px')
    el.style.setProperty('--map-font-sm',        '10px')
    el.style.setProperty('--map-legend-width',   '280px')
  }
}

// ─── Ready flag (controlled by us, not useMapInstance) ───────────────────────
const appReady = ref(false)

// ─── Stores ───────────────────────────────────────────────────────────────────
const mapStore  = inject('mapStore')
const dataStore = inject('dataStore')
const uiStore   = inject('uiStore')
const dsm       = new DataSourceManager()

// ─── Map instance ─────────────────────────────────────────────────────────────
const { map, isMapReady, initializeMap, destroy } = useMapInstance({
  containerRef: mapContainer,
  accessToken: mapboxToken.value,
  style: 'mapbox://styles/mapbox/light-v11',
  center: [20, 10],
  zoom: 1.8,
  pitch:   profileConfig?.value?.pitch   ?? mapDefaults.pitch,
  bearing: profileConfig?.value?.bearing ?? mapDefaults.bearing
})

const mapData = useMapData({
  mapId,
  dataSourceId: dataSource.value,
  dataSourceManager: dsm,
  dataStore,
  markRaw: (v) => v
})

const mapLayers = useMapLayers({
  getMap: () => map.value,
  mapId,
  getLanguageFamilyColor
})

// ─── GO marker (selected pin highlight) ───────────────────────────────────────
const selectedPin = useSelectedPin({ getMap: () => map.value })

// Stored so theme-swap can re-add layers after setStyle() clears them
let _lastNormalizedGroups = []

// ─── Image preloader — warms the browser cache for all people group photos ────
function preloadPeopleGroupImages(groups) {
  if (!groups?.length) return
  const PLACEHOLDER = 'NoImageAvailable'
  const urls = []
  const seen = new Set()

  for (const pg of groups) {
    let url = pg.imageUrl
    // If no direct URL or it's the placeholder, try JP fallback
    if (!url || url.includes(PLACEHOLDER)) {
      if (pg.peopleId3) {
        url = `https://joshuaproject.net/assets/media/profiles/photos/p${pg.peopleId3}.jpg`
      } else {
        continue // no usable URL — skip
      }
    }
    if (seen.has(url)) continue
    seen.add(url)
    urls.push(url)
  }

  if (!urls.length) return

  // Preload in idle-time batches so map render is not delayed
  let index = 0
  const BATCH = 25

  function loadBatch(deadline) {
    while (index < urls.length) {
      // Stop if the browser needs the thread back (requestIdleCallback path)
      if (deadline?.timeRemaining && deadline.timeRemaining() < 4) break
      const img = new Image()
      img.src = urls[index++]
    }
    if (index < urls.length) {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(loadBatch, { timeout: 2000 })
      } else {
        setTimeout(loadBatch, 150)
      }
    }
  }

  // Delay first batch by 1 s so the map tiles finish loading first
  if (typeof requestIdleCallback !== 'undefined') {
    setTimeout(() => requestIdleCallback(loadBatch, { timeout: 3000 }), 1000)
  } else {
    setTimeout(() => {
      for (let i = 0; i < BATCH && index < urls.length; i++) {
        const img = new Image(); img.src = urls[index++]
      }
      if (index < urls.length) setTimeout(loadBatch, 150)
    }, 1000)
  }

}

// ─── Map controls ─────────────────────────────────────────────────────────────
const isDark = computed(() => uiStore.theme === 'dark')

/** Called by MapToolbar when the theme toggle button is clicked. */
function handleToggleTheme() {
  if (!map.value) return
  uiStore.toggleTheme()
  const newStyle = uiStore.theme === 'dark'
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/light-v11'
  map.value.setStyle(newStyle)
  // Re-add custom layers after style swap (setStyle wipes all custom layers)
  map.value.once('style.load', () => {
    if (_lastNormalizedGroups?.length) {
      const firstTab = tabs.value[0]
      const initMode =
        firstTab?.colorStrategy === 'engagement' ? COLOR_MODES.ENGAGEMENT :
        firstTab?.colorStrategy === 'adoption'   ? COLOR_MODES.ADOPTION :
        COLOR_MODES.PRAYER_PROGRESS
      mapLayers.addLanguageFamilyLayer(_lastNormalizedGroups, initMode)
    }
    selectedPin.initialize()
    initActiveLayer()
    // New style → its label layers are defaults ('name_en'). Re-apply locale.
    applyBasemapLocale(locale.value)
  })
}

// ─── Search: people-group result handler ─────────────────────────────────────
// When the user selects a DOXA people-group result from the geocoder,
// Mapbox's built-in result-handling already flies the map to `feature.center`.
// We ALSO open the people-group detail popup via uiStore.selectPeopleGroup()
// and expand the legend (mobile) / dispatch the open-event (desktop) — mirrors
// the pin-click UX in useMapEvents.attachPinClickHandler.
function handlePeopleGroupResult(feature) {
  if (!feature || !uiStore) return
  uiStore.selectPeopleGroup(feature)
  if (uiStore.isMobile && uiStore.legendState === 'collapsed') {
    uiStore.setLegendState('open')
  }
  if (!uiStore.isMobile) {
    window.dispatchEvent(new CustomEvent('doxa:openDesktopLegend', { detail: { mapId } }))
  }
  // Highlight the matching pin on the map (ACTIVE_LAYER filter)
  try {
    const uid = feature?.properties?.uniqueId
    const m = map.value
    if (uid && m?.getLayer(ACTIVE_LAYER)) {
      m.setFilter(ACTIVE_LAYER, ['==', 'uniqueId', uid])
    }
  } catch (e) {
    // Highlight is a nice-to-have — a failure here shouldn't break the search flow
  }
}

// Clearing the search bar (X button) must also clear the selection + dim that
// was set by the last people-group result. Without this, the previously-selected
// pin stayed highlighted and all other pins stayed dim + animated indefinitely.
function handleSearchClear() {
  if (!uiStore) return
  uiStore.selectPeopleGroup(null)   // closes popup + Go-pin highlight (via useSelectedPin watcher)
  try {
    const m = map.value
    if (m?.getLayer(ACTIVE_LAYER)) {
      m.setFilter(ACTIVE_LAYER, ['==', 'uniqueId', ''])
    }
  } catch (e) { /* no-op */ }
  clearAggregateFilter()
  if (!_currentFilter.key) {
    applyLegendFilter(null, null)
  }
}

// ─── Search: aggregate (country / language / religion) result handler ────────
// When the user picks a DOXA aggregate (e.g. "🌍 India (851)"), dim every pin
// EXCEPT those in the aggregate's member list, then fitBounds on the matching
// pins so they're all visible without being over-zoomed.
//
// No individual pin is highlighted — user clicks pins one-by-one afterwards
// to open popups. ACTIVE_LAYER is cleared here to make that work cleanly.
function handleAggregateResult(evt) {
  if (!evt || !map.value) return
  const { memberIds, bounds } = evt
  if (!Array.isArray(memberIds) || !memberIds.length) return

  const m = map.value
  // Clear any single-pin highlight from a prior people-group search
  if (m.getLayer(ACTIVE_LAYER)) {
    m.setFilter(ACTIVE_LAYER, ['==', 'uniqueId', ''])
  }
  uiStore.selectPeopleGroup(null)  // close popup if open

  // Apply a per-feature case on the base layer: matched pins keep the tab's
  // color strategy; non-matched pins render as solid muted gray (theme-aware).
  const baseColor = getBaseColorExpr()
  const caseColor = [
    'case',
    ['in', ['get', 'uniqueId'], ['literal', memberIds]],
    baseColor,
    mutedGray()
  ]
  const caseOpacity = [
    'case',
    ['in', ['get', 'uniqueId'], ['literal', memberIds]],
    0.9,
    0.35
  ]
  // Stroke is the issue on dark mode: the default white ring on dim pins
  // glows against the dark basemap. Drop stroke to 0 on non-matched pins so
  // they read as flat gray dots, keeping the ring only on matched pins.
  const caseStrokeOpacity = [
    'case',
    ['in', ['get', 'uniqueId'], ['literal', memberIds]],
    1,
    0
  ]
  if (m.getLayer('language-family-pins')) {
    m.setPaintProperty('language-family-pins', 'circle-color',          caseColor)
    m.setPaintProperty('language-family-pins', 'circle-opacity',        caseOpacity)
    m.setPaintProperty('language-family-pins', 'circle-stroke-opacity', caseStrokeOpacity)
  }
  _aggregateFilterActive = true

  // Fit bounds of the matching pins — padding leaves breathing room; maxZoom
  // prevents over-zoom when the aggregate is tightly clustered (e.g. a small
  // religion with only 3 members).
  if (Array.isArray(bounds) && bounds.length === 4) {
    const [minLng, minLat, maxLng, maxLat] = bounds
    try {
      m.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
        padding: 60,
        maxZoom: 6,
        duration: 1200
      })
    } catch (e) { /* fitBounds can throw on degenerate single-point bounds */ }
  }
}

// Un-apply the aggregate filter so the map returns to normal colors.
let _aggregateFilterActive = false
function clearAggregateFilter() {
  if (!_aggregateFilterActive) return
  const m = map.value
  if (!m?.getLayer('language-family-pins')) return
  m.setPaintProperty('language-family-pins', 'circle-color',          getBaseColorExpr())
  m.setPaintProperty('language-family-pins', 'circle-opacity',        0.9)
  m.setPaintProperty('language-family-pins', 'circle-stroke-opacity', 1)
  _aggregateFilterActive = false
}

// ─── Breakpoint detection (matches reference app: window.innerWidth) ──────────
// Uses window.innerWidth directly — more reliable than container size for
// initial load in Shadow DOM where the container can briefly report 0px.
function _onBreakpointResize() {
  uiStore.updateBreakpoint(window.innerWidth)
}

onMounted(() => {
  uiStore.updateBreakpoint(window.innerWidth)
  window.addEventListener('resize', _onBreakpointResize)
  // Container-size observer — sets CSS vars for responsive button/font scaling
  if (dsmRoot.value) {
    applyContainerScale(dsmRoot.value.offsetWidth)
    _containerObserver = new ResizeObserver(entries => {
      for (const entry of entries) applyContainerScale(entry.contentRect.width)
    })
    _containerObserver.observe(dsmRoot.value)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', _onBreakpointResize)
  _containerObserver?.disconnect()
  _containerObserver = null
})

const showHelpPopup  = ref(false)
const showSideMenu   = ref(false)

// ─── Reload map ───────────────────────────────────────────────────────────────
async function handleReloadMap() {
  showSideMenu.value = false
  appReady.value = false
  destroy()
  await initializeMap()
  if (!map.value) return
  const dataPromise = mapData.loadData().catch(() => ({ normalizedPeopleGroups: [] }))
  map.value.once('load', async () => {
    const { normalizedPeopleGroups } = await dataPromise
    await onMapReady(normalizedPeopleGroups)
  })
}

// ─── Tab switch ───────────────────────────────────────────────────────────────
function switchTab(tabId) {
  if (tabId === activeTabId.value) return
  activeTabId.value = tabId
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab || !map.value) return
  const strategyKey = tab.colorStrategy
  const colorMode =
    strategyKey === 'engagement' ? COLOR_MODES.ENGAGEMENT :
    strategyKey === 'adoption'   ? COLOR_MODES.ADOPTION :
    strategyKey === 'prayer'     ? COLOR_MODES.PRAYER_PROGRESS :
    COLOR_MODES.PRAYER_PROGRESS
  if (map.value.getLayer('language-family-pins')) {
    const colorExpr = buildColorExpression(colorMode)
    map.value.setPaintProperty('language-family-pins', 'circle-color', colorExpr)
    // Keep active + pulse layer colors in sync with base layer
    if (map.value.getLayer(ACTIVE_LAYER)) {
      map.value.setPaintProperty(ACTIVE_LAYER, 'circle-color', colorExpr)
    }
    PULSE_LAYERS.forEach(layerId => {
      if (map.value.getLayer(layerId)) {
        map.value.setPaintProperty(layerId, 'circle-color', colorExpr)
      }
    })
  }
}

// ─── Legend filter → dim/highlight pins ──────────────────────────────────────
// Layer stack (bottom → top):
//   language-family-pins-pulse  ← subtle breathing ring, below ALL pins (never overlaps dots)
//   language-family-pins        ← base layer, dimmed to 0.08 when filter active
//   language-family-pins-active ← matched pins on top: full opacity + theme-aware stroke
//
// Dim opacity is 0.08 — low enough that even dense cluster overlap can't fake a real pin.
// Pulse is opacity-only animation (0 → 0.28 sine wave) to avoid per-frame expression rebuilds.
// Stroke is white (#fff) on dark mode, near-black (#111) on light mode for clear contrast.

const ACTIVE_LAYER = 'language-family-pins-active'
const PULSE_LAYER  = 'language-family-pins-pulse'

let _pulseRaf      = null
let _pulsePhase    = 0
let _currentFilter = { type: null, key: null }

/**
 * 4 staggered pulse layers removed — per-feature modulo expressions on setFilter
 * caused visible lag on every legend click. Rolling wave deferred to future
 * WebGL custom layer implementation.
 */
const PULSE_BUCKET_COUNT = 1  // kept for future reference
const PULSE_LAYERS = [PULSE_LAYER]

// Pins slightly smaller — tighter at low zoom, comfortable at high zoom
const RADIUS_EXPR = [
  'interpolate', ['linear'], ['zoom'],
  0, 2.2, 2, 2.5, 4, 3, 5, 3.5, 6, 4.5, 7, 5.5, 8, 7, 10, 10, 12, 13, 14, 16
]

// Selected pins grow ~30% at every zoom stop — visible-without-overwhelming "pop".
// Used by ACTIVE_LAYER so matched/selected pins stand out from the dimmed base.
const ACTIVE_RADIUS_EXPR = [
  'interpolate', ['linear'], ['zoom'],
  0, 2.9, 2, 3.3, 4, 4, 5, 4.6, 6, 6, 7, 7.2, 8, 9, 10, 13, 12, 17, 14, 21
]

// Pulse ring ≈ 2× dot diameter (2× radius from center) — never "3-4× the dot"
const PULSE_RADIUS_EXPR = [
  'interpolate', ['linear'], ['zoom'],
  0, 4.4, 2, 5, 4, 6, 5, 7, 6, 9, 7, 11, 8, 14, 10, 20, 12, 26, 14, 32
]

/** 1–2px stroke — subtle at low zoom, slightly wider at high zoom */
const ACTIVE_STROKE_EXPR = [
  'interpolate', ['linear'], ['zoom'],
  0, 1, 6, 1.5, 12, 2
]

/**
 * Per-tier pulse ring color.
 * notEngaged / notAdopted use near-black pins → use a visible mid-tone
 * so the ring is distinguishable on both dark and light map backgrounds.
 */
const PULSE_COLORS = {
  prayer:     { noPrayer: '#e74c3c', hasPrayer: '#f39c12', fullPrayer: '#27ae60' },
  engagement: { notEngaged: '#5c6bc0', hasEngagement: '#7c3aed' },
  adoption:   { notAdopted: '#78909c', hasAdoption: '#0d9488' }
}

/**
 * "Dark pin" filters — notEngaged and notAdopted use a near-black fill (#1a1a2e).
 * On ANY background a dark stroke is invisible → force white ring for those.
 * All other pins are colored (red/orange/green/purple/teal) → use theme stroke.
 */
const DARK_PIN_KEYS = new Set(['notEngaged', 'notAdopted'])

/**
 * Muted neutral used for NON-matched base pins when a legend filter is active
 * AND overlapDensity is OFF. A solid gray avoids the transparency-stacking
 * density bleed that washes out orange pins at overlaps.
 *
 * Light mode: light-gray reads as dimmed on the white basemap.
 * Dark mode:  darker gray reads as dimmed on the dark basemap (a light gray
 *             on dark mode renders almost WHITE and draws the eye — wrong).
 */
const MUTED_GRAY_LIGHT = '#b9bfc6'
const MUTED_GRAY_DARK  = '#4b5360'
function mutedGray() { return isDark.value ? MUTED_GRAY_DARK : MUTED_GRAY_LIGHT }

/**
 * Returns the base layer's full color expression for the currently active
 * tab's colorStrategy. Used to restore the base layer after a filter clears.
 */
function getBaseColorExpr() {
  const tab = activeTab.value
  const mode =
    tab?.colorStrategy === 'engagement' ? COLOR_MODES.ENGAGEMENT :
    tab?.colorStrategy === 'adoption'   ? COLOR_MODES.ADOPTION :
    COLOR_MODES.PRAYER_PROGRESS
  return buildColorExpression(mode)
}

function getFilterStrokeColor(filterType, filterKey) {
  if (!filterKey) return getStrokeColor()
  return DARK_PIN_KEYS.has(filterKey) ? '#ffffff' : getStrokeColor()
}

/**
 * Returns stroke color for the current map theme.
 * With darkPinBorder feature OFF (default on doxa-simple-map), always returns
 * white — the pin stays visible without needing a dark ring in light mode.
 */
function getStrokeColor() {
  if (!FEATURES.darkPinBorder) return '#ffffff'
  return isDark.value ? '#ffffff' : '#111111'
}

/** Build the Mapbox filter expression for a given filter type + key */
function buildMatchExpr(filterType, filterKey) {
  if (filterType === 'prayer') {
    const pp = ['coalesce', ['to-number', ['get', 'peoplePraying'], 0], 0]
    if (filterKey === 'noPrayer')   return ['<=', pp, 0]
    if (filterKey === 'hasPrayer')  return ['all', ['>', pp, 0], ['<', pp, FULL_PRAYER_THRESHOLD]]
    if (filterKey === 'fullPrayer') return ['>=', pp, FULL_PRAYER_THRESHOLD]
  } else if (filterType === 'engagement') {
    const ev = ['get', 'engagementStatus']
    if (filterKey === 'hasEngagement') return ['any', ['==', ev, true], ['==', ev, 1]]
    if (filterKey === 'notEngaged')    return ['all', ['!=', ev, true], ['!=', ev, 1]]
  } else if (filterType === 'adoption') {
    const av = ['get', 'adoptionStatus']
    if (filterKey === 'hasAdoption') return ['any', ['==', av, true], ['==', av, 1]]
    if (filterKey === 'notAdopted')  return ['all', ['!=', av, true], ['!=', av, 1]]
  }
  return null
}

/**
 * Add single pulse layer BELOW language-family-pins.
 */
function initPulseLayer() {
  const m = map.value
  if (!m || m.getLayer(PULSE_LAYER)) return
  // Source must exist before we can add a layer referencing it
  if (!m.getSource('language-families')) return
  m.addLayer({
    id: PULSE_LAYER,
    type: 'circle',
    source: 'language-families',
    filter: ['==', 'uniqueId', ''],
    paint: {
      'circle-radius':  PULSE_RADIUS_EXPR,
      'circle-color':   '#ffffff',
      'circle-opacity': 0
    }
  }, 'language-family-pins')  // renders BELOW base pins
}

/** Add the active (selected-on-top) overlay layer; must be called after pins source exists */
function initActiveLayer() {
  const m = map.value
  if (!m) return
  // Source and base layer must exist before we add layers referencing them
  if (!m.getSource('language-families') || !m.getLayer('language-family-pins')) return

  // Pulse layer goes below pins, so init it first
  initPulseLayer()

  if (m.getLayer(ACTIVE_LAYER)) return
  const colorExpr = m.getPaintProperty('language-family-pins', 'circle-color')
                 ?? buildColorExpression(COLOR_MODES.PRAYER_PROGRESS)
  m.addLayer({
    id: ACTIVE_LAYER,
    type: 'circle',
    source: 'language-families',
    filter: ['==', 'uniqueId', ''],
    paint: {
      'circle-radius':         ACTIVE_RADIUS_EXPR,  // ~30% larger than base — "pop" on select
      'circle-color':          colorExpr,
      'circle-stroke-color':   getStrokeColor(),
      'circle-stroke-width':   ACTIVE_STROKE_EXPR,
      'circle-opacity':        1,
      'circle-stroke-opacity': 1
    }
  })
  // ACTIVE_LAYER is added last → naturally above all other layers
}

/** Stop rAF loop and hide pulse ring */
function stopPulse() {
  if (_pulseRaf) { cancelAnimationFrame(_pulseRaf); _pulseRaf = null }
  const m = map.value
  if (m?.getLayer(PULSE_LAYER)) {
    m.setFilter(PULSE_LAYER, ['==', 'uniqueId', ''])
    m.setPaintProperty(PULSE_LAYER, 'circle-opacity', 0)
  }
}

/**
 * Simple scalar sine pulse — single layer, one setPaintProperty/frame.
 * Smooth slow wave: 0.035 rad/frame ≈ 3 s cycle at 60 fps.
 * Uses plain sin so the ring fades in and out continuously — no on/off strobing.
 */
const WAVE_PEAK = 0.40

function startPulse(matchFilter, hexColor) {
  stopPulse()
  const m = map.value
  if (!m?.getLayer(PULSE_LAYER)) return
  m.setFilter(PULSE_LAYER, matchFilter)
  m.setPaintProperty(PULSE_LAYER, 'circle-color', hexColor)
  _pulsePhase = 0
  ;(function tick() {
    _pulsePhase += 0.035  // slow, smooth wave — ~3 s per cycle
    const opacity = ((Math.sin(_pulsePhase) + 1) / 2) * WAVE_PEAK
    m.setPaintProperty(PULSE_LAYER, 'circle-opacity', opacity)
    _pulseRaf = requestAnimationFrame(tick)
  })()
}

function clearActiveLayer() {
  stopPulse()
  const m = map.value
  if (m?.getLayer(ACTIVE_LAYER)) m.setFilter(ACTIVE_LAYER, ['==', 'uniqueId', ''])
}

/**
 * Dim/highlight pins when a legend filter card is clicked.
 * - Base: 0.08 opacity — dense overlaps can't fake a solid dot
 * - Pulse ring: subtle breathing in the tier's own color, rendered BELOW all pins
 * - Active layer: matched pins at full opacity + theme-aware contrast stroke (top of stack)
 */
function applyLegendFilter(filterType, filterKey) {
  const m = map.value
  if (!m || !m.getLayer('language-family-pins')) return

  if (!filterKey) {
    _currentFilter = { type: null, key: null }
    // Restore the tab's full color palette on the base layer (in case a previous
    // filter had painted it gray via the overlapDensity=false path).
    m.setPaintProperty('language-family-pins', 'circle-color', getBaseColorExpr())
    m.setPaintProperty('language-family-pins', 'circle-opacity', 0.9)
    m.setPaintProperty('language-family-pins', 'circle-stroke-opacity', 1)
    clearActiveLayer()
    return
  }

  const matchExpr = buildMatchExpr(filterType, filterKey)
  if (!matchExpr) {
    _currentFilter = { type: null, key: null }
    m.setPaintProperty('language-family-pins', 'circle-color', getBaseColorExpr())
    m.setPaintProperty('language-family-pins', 'circle-opacity', 0.9)
    clearActiveLayer()
    return
  }

  _currentFilter = { type: filterType, key: filterKey }

  // Base-layer de-emphasis behavior.
  //
  // With overlapDensity ON (future profiles): fade to 0.08 opacity — stacking
  //   overlaps build a "heat" indicator (deliberately). May create false-density
  //   bleed that can wash out certain pin colors — that's why it's feature-flagged.
  //
  // With overlapDensity OFF (this profile — default): recolor non-matched pins
  //   to a solid muted gray and keep full opacity. This gives clear matched/
  //   unmatched visual distinction WITHOUT any transparency-stacking artifact.
  //   The ACTIVE_LAYER on top renders matched pins in the tab's full color.
  if (FEATURES.overlapDensity) {
    m.setPaintProperty('language-family-pins', 'circle-opacity', 0.08)
    m.setPaintProperty('language-family-pins', 'circle-stroke-opacity', 0.05)
  } else {
    m.setPaintProperty('language-family-pins', 'circle-color', mutedGray())
    m.setPaintProperty('language-family-pins', 'circle-opacity', 0.85)
    // Drop the stroke on dim pins. The base stroke is white which glows on
    // the dark basemap and makes dim pins LOUDER than the matched ones.
    // Stroke stays at full opacity on the ACTIVE_LAYER highlighting matched pins.
    m.setPaintProperty('language-family-pins', 'circle-stroke-opacity', 0)
  }

  // Active layer: matched pins on top — smart stroke: white for dark pins, theme for others
  if (m.getLayer(ACTIVE_LAYER)) {
    m.setFilter(ACTIVE_LAYER, matchExpr)
    m.setPaintProperty(ACTIVE_LAYER, 'circle-stroke-color', getFilterStrokeColor(filterType, filterKey))
  }

  // Pulse ring: tier-tinted gentle breathing behind all dots
  const pulseColor = PULSE_COLORS[filterType]?.[filterKey] ?? '#888888'
  startPulse(matchExpr, pulseColor)

}

// Resync stroke + muted-gray dim when user toggles dark/light mode
watch(isDark, () => {
  const m = map.value
  if (!m) return
  if (m.getLayer(ACTIVE_LAYER)) {
    m.setPaintProperty(ACTIVE_LAYER, 'circle-stroke-color',
      getFilterStrokeColor(_currentFilter.type, _currentFilter.key))
  }
  // If a legend filter is currently active, re-apply the theme-appropriate gray
  // so non-matched pins don't flip to an "almost white" shade on dark mode.
  if (!FEATURES.overlapDensity && _currentFilter.key && m.getLayer('language-family-pins')) {
    m.setPaintProperty('language-family-pins', 'circle-color', mutedGray())
  }
})

watch(() => uiStore.prayerFilter,     (k) => applyLegendFilter('prayer',     k))
watch(() => uiStore.engagementFilter, (k) => applyLegendFilter('engagement', k))
watch(() => uiStore.adoptionFilter,   (k) => applyLegendFilter('adoption',   k))

// ─── Post-map-load setup (cloned from MapComponent.onMapReady) ────────────────
async function onMapReady(normalizedPeopleGroups) {
  // Register map with store
  mapStore.registerMap(mapId, map.value)

  // Projection — safe guard
  try {
    map.value.setProjection('mercator')
  } catch (e) {
  }

  // Add people group pins
  if (normalizedPeopleGroups?.length) {
    _lastNormalizedGroups = normalizedPeopleGroups
    const firstTab = tabs.value[0]
    const initMode =
      firstTab?.colorStrategy === 'engagement' ? COLOR_MODES.ENGAGEMENT :
      firstTab?.colorStrategy === 'adoption'   ? COLOR_MODES.ADOPTION :
      COLOR_MODES.PRAYER_PROGRESS
    mapLayers.addLanguageFamilyLayer(normalizedPeopleGroups, initMode)
    // SHELVED: idle preloader caused slow startup — re-enable when pray-tools API is active
    // and only for groups that have confirmed valid image URLs
    // preloadPeopleGroupImages(normalizedPeopleGroups)
  } else {
  }

  // Initialize GO marker highlight layer (after language-families source is added)
  selectedPin.initialize()

  // Add active (selected-on-top) layer after pins source exists
  initActiveLayer()

  // Apply basemap locale (translates country/place names on the tiles).
  applyBasemapLocale(locale.value)

  // Mark app ready → v-if gates open, legend mounts
  mapStore.setMapReady(mapId)
  appReady.value = true
}

// Live-switch basemap labels if locale changes during the session
// (page usually reloads on Polylang switch, but this keeps things robust).
watch(locale, (loc) => applyBasemapLocale(loc))

// ─── Lifecycle — cloned from MapComponent.mounted ─────────────────────────────
onMounted(async () => {
  activeTabId.value = tabs.value[0]?.id ?? 'prayer'
  // Initial breakpoint — will be refined immediately by ResizeObserver below
  uiStore.updateBreakpoint(window.innerWidth)

  // 1. Start data loading immediately (runs in parallel with map init)
  const dataPromise = mapData.loadData().catch(err => {
    console.error('[doxa-simple-map] Data load failed:', err)
    return { normalizedPeopleGroups: [] }
  })

  // 2. Initialize map (returns before 'load' fires)
  await initializeMap()

  if (!map.value) {
    console.error('[doxa-simple-map] Map failed to initialize — check token and container')
    return
  }

  // 3. After 'style.load': add layers, register, set ready.
  //    Using style.load (fires when style JSON + sprites are ready) instead of
  //    'load' (fires after all tiles render) — pins are GeoJSON so they don't
  //    need tiles, this saves 1-4 seconds on first paint.
  map.value.once('style.load', async () => {
    try {
      const { normalizedPeopleGroups } = await dataPromise
      await onMapReady(normalizedPeopleGroups)
    } catch (err) {
      console.error('[doxa-simple-map] onMapReady failed:', err)
    }
  })
})

onBeforeUnmount(() => {
  clearActiveLayer()
  mapStore.unregisterMap(mapId)
  selectedPin.cleanup()
  destroy()
})
</script>

<template>
  <div
    ref="dsmRoot"
    class="dsm-root"
    :class="{ 'dsm-dark': isDark, 'dsm-rtl': isRTL }"
    :dir="isRTL ? 'rtl' : 'ltr'"
  >

    <!-- In-map tab bar (only when 2+ tabs) -->
    <div v-if="showTabBar" class="dsm-tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="dsm-tab"
        :class="{ active: activeTabId === tab.id }"
        @click="switchTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Map area -->
    <div class="dsm-map-area">
      <div v-if="!appReady" class="dsm-loading">Loading map…</div>
      <div ref="mapContainer" class="dsm-map-canvas" />

      <!-- Geocoder search bar — added to top-left first so hamburger floats right of it.
           Supplements Mapbox's place results with DOXA people-group / country /
           language / religion matches via the localGeocoder option (see
           GeocoderComponent + useDoxaSearch composable). When the user picks
           a people-group result we open the detail popup in addition to the
           default flyTo behavior. -->
      <GeocoderComponent
        v-if="appReady && map"
        :map-instance="map"
        :access-token="mapboxToken"
        :is-dark="isDark"
        :data-source-id="dataSource"
        @people-group-result="handlePeopleGroupResult"
        @aggregate-result="handleAggregateResult"
        @clear="handleSearchClear"
      />

      <!-- Hamburger menu toggle — feature-flagged off on doxa-simple-map.
           With flag off, the search bar alone fills the top-left slot. -->
      <HamburgerButton
        v-if="FEATURES.hamburgerMenu && appReady && map"
        :map="map"
        :is-open="showSideMenu"
        :is-dark="isDark"
        @toggle="showSideMenu = !showSideMenu"
      />

      <!-- Side menu drawer — only rendered when hamburger feature is on -->
      <SideMenuDrawer
        v-if="FEATURES.hamburgerMenu && appReady"
        :is-open="showSideMenu"
        :is-dark="isDark"
        @close="showSideMenu = false"
        @reload-map="handleReloadMap"
      />

      <!-- Legend renders inside shadow root, gated on appReady -->
      <LegendDesktop
        v-if="appReady"
        :legend-type="activeLegendType"
        :popup-action="activePopupAction"
        :initially-collapsed="false"
        :is-dark="isDark"
      />

      <!-- Map controls — each button is an explicit instance bound to THIS map.
           MapToolbar is a layout-only shell (positioned column + slot).
           Binding :map="map" here guarantees that in a multi-map profile
           these buttons operate ONLY on their own map instance. -->
      <MapToolbar v-if="appReady">
        <ZoomInButton      :map="map"          :is-dark="isDark" />
        <ZoomOutButton     :map="map"          :is-dark="isDark" />
        <LocationButton    :map="map"          :is-dark="isDark" />
        <FullscreenButton  :map-container="mapContainer" :is-dark="isDark" />
        <ThemeToggleButton :is-dark="isDark"   @toggle="handleToggleTheme" />
        <!-- "About this map" info button — feature-flagged off on this profile -->
        <HelpButton v-if="FEATURES.infoButton" :is-dark="isDark" @open-help="showHelpPopup = true" />
      </MapToolbar>

      <!-- Help popup modal -->
      <div v-if="showHelpPopup" class="dsm-help-overlay" @click.self="showHelpPopup = false">
        <div class="dsm-help-modal">
          <button class="dsm-help-close" @click="showHelpPopup = false">×</button>
          <h2>About This Map</h2>
          <p>This map displays Unreached People Groups (UPGs) around the world — communities without meaningful access to the Gospel.</p>
          <p>Use the tabs (if shown) to switch between Prayer and Engagement views. Click any dot to learn more about a people group.</p>
          <p>Data sourced from <strong>pray.doxa.life</strong>.</p>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.dsm-root { position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; }
.dsm-tab-bar { flex: 0 0 auto; display: flex; align-items: center; background: #fff; border-bottom: 2px solid #e0e0e0; box-shadow: 0 2px 4px rgba(0,0,0,.08); height: 48px; padding: 0 12px; gap: 4px; z-index: 10; }
.dsm-tab { background: none; border: none; padding: 0 20px; height: 100%; font-size: 14px; font-weight: 500; color: #555; cursor: pointer; border-bottom: 3px solid transparent; transition: color .15s, border-color .15s, background .15s; white-space: nowrap; }
.dsm-tab:hover  { background: rgba(52,152,219,.06); color: #3498db; }
.dsm-tab.active { color: #3498db; border-bottom-color: #3498db; background: rgba(52,152,219,.06); }
.dsm-map-area   { flex: 1 1 0; position: relative; overflow: hidden; }
.dsm-map-canvas { position: absolute; inset: 0; }
.dsm-loading    { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: #f8f9fa; color: #555; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; z-index: 5; }
</style>
