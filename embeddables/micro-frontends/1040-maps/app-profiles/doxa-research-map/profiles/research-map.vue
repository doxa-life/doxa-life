<script setup>
/**
 * research-map.vue — Application Profile: Research Map
 *
 * The "researcher's workbench" archetype. Composes every framework piece a
 * subject-matter expert (missiologist, demographer, ethnographer) needs to
 * produce a publishable map: clustering, fly-to navigation, multi-field
 * filters, language-family legend, detail panel, and large-format poster
 * export.
 *
 * profile-config shape (minimal for research-map):
 *   {
 *     "profile":   "research-map",
 *     "tk":        "pk.eyJ...",
 *     "dataSource": "pray-tools",
 *     "instanceId": "any-stable-id"
 *   }
 * Tabs are NOT configurable from outside this profile — they're baked in.
 * To change them, edit the TABS constant in this file.
 *
 * BAKED-IN TABS (updated 2026-05-09 — new 7-tab layout):
 *   1. Prayer Progress     (prayerProgress / prayer)
 *   2. Adoption            (adoption / adoption)
 *   3. Engagement          (engagement / engagement)           [separator after]
 *   4. People Groups       (affinityBlock / affinity-block)    [was "Affinity Blocks"]
 *   5. WAGF Regions        (doxaRegion / doxa-regions)
 *   6. Languages           (languageFamily / language-families)
 *   7. Religions           (religion / religion)
 */

import { inject, provide, ref, computed, onMounted, onBeforeUnmount, watch, markRaw, nextTick, defineAsyncComponent, toRef } from 'vue'

// ─── Composables (framework) ─────────────────────────────────────────────────
import { useMapInstance }  from '@map/composables/useMapInstance.js'
import { useMapLayers }    from '@map/composables/useMapLayers.js'
import { useMapEvents }    from '@map/composables/useMapEvents.js'
import { useMapFly }       from '@map/composables/useMapFly.js'
import { useSelectedPin }  from '@map/composables/useSelectedPin.js'
import { useShadowStyles } from '@map/composables/useShadowStyles.js'
import { FULL_PRAYER_THRESHOLD } from '@map/config/prayerColors.js'

// TODO(Wave 3): useMapData lives in doxa-map-mfe; not yet ported to template.
// Parallel agent ports it to template/src/composables/useMapData.js.
import { useMapData }      from '@map/composables/useMapData.js'

// PERF: useMapClustering pulls in MSTClusteringUtil + NetworkClusteringUtil +
// ClusterHelpers (~30 KB total). Clusters are off by default — defer the
// import + instantiation until the user toggles them on. See `getClustering()`
// below.

// PERF: useMapPoster pulls in the tile-stitch + PDF composition pipeline
// (~117 KB). It's only needed when the user opens the poster dialog. Defer
// the import until that happens — see `openPoster()` below.
let _posterPromise = null

// ── Geocoder-clear guard ─────────────────────────────────────────────────────
// Prevents the feedback loop: legend-X → selectFamily(null) → watcher →
// applyDimFilter(null) → _clearGeocoderProgrammatic() → 'clear' event →
// onGeocoderClear → selectFamily(null) → watcher → ... (infinite).
// _geoBeingCleared is set synchronously around every programmatic clear() call
// so onGeocoderClear can tell it apart from a real user-X click.
let _geoBeingCleared = false
function _clearGeocoderProgrammatic() {
  _geoBeingCleared = true
  // geocoderRef.value.geocoder is the exposed ref<MapboxGeocoder>; .value is the instance.
  const inst = geocoderRef.value?.geocoder?.value
  inst?.clear?.()
  // Belt-and-suspenders: Mapbox geocoder's clear() sometimes leaves the
  // selected feature's text in the DOM input (especially after user picked
  // an aggregate result). Force-reset the input element directly so tab
  // switches don't carry over the prior tab's "Afro-Asiatic (219)" text.
  // qa: 2026-05-02 — user reported persistent search text across tabs.
  const input = inst?._inputEl
    || inst?.container?.querySelector?.('input.mapboxgl-ctrl-geocoder--input')
  if (input) {
    input.value = ''
    try { input.dispatchEvent(new Event('input', { bubbles: true })) } catch (_) {}
  }
  _geoBeingCleared = false
}

// Mirror setFilter to the invisible hitbox layer so click targets stay in sync.
function _syncHitboxFilter(m, filter) {
  if (m?.getLayer('language-family-pins-hitbox')) {
    try { m.setFilter('language-family-pins-hitbox', filter) } catch (_) {}
  }
}

// Tells the legend to collapse other expanded families and scroll the newly
// selected row into view. Only fired on geocoder-driven selections so direct
// legend-row clicks don't disturb the user's manual expansion state
// (per qa-buildinng-round-1 R3 A5 — auto-collapse only on search reveal).
function _emitLegendReveal() {
  if (typeof window === 'undefined') return
  if (typeof window.CustomEvent !== 'function') return
  window.dispatchEvent(new CustomEvent('legend:reveal-selected', { detail: { mapId } }))
}
function loadPoster() {
  if (!_posterPromise) {
    _posterPromise = import('@map/composables/useMapPoster.js')
      .then(m => m.useMapPoster({
        sourceMap:   () => map.value,
        mapboxToken: mapboxToken.value,
        styleUrl:    () => map.value?.getStyle()?.sprite?.replace(/\/sprite.*$/, '') || profileConfig?.value?.style
      }))
  }
  return _posterPromise
}

// TODO(Wave 3): useLegendData lives in doxa-map-mfe; parallel agent ports it
// to template/src/composables/useLegendData.js.
import { useLegendData }   from '@map/composables/useLegendData.js'

// ─── Config + utils ──────────────────────────────────────────────────────────
import { mapDefaults }            from '@map/config/mapConfig.js'
import { getColorStrategy }       from '@map/config/colorStrategies.js'
import { DataSourceManager }      from '@map/utils/DataSourceManager.js'
import sourcesConfig              from '@map/config/sources.json'

// ─── Components ──────────────────────────────────────────────────────────────
import LegendDesktop  from '@map/components/LegendDesktop.vue'
// LegendTools — Fly + Clusters floating toolbar. Mounted as a SIBLING of the
// legend (not a child) so its CSS lives in its own useShadowStyles namespace
// and doesn't fight the legend card's selectors. Per UX 2026-04-27.
import LegendTools    from '@map/components/LegendTools.vue'
// PERF: LegendMobile only renders below the @media(max-width:767px) breakpoint.
// Defer the import so desktop users never load it.
const LegendMobile = defineAsyncComponent(() => import('@map/components/LegendMobile.vue'))

// Map toolbar — canonical modular pattern from the read-only simple-map mfe.
// MapToolbar is the slot-wrapper; the individual button components are children.
// Tabs 1-3 (engagement / prayer / adoption) are exact clones of simple-map and
// must mount this exact button set in this exact order.
import MapToolbar        from '@map/components/map-controls/MapToolbar.vue'
import ZoomInButton      from '@map/components/map-controls/ZoomInButton.vue'
import ZoomOutButton     from '@map/components/map-controls/ZoomOutButton.vue'
import LocationButton    from '@map/components/map-controls/LocationButton.vue'
import FullscreenButton  from '@map/components/map-controls/FullscreenButton.vue'
import ThemeToggleButton from '@map/components/map-controls/ThemeToggleButton.vue'
import HamburgerButton   from '@map/components/map-controls/HamburgerButton.vue'
import GeocoderComponent from '@map/components/map-controls/GeocoderComponent.vue'

// TODO(Wave 3): SideMenuDrawer ports from doxa-map-mfe.
// PERF: SideMenuDrawer is unused in the current research-map template (the
// ResearchMapSideMenu sibling renders the actual menu). Removed entirely from
// the boot path until something needs it.
// import SideMenuDrawer from '@map/components/SideMenuDrawer.vue'

// PERF: PeopleGroupDetail (~115 KB with its CSS bundle) only renders after
// the user clicks a pin. Async-import it so it stays off the critical boot.
const PeopleGroupDetail = defineAsyncComponent(() => import('@map/components/PeopleGroupDetail.vue'))

// New components written in this same wave:
import ResearchMapSideMenu    from '@map/components/ResearchMapSideMenu.vue'
import ResearchMapFilterPanel from '@map/components/ResearchMapFilterPanel.vue'
import SemanticTreeLegend     from '@map/components/SemanticTreeLegend.vue'
// Per-map mediator instance (PPLR-ported). createPplrInstance + provideInstance
// give the SemanticTreeLegend its selection/activeTab/theme refs via inject().
import { createPplrInstance, provideInstance } from '@map/composables/usePplrInstance.js'
// langTree adapter — converts our normalized people-groups into the generic
// {id,label,color,count,pop,filter,children} shape SemanticTreeLegend takes.
import { useLanguageFamilyLegendData } from '@map/composables/useLanguageFamilyLegendData.js'
// affinityTree adapter — parallel to langTree, produces the same {id,label,color,count,pop,filter,children}
// shape from rop1 (affinity bloc) + imb_reg_of_people_2 (cluster) + people group, so the SAME
// SemanticTreeLegend instance can render either depending on activeLegendType.
import { useAffinityBlockLegendData } from '@map/composables/useAffinityBlockLegendData.js'
import { useWagfRegionsLegendData }   from '@map/composables/useWagfRegionsLegendData.js'
import { useLegendData as useFlatLegendData } from '@map/composables/useLegendData.js'
import { RESEARCH_LEGEND_OPTIONS } from '@map/composables/researchLegendOptions.js'

// PERF: PosterDialog only renders when the user opens the poster export
// flow. Async-import it so the dialog's deps don't load on every map boot.
const PosterDialog = defineAsyncComponent(() => import('@map/components/poster/PosterDialog.vue'))

// ─── Shadow-DOM style injection ──────────────────────────────────────────────
useShadowStyles(`
  /* ── Canonical geocoder + legend container CSS (clone of doxa-simple-map.vue
       lines 50-138) so tabs 1-3 render the geocoder + legend at the same
       400/360/280 px responsive widths the simple-map mfe uses. The
       --map-legend-width / --map-btn-size / --map-toolbar-gap / --map-font-md
       / --map-font-sm CSS vars are set by applyContainerScale() below. ── */
  /* Geocoder column matches the SemanticTreeLegend's .stl-panel — left:8px,
     width:380px — so the search bar and the legend stack as one column at
     the same x-edge (PPLR alignment, qa: 2026-05-02). */
  .mapboxgl-ctrl-top-left { top:12px!important;left:8px!important;width:380px!important;max-width:380px!important;z-index:1200!important; }
  .mapboxgl-ctrl-top-left .mapboxgl-ctrl { margin:0!important;float:none!important; }
  /* Pill geometry + PPLR-matched focus ring (qa: 2026-05-02). border-radius
     999px matches PPLR's .pgc-input-wrap; focus-within ring uses PPLR's
     accent rgba(59,70,61,0.18) so the search bar reads as one column with
     the SemanticTreeLegend below it. Input font-size:13px / placeholder
     12px mirror PPLR's typography. */
  .mapboxgl-ctrl-geocoder { width:100%!important;max-width:100%!important;min-width:0!important;border-radius:999px!important;box-shadow:0 2px 8px rgba(0,0,0,0.15)!important;background:#fff;transition:box-shadow 0.12s,border-color 0.12s; }
  .mapboxgl-ctrl-geocoder:focus-within { box-shadow:0 2px 8px rgba(0,0,0,0.15),0 0 0 3px rgba(59,70,61,0.18)!important; }
  .mapboxgl-ctrl-geocoder--input { border-radius:999px!important;font-size:13px!important; }
  .mapboxgl-ctrl-geocoder--input::placeholder { font-size:12px!important; }
  .mapboxgl-ctrl-geocoder:has(.mapboxgl-ctrl-geocoder--input:not(:placeholder-shown)) .mapboxgl-ctrl-geocoder--button { display:block!important; }
  .mapboxgl-ctrl-geocoder--suggestions { z-index:1200!important;position:absolute;max-height:60vh!important;overflow-y:auto!important; }
  .suggestions { border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-height:60vh!important;overflow-y:auto!important; }
  .mapboxgl-ctrl-geocoder--suggestions::-webkit-scrollbar,
  .suggestions::-webkit-scrollbar { width:8px; }
  .mapboxgl-ctrl-geocoder--suggestions::-webkit-scrollbar-thumb,
  .suggestions::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.3);border-radius:4px; }
  .mapboxgl-ctrl-geocoder--suggestions::-webkit-scrollbar-track,
  .suggestions::-webkit-scrollbar-track { background:rgba(0,0,0,0.05); }
  .dg-main { font-weight:500;font-size:13px;color:#222;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .dg-main strong { font-weight:700; }
  .dg-meta { margin-top:2px;display:flex;flex-wrap:wrap;gap:4px 10px;font-size:11px;color:#555;line-height:1.35; }
  .dg-field strong { font-weight:600;color:#333;margin-right:2px; }
  /* Geocoder section divider headers — non-clickable visual labels */
  .suggestions li:has(.dg-section-header-item) > a { pointer-events:none!important;cursor:default!important;background:none!important;padding:4px 10px 2px!important; }
  .dg-section-header-item { font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#9ca3af;padding:2px 0; }
  .dsm-dark .dg-section-header-item { color:rgba(243,243,241,0.45); }
  @media(max-width:767px){
    .mapboxgl-ctrl-top-left { top:10px!important;left:10px!important;right:10px!important;width:calc(100% - 20px)!important;max-width:none!important; }
  }

  /* ── Dark mode for the geocoder pill + suggestions dropdown — clone of
       doxa-simple-map.vue:99-124. Selectors keyed on .dsm-dark (mirrored on
       .rm-root by the isDark binding). Without these rules the geocoder stays
       white in dark mode (qa.md Round 3 Q4). ── */
  .dsm-dark .mapboxgl-ctrl-geocoder { background:#4e594f!important;border:1px solid rgba(255,255,255,0.14)!important;box-shadow:0 2px 8px rgba(0,0,0,0.4)!important; }
  .dsm-dark .mapboxgl-ctrl-geocoder:focus-within { box-shadow:0 2px 8px rgba(0,0,0,0.4),0 0 0 3px rgba(115,161,127,0.22)!important; }
  .dsm-dark .mapboxgl-ctrl-geocoder--input { color:#F3F3F1!important;background:transparent!important; }
  .dsm-dark .mapboxgl-ctrl-geocoder--input::placeholder { color:rgba(243,243,241,0.65)!important; }
  .dsm-dark .mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--icon { fill:rgba(243,243,241,0.75)!important; }
  .dsm-dark .mapboxgl-ctrl-geocoder--button { background:transparent!important; }
  .dsm-dark .mapboxgl-ctrl-geocoder--icon-close { fill:rgba(243,243,241,0.75)!important; }
  .dsm-dark .mapboxgl-ctrl-geocoder--button:hover .mapboxgl-ctrl-geocoder--icon-close { fill:#F3F3F1!important; }
  .dsm-dark .suggestions { background:#3b463d!important;border:1px solid rgba(255,255,255,0.12)!important; }
  .dsm-dark .suggestions > li { background:transparent!important; }
  .dsm-dark .suggestions > li > a { background:transparent!important;color:#F3F3F1!important; }
  .dsm-dark .suggestions > li.active > a,
  .dsm-dark .suggestions > li.selected > a,
  .dsm-dark .suggestions > li:hover > a,
  .dsm-dark .suggestions > li > a:hover,
  .dsm-dark .suggestions > li > a:focus { background:rgba(255,255,255,0.1)!important;color:#F3F3F1!important; }
  .dsm-dark .dg-main { color:#F3F3F1!important; }
  .dsm-dark .dg-meta { color:rgba(243,243,241,0.75)!important; }
  .dsm-dark .dg-field strong { color:#F3F3F1!important; }

  /* isolation:isolate forces .rm-root to form its own stacking context so
     internal z-indexes (geocoder 1200, legend 1000, toolbar 10) compare only
     against each other and do NOT leak out to compete with page-level
     elements like the site nav / hamburger menu (qa: 2026-05-04 user
     reported the geocoder pill rendering above the page menu). Without
     this, the host element doesn't establish a stacking context and the
     internal 1200 wins against any page elements with z-index < 1200. */
  .rm-root { position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;background:#ffffff;color:#1f2937;isolation:isolate; }
  .rm-root.rm-dark { background:#1a1a2e;color:#F3F3F1; }

  /* Tab bar: matches the doxa-life site header — dark green-grey background,
     light beige text, Poppins 500. The 3.5rem-rounded card corner from
     .rounded-xlg on the host <DoxaMapSlot> clips the bar's top-left, so
     padding-left:64px keeps the first tab ("Prayer") fully visible. */
  .rm-tab-bar {
    flex:0 0 auto;display:flex;align-items:center;
    background:#4e594f;
    border-bottom:1px solid rgba(255,255,255,0.10);
    height:44px;
    /* Inline padding clears the rounded slot corner so the first tab
       ("Prayer") doesn't sit under the curve. Desktop bumps the start side
       to 36px because .rounded-xlg eats a much larger chunk of the
       top-left corner than the standard 16px gutter; end side stays 16px.
       Mobile @media block below resets both sides back to 16px since the
       mobile slot uses a smaller radius and the existing 16px is correct
       there (qa: 2026-05-04 user feedback — desktop only). Active-tab
       scrollIntoView still uses 16px scroll-padding which is fine — the
       tab is already visible, just nudged by the static padding. */
    padding-inline-start:36px;
    padding-inline-end:16px;
    scroll-padding-inline:16px;
    gap:var(--spacing-3xl,28px);
    z-index:10;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none;
    font-family:'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  }
  .rm-tab-bar::-webkit-scrollbar{display:none;width:0;height:0;}
  .rm-dark .rm-tab-bar { background:#2a332a;border-bottom-color:rgba(255,255,255,0.10); }
  .rm-tab {
    background:none;border:none;padding:0;height:100%;
    font-family:inherit;
    font-size:14px;font-weight:500;
    color:#F3F3F1;
    cursor:pointer;
    border-bottom:2px solid transparent;
    white-space:nowrap;
    transition:color .12s,border-color .12s,background .12s;
  }
  .rm-tab:hover { color:#cbc5b9; }
  .rm-tab.active { color:#cbc5b9;border-bottom-color:#cbc5b9; }
  /* Separator: thin vertical bar between simple-map-style tabs (Prayer/Adoption/
     Engagement) and research-only tabs (Languages/Affinity Blocks/Religion).
     Sits at ~50% height so it reads as a divider, not as a tall border. */
  .rm-tab-sep {
    flex: 0 0 1px;
    align-self: center;
    width: 1px;
    height: 50%;
    background: rgba(255, 255, 255, 0.7);
    pointer-events: none;
  }
  .rm-dark .rm-tab { color:rgba(243,243,241,0.85); }
  .rm-dark .rm-tab:hover { color:#F3F3F1; }
  .rm-dark .rm-tab.active { color:#cbc5b9;border-bottom-color:#cbc5b9; }
  @media(max-width:767px){
    .rm-tab-bar { padding-inline:16px; scroll-padding-inline:16px; gap:16px; height:40px; }
    .rm-tab { font-size:13px; }
  }
  .rm-map-area { flex:1 1 0;position:relative;overflow:hidden; }
  .rm-map-canvas { position:absolute;inset:0; }
  .rm-loading { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#0f1216;color:#7c8cf8;font:13px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;z-index:5; }
  .rm-badge { position:absolute;top:10px;right:10px;background:rgba(124,140,248,0.12);color:#7c8cf8;border:1px solid rgba(124,140,248,0.3);padding:3px 9px;border-radius:4px;font-size:11px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;pointer-events:none;z-index:50; }
  /* Mobile-only legend slot — desktop hides via @media */
  .rm-legend-mobile-slot { display:none; }
  @media(max-width:767px){
    .rm-legend-mobile-slot { display:block; }
    .rm-legend-desktop-slot { display:none; }
  }
  .map-scroll-edge { position:absolute;top:0;bottom:0;width:40px;z-index:2;touch-action:pan-y;pointer-events:auto;background:transparent; }
  .map-scroll-edge--left { left:0; }
  .map-scroll-edge--right { right:0; }
`, 'research-map')

// ─── Config from ProfileLoader (provide/inject — never direct imports) ──────
const profileConfig = inject('profileConfig')
const mapboxToken   = inject('mapboxToken')
const dataSource    = inject('dataSource')
const colorSet      = inject('colorSet')
const injectedInstanceId = inject('instanceId', null)

// Stores — instance-scoped Pinia, supplied by ProfileLoader
const mapStore  = inject('mapStore')
const dataStore = inject('dataStore')
const uiStore   = inject('uiStore')

// ─── Tabs (HARDCODED for this profile) ───────────────────────────────────────
// This profile is self-contained: tabs are NOT read from profileConfig or
// inject('tabs'). The host's profile-config shrinks to { profile, tk,
// dataSource, instanceId }. To change the tabs, edit this constant.
//
// SOURCE OF TRUTH — these tabs mirror the OLD research map verbatim:
//   /DOXA/doxa-map-app-widget/src/config/mapConfig.js
//     - tabOrder    (line 434):  ['prayer', 'doxa-regions', 'affinity-blocks',
//                                  'language-families', 'gospel-resources']
//     - per-tab cfg (lines 138-429): legendType, colorMode, popup.template
//
// VERIFIED KEY MATCHES against framework:
//   colorStrategy: keys come from COLOR_MODES (template/src/config/colors.js:20-30).
//     prayerProgress, doxaRegion, affinityBlock, languageFamily, resource — all defined.
//     (NOTE: the OLD app's "prayer" tab was a literal alias of doxa-regions —
//      same colorMode/legend. The framework has a richer prayerProgress
//      strategy + dedicated `prayer` legend, so we use those for the prayer tab.
//      This is the only intentional upgrade vs. a strict 1:1 mirror.)
//   legend: keys come from useLegendData switch arms (template/src/composables/
//     useLegendData.js:156-262). All five — prayer, doxa-regions, affinity-blocs,
//     language-families, gospel-resources — are present.
// FEATURES — flip to true to re-enable a tab. The Doxa Regions tab is
// feature-flagged OFF per UX request 2026-04-27 (kept in code so the wiring
// stays warm; flip `doxaRegions: true` to bring it back).
const FEATURES = {
  doxaRegions:    true,
  hamburgerMenu:  false,  // canonical default — emit/listen mismatch + drawer surplus
  // Per QA building-round-1 R3 A4: clear the geocoder text on tab switch by
  // default; flip to true to preserve the previous tab's query when returning.
  geocoderPersistAcrossTabs: false
}

// Tab order: Prayer → Adoption → Engagement → Language Families
// (qa: 2026-05-04 user feedback — Adoption swapped before Engagement so
// the order reads as the user-flow ladder Prayer → Adopt → Engage rather
// than the previous alphabetical Engagement-before-Adoption.)
const ALL_TABS = [
  { id: 'prayer',            label: 'Prayer',            colorStrategy: 'prayerProgress', legend: 'prayer',            popup: 'pray',  feature: null            },
  { id: 'adoption',          label: 'Adoption',          colorStrategy: 'adoption',       legend: 'adoption',          popup: 'adopt', feature: null            },
  { id: 'engagement',        label: 'Engagement',        colorStrategy: 'engagement',     legend: 'engagement',        popup: 'pray',  feature: null,           sepAfter: true },
  { id: 'affinity-blocks',   label: 'People Groups',     colorStrategy: 'affinityBlock',  legend: 'affinity-block',    popup: 'pray',  feature: null            },
  { id: 'doxa-regions',      label: 'Regions',            colorStrategy: 'doxaRegion',     legend: 'doxa-regions',      popup: 'pray',  feature: 'doxaRegions'   },
  { id: 'language-families', label: 'Languages',         colorStrategy: 'languageFamily', legend: 'language-family',   popup: 'pray',  feature: null            },
  { id: 'religion',          label: 'Religions',         colorStrategy: 'religion',       legend: 'religion',          popup: 'pray',  feature: null            }
]
const TABS = ALL_TABS.filter(t => !t.feature || FEATURES[t.feature])
const tabs       = computed(() => TABS)
const showTabBar = computed(() => true)

const activeTabId = ref(null)
const activeTab   = computed(() => tabs.value.find(t => t.id === activeTabId.value) ?? tabs.value[0])
const activeLegendType = computed(() => activeTab.value?.legend ?? 'default')
const activePopupAction = computed(() => activeTab.value?.popup ?? 'pray')

// Per-tab geocoder placeholder. The Language Families tab makes the search
// scope explicit ("Search language family, language, dialect/variety") so users
// know the search is wired to the legend's hierarchy. Other tabs use the
// default i18n placeholder ("Search people, place, language, religion").
const geocoderPlaceholder = computed(() => {
  if (activeTab.value?.id === 'language-families') {
    return 'Search language family, language, dialect/variety'
  }
  if (activeTab.value?.id === 'affinity-blocks') {
    return 'Search affinity bloc, cluster, people group'
  }
  return ''  // empty → GeocoderComponent falls back to i18n default
})

// ─── Map ID + container refs ─────────────────────────────────────────────────
// Per-instance map ID. Each <doxa-map> on the page MUST have a unique value so
// shared composables (mapStore, dataStore, clustering) don't bleed state
// across instances. Prefer the host-supplied `instanceId`; otherwise fall back
// to a 12-char random suffix that is collision-resistant for tens of instances.
const mapId = (injectedInstanceId?.value || injectedInstanceId) ||
  ('research-map-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8))
provide('mapId', mapId)

const rmRoot       = ref(null)
const tabBar       = ref(null)
const geocoderRef  = ref(null)

// Auto-center the active tab on switch so users always see what they tapped,
// even when the tab bar overflows the visible width (qa.md R8 spec).
// Per-tab legend tier memory: switching tabs saves the outgoing tab's
// legend state and restores the incoming tab's prior state (default
// 'collapsed' on first visit). Replaces the iter-3 always-collapse-on-
// switch behavior, which the user found jarring — they want returning
// to a tab to restore whatever tier (collapsed / open / fullyOpen) they
// last had it at. qa: 2026-05-02.
const _tabLegendState = new Map()
watch(() => activeTabId?.value, async (newTabId, oldTabId) => {
  if (oldTabId !== undefined && newTabId !== oldTabId) {
    // Save outgoing tab's current state under the OLD tab id.
    if (oldTabId) _tabLegendState.set(oldTabId, uiStore.legendState)
    // Restore incoming tab's state (collapsed default for first visit).
    const restored = _tabLegendState.get(newTabId) || (uiStore.isMobile ? 'collapsed' : 'open')
    if (restored === 'fullyOpen')   uiStore.fullyOpenLegend?.()
    else if (restored === 'open')   uiStore.openLegend?.()
    else                             uiStore.collapseLegend?.()
  }
  await nextTick()
  const btn = tabBar.value?.querySelector('.rm-tab.active')
  btn?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' })
})
const mapContainer = ref(null)
const appReady     = ref(false)

// ─── Map instance (shadow-DOM safe — element ref, never string ID) ───────────
const { map, isMapReady, initializeMap, destroy } = useMapInstance({
  containerRef: mapContainer,
  accessToken:  mapboxToken.value,
  style:        profileConfig?.value?.style   ?? 'mapbox://styles/mapbox/light-v11',
  center:       profileConfig?.value?.center  ?? mapDefaults.center ?? [20, 10],
  zoom:         profileConfig?.value?.zoom    ?? mapDefaults.zoom   ?? 1.8,
  pitch:        profileConfig?.value?.pitch   ?? mapDefaults.pitch  ?? 0,
  bearing:      profileConfig?.value?.bearing ?? mapDefaults.bearing?? 0
})

// ─── Data composable ─────────────────────────────────────────────────────────
// Lean instantiation — no lookups, no detectLocale. The shared DSM handles
// {value,label} from pray-tools natively; raw codes fall through unchanged.
const dsm = new DataSourceManager({ sourcesConfig })
const mapData = useMapData({
  mapId,
  dataSourceId:      dataSource.value,
  dataSourceManager: dsm,
  dataStore,
  markRaw:           (v) => v
})

// ─── Layers composable ───────────────────────────────────────────────────────
const mapLayers = useMapLayers({
  getMap: () => map.value,
  mapId,
  // Color comes from the active tab's strategy (looked up at paint time)
  getLanguageFamilyColor: (langFam) => {
    const strat = getColorStrategy(activeTab.value?.colorStrategy)
    return strat?.colors?.[langFam] ?? strat?.fallback ?? '#7c8cf8'
  },
  getNormalizedPeopleGroups: () => mapData.normalizedPeopleGroups.value || []
})

// ─── Events composable (click → detail, hover → cursor) ──────────────────────
// Wired via useMapLayers internally, but we also keep an explicit handle for
// custom event hookups (e.g., poster-mode disables click handlers).
const mapEvents = useMapEvents({
  getMap: () => map.value,
  mapId,
  getLanguageFamilyColor: () => '#7c8cf8',
  getNormalizedPeopleGroups: () => mapData.normalizedPeopleGroups.value || []
})

// ─── Fly composable ──────────────────────────────────────────────────────────
const mapFly = useMapFly({
  getMap: () => map.value,
  mapId,
  mapStore,
  defaultCenter: profileConfig?.value?.center ?? [20, 10],
  defaultZoom:   profileConfig?.value?.zoom   ?? 1.8
})

// ─── Selected-pin composable (animated GO marker on selection) ───────────────
// Watches uiStore.selectedPeopleGroup; when set, swaps the dot to neon orange
// AND floats an animated GO pin above it. Highlight layer attaches itself to
// the `language-families` source created by useMapLayers, so initialize()
// must be called AFTER that source has been added (i.e. inside onMapReady).
const selectedPin = useSelectedPin({ getMap: () => map.value })

// ─── Clustering composable (lazy) ────────────────────────────────────────────
// Modes: 'mapbox' (native circle clustering) | 'mst' | 'network' | 'off'.
// Instantiated on first user toggle (mapStore.showClusters → true) — keeps the
// MST/Network algorithm bundle off the boot path for the common case where
// clustering stays off.
let _clusteringInstance = null
let _clusteringPromise = null
function getClustering() {
  if (_clusteringInstance) return Promise.resolve(_clusteringInstance)
  if (!_clusteringPromise) {
    _clusteringPromise = import('@map/composables/useMapClustering.js').then(m => {
      _clusteringInstance = m.useMapClustering({
        getMap: () => map.value,
        mapId,
        mapStore,
        getPeopleGroups: () => mapData.normalizedPeopleGroups.value || [],
        getClusterColor: () => getColorStrategy(activeTab.value?.colorStrategy)?.fallback ?? '#7c8cf8'
      })
      return _clusteringInstance
    })
  }
  return _clusteringPromise
}
// Lightweight stand-in so existing call-sites (refreshColors / applyFilters /
// setData / cleanup) work whether or not clustering has been instantiated.
const clustering = {
  setData(d)        { _clusteringInstance?.setData?.(d) },
  applyFilters(f)   { _clusteringInstance?.applyFilters?.(f) },
  refreshColors()   { _clusteringInstance?.refreshColors?.() },
  cleanup()         { _clusteringInstance?.cleanup?.() },
  async setEnabled(on) { (await getClustering()).setEnabled?.(on) },
  async setMode(m)     { (await getClustering()).setMode?.(m) },
  // Per-selection filter — keep a deferred copy so we can re-push to the
  // composable the moment it instantiates (e.g. when the user enables clusters
  // *after* clicking a legend row). Sync calls become no-ops cleanly.
  _pendingSelectionFilter: null,
  setSelectionFilter(filter) {
    this._pendingSelectionFilter = filter || null
    if (_clusteringInstance?.setSelectionFilter) {
      _clusteringInstance.setSelectionFilter(filter)
    }
  },
  flushSelectionFilter() {
    if (_clusteringInstance?.setSelectionFilter) {
      _clusteringInstance.setSelectionFilter(this._pendingSelectionFilter)
    }
  }
}

// ─── Legend data composable ──────────────────────────────────────────────────
// Builds legend rows from the loaded GeoJSON aggregated by the active tab's
// `legend` key. LegendDesktop / LegendMobile read these via inject('legendRows')
// (provided below).
const legend = useLegendData({
  mapId,
  dataStore,
  legendType: activeLegendType
})
provide('legendRows', legend.rows)
// SemanticTreeLegend (and LegendFamilyTree.legacy) need raw normalized
// people-groups, not pre-aggregated legendRows. mapData owns the normalized
// array; expose to descendants.
provide('normalizedPeopleGroups', mapData.normalizedPeopleGroups)

// Per-map "instance" mediator store, ported word-for-word from PPLR's
// SemanticTreeLegend pattern. Each <doxa-map> custom element gets its own
// instance; SemanticTreeLegend reads/writes selection + activeTab + theme
// via inject.
const pplrInstance = createPplrInstance(mapId)
provideInstance(pplrInstance)
// Default the SemanticTreeLegend internal tab per outer-tab (legend type):
//   • language-families → 1 (Language)  — users know "Language" better than "Language Family"
//   • affinity-blocks   → 0 (Bloc)      — users know affinity blocks better than clusters
//   (qa: 2026-05-08 user feedback)
// Reset on every outer-tab change so switching between Languages and Affinity
// Blocks lands on the right inner tab regardless of where the previous tab left it.
pplrInstance.activeTab.value = 1
function _defaultInnerTabForLegendType(t) {
  if (t === 'affinity-block') return 0   // Bloc
  if (t === 'language-family') return 1   // Language
  return 0
}
watch(activeLegendType, (t) => {
  pplrInstance.activeTab.value = _defaultInnerTabForLegendType(t)
})

// ── langTree + tabs + select handler for SemanticTreeLegend ─────────────────
// PPLR's component is mounted as a standalone sibling of the map (its own
// .stl-panel chrome handles positioning, collapse-to-pill, theme). We feed it
// the langTree directly here instead of routing through LegendDesktop.
const _langPgRef = { get value() { return mapData.normalizedPeopleGroups.value || [] } }
const { langTree } = useLanguageFamilyLegendData(_langPgRef)
const LANG_TABS = [
  { id: 'family',   label: 'Lang Family',
    info: 'A language family is a group of languages descended from a common ancestor (e.g. Indo-European, Afro-Asiatic).' },
  { id: 'language', label: 'Language',
    info: 'A language is a system of communication used by a people (e.g. Arabic, Bengali, Hindi).' },
  { id: 'dialect',  label: 'Dialect/Variety',
    info: 'A dialect/variety is a regional or social form of a language (e.g. Arabic, Sudanese; Pakistan Sign Language).' },
]

// Affinity-block tab — mirrors PPLR's pplr-rop-tree.vue hierarchy (Affinity Bloc → Cluster → PG).
const { affinityTree } = useAffinityBlockLegendData(_langPgRef)
const AFFINITY_TABS = [
  { id: 'bloc',    label: 'Affinity Bloc',
    info: 'Affinity Bloc (field: rop1) — broadest grouping by cultural/linguistic/geographic kinship. 16 blocs total. Examples: Malay Peoples, South Asian Peoples, Deaf, Arab World.' },
  { id: 'cluster', label: 'Cluster',
    info: 'Cluster (field: imb_reg_of_people_2, ROP 2) — finer-grained grouping inside a bloc. 194 clusters total. Suffix "(Cluster)" appears on each row to distinguish from PG/PGIC. Example: Borneo-Kalimantan within Malay Peoples.' },
  { id: 'group',   label: 'People Group',
    info: 'People Group (field: imb_reg_of_people_25, ROP 2.5) — abstract ethnolinguistic identity, country-agnostic. Suffix "(PG)" on each row. 1,736 PGs total; 131 of them have rows in multiple countries (e.g. Deaf in 123 countries). Example: Abai Sungai (PG) is one ROP25 code regardless of where its people live.' },
  { id: 'pgic',    label: 'PG in Country',
    info: 'PGIC = People Group In Country (field: imb_reg_of_people_3 + country_code) — one row per (people group, country) pair. Suffix "(PGIC)" on each row. 2,106 rows total. Example: "Abai Sungai, Malaysia (PGIC)" is the Abai Sungai PG specifically as it exists in Malaysia.' },
]

// WAGF Regions tab — Region → Block → Country (3-tier). Each region has a unique color;
// selecting a region, block, or country dims/filters pins to that geographic scope and
// highlights the matching country polygons on the map.
const { regionsTree } = useWagfRegionsLegendData(_langPgRef)
const REGIONS_TABS = [
  { id: 'region',  label: 'WAGF Region',
    info: 'WAGF macro-region (e.g. "Asia", "Africa"). Color-coded on the map.' },
  { id: 'block',   label: 'WAGF Block',
    info: 'WAGF block — the organizational sub-grouping within each region (e.g. "South East Asia", "West Africa").' },
  { id: 'country', label: 'Country',
    info: 'Individual countries, listed by unreached-population size within their block.' },
]

// Flat legend data for prayer/adoption/engagement/religion tabs — converted to
// STL-compatible tree nodes so ALL tabs render through the same SemanticTreeLegend.
const flatLegend = useFlatLegendData(toRef(() => activeLegendType.value), RESEARCH_LEGEND_OPTIONS)
function _flatItemsToStlNodes(items) {
  const out = []
  for (const item of items) {
    out.push({
      id: item.key, label: item.label, color: item.color,
      count: item.count ?? 0, pop: item.population ?? 0,
      filter: item.filterKey ? ['==', ['get', '_flat_filter'], item.filterKey] : null,
      children: [],
    })
    for (const c of (item.children || [])) {
      out.push({
        id: c.key, label: c.label, color: c.color,
        count: c.count ?? 0, pop: c.population ?? 0,
        filter: c.filterKey ? ['==', ['get', '_flat_filter'], c.filterKey] : null,
        children: [],
      })
    }
  }
  return out
}

// Computed bindings the template feeds into the single <SemanticTreeLegend>.
// ALL tabs (flat + semantic) now render through STL.
const _isFlatTab = computed(() => ['prayer', 'engagement', 'adoption', 'religion'].includes(activeLegendType.value))
const legendNodes = computed(() => {
  if (_isFlatTab.value) return _flatItemsToStlNodes(flatLegend.items.value)
  if (activeLegendType.value === 'affinity-block') return affinityTree.value
  if (activeLegendType.value === 'doxa-regions')   return regionsTree.value
  return langTree.value
})
const legendInnerTabs = computed(() => {
  if (_isFlatTab.value) return null
  if (activeLegendType.value === 'affinity-block') return AFFINITY_TABS
  if (activeLegendType.value === 'doxa-regions')   return REGIONS_TABS
  return LANG_TABS
})
const legendHideTabs = computed(() => _isFlatTab.value)
const legendColumnLabel = computed(() => {
  if (activeLegendType.value === 'religion') return 'World Religions'
  if (activeLegendType.value === 'prayer') return 'Prayer Status'
  if (activeLegendType.value === 'engagement') return 'Engagement Status'
  if (activeLegendType.value === 'adoption') return 'Adoption Status'
  if (_isFlatTab.value) return 'Status'
  return ''
})
const _stlOpen = computed(() => uiStore.legendState !== 'collapsed')
function _onStlOpenChange(open) {
  if (open) uiStore.openLegend()
  else uiStore.collapseLegend()
}
const legendTitle = computed(() => {
  if (_isFlatTab.value) return 'Legend'
  if (activeLegendType.value === 'affinity-block') return 'People Groups'
  if (activeLegendType.value === 'doxa-regions')   return 'WAGF Regions'
  return 'Languages'
})
function _findNodeInTree(nodes, predicate) {
  for (const n of nodes) {
    if (predicate(n)) return n
    if (n.children?.length) {
      const f = _findNodeInTree(n.children, predicate)
      if (f) return f
    }
  }
  return null
}
// PPLR's onLegendSelect verbatim semantics: setFilter(node.filter) on select,
// setFilter(null) on null. Plus mirror to mapStore for back-compat with the
// rest of the app (geocoder, popup, fly-to all read mapStore.selected*).
// Provided to LegendMobile so its embedded <SemanticTreeLegend> can wire
// @select to the same handler as the desktop instance — without this,
// mobile row-clicks updated only instance.selection (shared via inject)
// and never reached mapStore.selectFamily → applyDimFilter, so the
// dim-on-select / restore-on-deselect path never ran (qa: 2026-05-03 iter-18).
provide('onSemanticTreeSelect', (node) => onSemanticTreeSelect(node))
// Resolves the active tab's strategy → color for a given feature, used by
// useSelectedPin.js so the selection-pin matches the underlying dot color
// (qa: 2026-05-06 user feedback). research-mfe tab strategyKeys already
// match COLOR_MODES values directly, so no mapping needed.
provide('getActivePinColor', (properties) => {
  const strat = getColorStrategy(activeTab.value?.colorStrategy ?? 'languageFamily')
  return strat?.getColor?.(properties) ?? '#1a1a1a'
})
function onSemanticTreeSelect(node) {
  const m = map.value
  if (!node) {
    // Flat tabs: clear filter directly
    if (_isFlatTab.value) {
      const t = activeLegendType.value
      if (t === 'prayer')     uiStore.setPrayerFilter(null)
      else if (t === 'engagement') uiStore.setEngagementFilter(null)
      else if (t === 'adoption')   uiStore.setAdoptionFilter(null)
      else if (t === 'religion')   uiStore.setReligionFilter(null)
    }
    if (m && m.getLayer('language-family-pins')) {
      try { m.setFilter('language-family-pins', null) } catch (_) {}
      _syncHitboxFilter(m, null)
      m.setPaintProperty('language-family-pins', 'circle-opacity', 1)
      m.setPaintProperty('language-family-pins', 'circle-stroke-opacity', 1)
      if (m.getLayer('language-family-pins-shadow')) {
        m.setPaintProperty('language-family-pins-shadow', 'circle-opacity', 1)
      }
      mapLayers.syncGlowFilter(null)
    }
    // Reset region polygon highlight when deselecting on the WAGF Regions tab.
    if (m && m.getLayer('regions-fill')) {
      m.setPaintProperty('regions-fill', 'fill-opacity', 0.20)
      m.setPaintProperty('regions-border', 'line-color', 'rgba(60,60,80,0.35)')
      m.setPaintProperty('regions-border', 'line-width', 0.6)
    }
    if (mapStore.selectedFamily)   mapStore.selectFamily(null)
    if (mapStore.selectedLanguage) mapStore.selectLanguage(null)
    if (mapStore.selectedDialect)  mapStore.selectDialect?.(null)
    if (mapStore.selectedRegion)   mapStore.selectRegion?.(null)
    _clearGeocoderProgrammatic()
    return
  }
  // Flat tabs (prayer/adoption/engagement/religion): directly set the uiStore
  // filter (no toggle — STL already handles select/deselect internally).
  // The existing watchers on uiStore.*Filter call applyDimFilter to dim pins.
  if (_isFlatTab.value) {
    const t = activeLegendType.value
    if (t === 'prayer')     uiStore.setPrayerFilter(node.id)
    else if (t === 'engagement') uiStore.setEngagementFilter(node.id)
    else if (t === 'adoption')   uiStore.setAdoptionFilter(node.id)
    else if (t === 'religion')   uiStore.setReligionFilter(node.id)
    return
  }
  if (m && m.getLayer('language-family-pins') && node.filter) {
    try { m.setFilter('language-family-pins', node.filter) } catch (_) {}
    _syncHitboxFilter(m, node.filter)
    m.setPaintProperty('language-family-pins', 'circle-opacity', 1)
    m.setPaintProperty('language-family-pins', 'circle-stroke-opacity', 1)
    mapLayers.syncGlowFilter(node.filter)
  }
  // Mirror selection into mapStore (loop-safe via legend's _lastInternalId).
  const id = String(node.id || '')
  if (id.startsWith('fam:'))      mapStore.selectFamily?.(node.label)
  else if (id.startsWith('lang:')) mapStore.selectLanguage?.(node.label)
  else if (id.startsWith('dial:')) {
    mapStore.selectDialect?.({ key: id.slice(5), originalLabels: node.originalLabels || [] })
  }
  // Affinity-block tab — apply deep dim (0.06) on non-matching pins, parity
  // with research-map's applyDimFilter for language-family. The SemanticTree-
  // Legend's pplrInstance.selection drives the legend row highlight; the dim
  // here drives the map visual. node.filter is the per-tier Mapbox match
  // expression built by useAffinityBlockLegendData.
  else if (id.startsWith('bloc:') || id.startsWith('cluster:') || id.startsWith('pg:') || id.startsWith('pgic:')) {
    if (m && m.getLayer('language-family-pins') && node.filter) {
      // Drop any prior setFilter from a previous tab interaction so all pins render.
      try { m.setFilter('language-family-pins', null) } catch (_) {}
      _syncHitboxFilter(m, null)
      // Dim via case expression — matched pins at 1.0, others at 0.06 (matches research-map's
      // applyDimFilter values).
      m.setPaintProperty('language-family-pins', 'circle-opacity', [
        'case', node.filter, 1, 0
      ])
      m.setPaintProperty('language-family-pins', 'circle-stroke-opacity', [
        'case', node.filter, 1, 0
      ])
      if (m.getLayer('language-family-pins-shadow')) {
        m.setPaintProperty('language-family-pins-shadow', 'circle-opacity', [
          'case', node.filter, 1, 0
        ])
      }
      mapLayers.syncGlowFilter(node.filter)
    }
  }
  // WAGF Regions tab — filter pins to the selected region/block/country and highlight
  // matching country polygons. node.filter is one of:
  //   region:  ['==', ['get', 'doxaRegion'], regionSlug]
  //   block:   ['==', ['get', 'wagfBlock'],  blockSlug]
  //   country: ['==', ['get', 'countryIso'], isoAlpha3]
  // node.isoCodes carries alpha-3 ISOs; polygon highlight uses iso_3166_1_alpha_3 property.
  else if (id.startsWith('region:') || id.startsWith('block:') || id.startsWith('country:')) {
    if (m && m.getLayer('language-family-pins') && node.filter) {
      try { m.setFilter('language-family-pins', node.filter) } catch (_) {}
      _syncHitboxFilter(m, node.filter)
      m.setPaintProperty('language-family-pins', 'circle-opacity', 1)
      m.setPaintProperty('language-family-pins', 'circle-stroke-opacity', 1)
    }
    // Mirror region selection into mapStore (for geocoder / external sync).
    if (id.startsWith('region:')) mapStore.selectRegion?.(id.slice(7))
    // Highlight matching polygons using isoCodes (alpha-3) on iso_3166_1_alpha_3.
    if (m && m.getLayer('regions-fill')) {
      const isoCodes = node.isoCodes || []
      if (isoCodes.length) {
        const isoArr = ['literal', isoCodes]
        m.setPaintProperty('regions-fill', 'fill-opacity', [
          'case', ['in', ['get', 'iso_3166_1_alpha_3'], isoArr], 0.30, 0.02
        ])
        m.setPaintProperty('regions-border', 'line-color', [
          'case', ['in', ['get', 'iso_3166_1_alpha_3'], isoArr], '#111827', 'rgba(60,60,80,0.15)'
        ])
        m.setPaintProperty('regions-border', 'line-width', [
          'case', ['in', ['get', 'iso_3166_1_alpha_3'], isoArr], 2.5, 0.3
        ])
      } else {
        m.setPaintProperty('regions-fill', 'fill-opacity', 0.20)
        m.setPaintProperty('regions-border', 'line-color', 'rgba(60,60,80,0.35)')
        m.setPaintProperty('regions-border', 'line-width', 0.6)
      }
    }
  }
}
// Theme bridge: keep the SemanticTreeLegend in sync with the app's dark-mode
// state (driven by uiStore.theme via the isDark computed defined later).
watch(() => uiStore.theme, (t) => { pplrInstance.theme.value = (t === 'dark' ? 'dark' : 'light') }, { immediate: true })

// ── Selection bridge: mapStore → pplrInstance.selection ──────────────────────
// Geocoder picks (and any other external mutators) write to mapStore. The
// SemanticTreeLegend reads instance.selection to highlight + auto-expand the
// matching row. This watcher projects mapStore changes onto the instance using
// id strings that match the langTree node ids (fam:X / lang:X__Y / dial:X__Y__Z).
// findAncestorChain inside the legend uses these ids to resolve actual nodes
// in props.nodes; the bridge only needs to pass id+label+depth — not the full
// node object.
//
// Loop guard: when the legend itself emits @select, LegendDesktop dispatches
// legend:highlight → research-map.applyDimFilter → mapStore.selectXxx (no-op
// if already set). The bridge watcher then fires with the same selection,
// but the SemanticTreeLegend's _lastInternalId guard catches the round-trip.
function _bridgeSelection(kind, fullNode) {
  if (!fullNode) {
    const cur = pplrInstance.selection.value
    if (cur && cur.id?.startsWith(kind + ':')) pplrInstance.selection.value = null
    return
  }
  // If the legend already holds a selection of the same kind+label, skip the
  // overwrite — the user's click landed on a specific node (with its exact
  // family prefix in the id). A label-matched lookup here may pick a DIFFERENT
  // family bucket if the same label appears in two families (e.g. Bengali
  // under Indo-European AND under "Unknown" if some pins have null
  // imb_language_family + no lookup hit). Overwriting with the wrong id
  // breaks the legend's _lastInternalId guard and triggers an unwanted
  // depth-based tab switch on what should be a same-tab row click.
  const cur = pplrInstance.selection.value
  if (cur && cur.id?.startsWith(kind + ':') && cur.label === fullNode.label) return
  // Full node from langTree carries color/children/filter — needed for the
  // legend's row highlight, descendant-dim exemption, and parent breadcrumb.
  pplrInstance.selection.value = fullNode
}
watch(() => mapStore.selectedFamily, (key) => {
  if (!key) return _bridgeSelection('fam', null)
  const node = _findNodeInTree(langTree.value, n => n.id.startsWith('fam:') && n.label === key)
  if (node) _bridgeSelection('fam', { ...node, depth: 0 })
})
watch(() => mapStore.selectedLanguage, (key) => {
  if (!key) return _bridgeSelection('lang', null)
  // Match by label across all language nodes — the geocoder gives us "Arabic"
  // without a family prefix, so we look up the first matching language node
  // (sorted by population, so the most-populated family wins; usually correct).
  const node = _findNodeInTree(langTree.value, n => n.id.startsWith('lang:') && n.label === key)
  if (node) _bridgeSelection('lang', { ...node, depth: 1 })
})
watch(() => mapStore.selectedDialect, (dialect) => {
  if (!dialect?.key) return _bridgeSelection('dial', null)
  // Dialect mapStore keys already include the family prefix
  // ("family__baseLang__dialect"); langTree dialect ids prepend "dial:".
  const fullId = `dial:${dialect.key}`
  const node = _findNodeInTree(langTree.value, n => n.id === fullId)
  if (node) _bridgeSelection('dial', { ...node, depth: 2 })
})
// WAGF Regions — bridge mapStore.selectedRegion → SemanticTreeLegend.
// regionKey is the wagf_region VALUE (e.g. 'south_asia'), which matches the
// 'region:south_asia' node id in regionsTree.
watch(() => mapStore.selectedRegion, (key) => {
  if (!key) return _bridgeSelection('region', null)
  const node = _findNodeInTree(regionsTree.value, n => n.id === `region:${key}`)
  if (node) _bridgeSelection('region', { ...node, depth: 0 })
})

// ─── Poster composable (lazy) ────────────────────────────────────────────────
// Instantiated only when the user opens the poster dialog. The composable +
// off-screen Mapbox instance + PDF pipeline are ~117 KB; keep them off the
// critical boot path.
const poster = ref(null)
async function openPoster() {
  if (!poster.value) poster.value = await loadPoster()
  showPoster.value = true
}

// ─── Side-menu / dialog state ────────────────────────────────────────────────
const showSideMenu   = ref(false)
const showPoster     = ref(false)
const selectedFeature = computed(() => mapStore.selectedFeature)

// ─── Theme toggle (clone of doxa-simple-map.vue:368-395) ─────────────────────
// `isDark` is derived from uiStore.theme so it stays in sync with the canonical
// store action. handleToggleTheme flips uiStore.theme + swaps the Mapbox style
// + re-adds the language-family pins layer because setStyle() wipes custom
// layers. The toolbar toggle button calls handleToggleTheme via @toggle.
const isDark = computed(() => uiStore.theme === 'dark')

// Theme-aware data-pin outline (qa: 2026-05-06 user feedback — Joshua Project
// uses a thin near-black outline that's barely visible; reverse-engineered).
// In dark mode the outline goes white so pins stay visible against dark
// basemaps. Boot style is light-v11, so the initial circle-stroke-color
// in addLanguageFamilyLayer is already 'rgba(0,0,0,0.45)' — this watcher
// just flips it on theme toggle.
function _updatePinStroke() {
  const m = map.value
  if (!m || !m.getLayer('language-family-pins')) return
  const regionsActive = activeTab.value?.id === 'doxa-regions'
  const dark = isDark.value
  const color = dark ? '#ffffff' : regionsActive ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.2)'
  m.setPaintProperty('language-family-pins', 'circle-stroke-color', color)
}
watch(isDark, _updatePinStroke, { immediate: false })
watch(() => activeTab.value?.id, _updatePinStroke)
function handleToggleTheme() {
  if (!map.value) return
  uiStore.toggleTheme()
  const newStyle = uiStore.theme === 'dark'
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/light-v11'
  map.value.setStyle(newStyle)
  map.value.once('style.load', () => {
    const groups = mapData.normalizedPeopleGroups.value
    if (groups?.length) {
      mapLayers.addLanguageFamilyLayer(groups, activeTab.value?.colorStrategy ?? 'languageFamily')
      // Re-apply per-tab pin color override (e.g. blood red on doxa-regions).
      if (activeTab.value?.id === 'doxa-regions' && map.value.getLayer('language-family-pins')) {
        map.value.setPaintProperty('language-family-pins', 'circle-color', '#a30000')
      }
    }
    if (activeTab.value?.id === 'prayer') mapLayers.startPrayerGlow()
    // Re-load regions polygon (also wiped). It'll re-apply visibility per active tab.
    _regionsLoaded.value = false
    if (activeTab.value?.id === 'doxa-regions') void ensureRegionsLoaded()
  })
}

// ─── Lazy regions-layer loader ───────────────────────────────────────────────
// PERF: doxa-regions-with-geo.json is ~6.4 MB decoded. Loading + parsing it
// eagerly in onMapReady was adding ~3-4s to the boot of every tab — even when
// the user never visits the Doxa Regions tab. We now lazy-load on first
// activation and cache the result.
const _regionsLoaded = ref(false)
let _regionsLoadingPromise = null
async function ensureRegionsLoaded() {
  if (_regionsLoaded.value) return
  if (_regionsLoadingPromise) return _regionsLoadingPromise
  _regionsLoadingPromise = (async () => {
    try {
      const regionsData = await mapData.loadRegionsData?.()
      if (regionsData && map.value) {
        mapLayers.addRegionsLayer?.(regionsData, 'doxa-regions')
        // Hide regions on non-Doxa-Regions tabs so they don't show through.
        if (map.value.getLayer('regions-fill') && activeTab.value?.id !== 'doxa-regions') {
          map.value.setLayoutProperty('regions-fill',   'visibility', 'none')
          map.value.setLayoutProperty('regions-border', 'visibility', 'none')
        }
        // Pins must render above the freshly-added regions polygon.
        if (map.value.getLayer('language-family-pins')) {
          map.value.moveLayer('language-family-pins')
        }
      }
      _regionsLoaded.value = true
      // PERF: Mapbox now owns the geometry as a GeoJSON source; drop our JS
      // reference so the ~30 MB of parsed objects can be garbage-collected.
      mapData.regionsData.value = null
    } catch (err) {
      console.warn('[research-map] regions layer failed:', err)
    } finally {
      _regionsLoadingPromise = null
    }
  })()
  return _regionsLoadingPromise
}

// ─── Tab switching ───────────────────────────────────────────────────────────
function switchTab(tabId) {
  if (tabId === activeTabId.value) return
  activeTabId.value = tabId
  uiStore.setActiveTab?.(tabId)
  // Clear the geocoder text on every map-tab switch so the previous tab's
  // search query doesn't leak across tabs (qa-buildinng-round-1 Bug 11).
  // _clearGeocoderProgrammatic uses _geoBeingCleared to skip the legend-
  // deselect side effect — pure text reset. Flip the FEATURES flag to keep
  // search queries across tabs (the user said "could go either way" — sticking
  // with clear-on-switch as the default per A4).
  if (!FEATURES.geocoderPersistAcrossTabs) _clearGeocoderProgrammatic()
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab || !map.value) return
  // Lazy-load regions GeoJSON the first time the user lands on this tab.
  if (tab.id === 'doxa-regions') void ensureRegionsLoaded()

  const strat = getColorStrategy(tab.colorStrategy)
  if (map.value.getLayer('language-family-pins') && strat?.buildColorExpression) {
    // On the Doxa Regions tab, the pins would otherwise be colored using the
    // doxaRegion strategy — same color as the polygon they sit on, so they
    // visually disappear. Force blood-red instead so pins pop against the
    // colored region fills (per UX request 2026-04-26).
    const pinColor = tab.id === 'doxa-regions' ? '#a30000' : strat.buildColorExpression()
    map.value.setPaintProperty('language-family-pins', 'circle-color', pinColor)
    clearAllHighlights(map.value)
    // Prayer glow: start on prayer tab, stop on all others
    if (tab.id === 'prayer') mapLayers.startPrayerGlow()
    else mapLayers.stopPrayerGlow()
    // Region polygons only belong on the Doxa Regions tab. On every other tab,
    // hide the fill + border outright so they don't bleed through and so the
    // pins remain the visual focus (UX request 2026-04-26).
    const showRegions = tab.id === 'doxa-regions'
    if (map.value.getLayer('regions-fill')) {
      map.value.setLayoutProperty('regions-fill',   'visibility', showRegions ? 'visible' : 'none')
      map.value.setLayoutProperty('regions-border', 'visibility', showRegions ? 'visible' : 'none')
    }
    // Reaffirm pin z-index: pins must always render above the regions polygon.
    // Mapbox `moveLayer(id)` without a beforeId moves it to the top of the stack.
    if (map.value.getLayer('language-family-pins')) {
      map.value.moveLayer('language-family-pins')
    }
  }
  // Re-aggregate legend rows for the new lens
  legend.refresh?.()
  // Re-color clusters (cluster paint depends on active strategy)
  clustering.refreshColors?.()
}

// ─── Legend → fly-to wiring ──────────────────────────────────────────────────
// LegendRows emits a window event when a row is clicked; we fly the map there.
function onLegendRowClick(evt) {
  const detail = evt?.detail
  if (!detail || detail.mapId !== mapId) return
  if (detail.center && Array.isArray(detail.center)) {
    mapFly.flyToCoords?.({ longitude: detail.center[0], latitude: detail.center[1] }, detail.zoom ?? 4)
  } else if (detail.bounds) {
    mapFly.fitBounds?.(detail.bounds, 60)
  }
}

// LegendFamilyTree emits 'legend:highlight' with { kind, pinIds, coords[], familyKey, languageKey }.
// Compute bounds from coords[] and fit the map. Fall back to flyTo on the
// centroid when there's only a handful of points (so a single-pin family
// doesn't zoom into the moon).
function onLegendHighlight(evt) {
  const detail = evt?.detail
  if (!detail) return

  // Dim non-matching pins for visual distinction.
  // - kind=family   → keep only pins whose languageFamily matches; dim the rest
  // - kind=language → keep only pins whose primary_language label matches; dim the rest
  // - kind=region   → keep only pins whose doxaRegion matches; dim the rest
  // Click again on the same row to clear (handled by family/language store below).
  applyDimFilter(detail)

  if (!detail.coords?.length) return
  const coords = detail.coords
  if (coords.length === 1) {
    mapFly.flyToCoords?.({ longitude: coords[0][0], latitude: coords[0][1] }, 3)
    return
  }
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  // Cap zoom-in. Region rows = continent framing; family/language rows = sub-continent.
  const maxZoom = detail.kind === 'region' ? 2.2 : 3
  mapFly.fitBounds?.([[minLng, minLat], [maxLng, maxLat]], 60, { maxZoom })
}

// Last-clicked highlight key per kind — clicking the same row again clears.
const _lastHL = { family: null, language: null, dialect: null, region: null, prayer: null, engagement: null, adoption: null }

function clearAllHighlights(m) {
  m.setPaintProperty('language-family-pins', 'circle-opacity', 1)
  m.setPaintProperty('language-family-pins', 'circle-stroke-opacity', 1)
  if (m.getLayer('language-family-pins-shadow')) {
    m.setPaintProperty('language-family-pins-shadow', 'circle-opacity', 1)
  }
  m.setFilter('language-family-pins', null)
  _syncHitboxFilter(m, null)
  mapLayers.syncGlowFilter(null)
  if (m.getLayer('regions-fill')) {
    m.setPaintProperty('regions-fill', 'fill-opacity', 0.20)
    m.setPaintProperty('regions-fill', 'fill-outline-color', null)
  }
  if (m.getLayer('regions-border')) {
    m.setPaintProperty('regions-border', 'line-color', 'rgba(60,60,80,0.35)')
    m.setPaintProperty('regions-border', 'line-width', 0.6)
  }
  _lastHL.family = _lastHL.language = _lastHL.dialect = _lastHL.region = null
  _lastHL.prayer = _lastHL.engagement = _lastHL.adoption = null
  if (uiStore.prayerFilter)     uiStore.setPrayerFilter(null)
  if (uiStore.engagementFilter) uiStore.setEngagementFilter(null)
  if (uiStore.adoptionFilter)   uiStore.setAdoptionFilter(null)
  if (uiStore.religionFilter)   uiStore.setReligionFilter(null)
  // Highlights gone — clustering goes back to the full dataset on next pass.
  clustering.setSelectionFilter(null)
  // Clear mapStore legend selections so LegendFamilyTree removes the selected
  // row indicator + row dimming (QA R2 A1 / R4 A3).
  if (mapStore.selectedFamily)   mapStore.selectFamily(null)
  if (mapStore.selectedLanguage) mapStore.selectLanguage(null)
  if (mapStore.selectedDialect)  mapStore.selectDialect(null)
}

// Same-tick dedupe — a single legend-row click fires applyDimFilter TWICE on
// tabs 1-3 (once from the uiStore.{prayer,engagement,adoption}Filter watcher,
// once from the legend:highlight window event dispatched by LegendDesktop).
// Without this guard the second call sees `_lastHL[kind] === expectedValue`
// and trips the "same row → clear" toggle path, so the user has to click twice
// to dim. Tracking the last (kind|value, timestamp) within ~80 ms collapses
// the duplicate calls so a single click dims on the first try (qa.md UX bug
// 2026-04-27).
let _lastApplyKey = null
let _lastApplyTs  = 0
function applyDimFilter(detail) {
  const m = map.value
  if (!m || !m.getLayer('language-family-pins')) return
  let property, expectedValue, kind
  if (detail.kind === 'family') {
    kind = 'family'; property = 'languageFamily'; expectedValue = detail.familyKey
  } else if (detail.kind === 'language') {
    kind = 'language'; property = 'language'; expectedValue = detail.languageKey
  } else if (detail.kind === 'region') {
    kind = 'region'; property = 'doxaRegion'; expectedValue = detail.regionKey
  } else if (detail.kind === 'prayer') {
    kind = 'prayer'; property = detail.property || 'peoplePraying'; expectedValue = detail.expectedValue
  } else if (detail.kind === 'engagement') {
    kind = 'engagement'; property = detail.property || 'engagementStatus'; expectedValue = detail.expectedValue
  } else if (detail.kind === 'adoption') {
    kind = 'adoption'; property = detail.property || 'adoptionStatus'; expectedValue = detail.expectedValue
  } else if (detail.kind === 'religion') {
    kind = 'religion'; property = detail.property || 'religion'; expectedValue = detail.expectedValue
  } else if (detail.kind === 'dialect') {
    kind = 'dialect'; property = 'language'; expectedValue = detail.dialectKey || ''
  } else {
    clearAllHighlights(m)
    _clearGeocoderProgrammatic()
    for (const k of Object.keys(_lastHL)) _lastHL[k] = null
    _lastApplyKey = null; _lastApplyTs = 0
    return
  }
  // Same-tick dedupe: collapse the watcher + event-handler double-fire.
  const now = Date.now()
  const callKey = `${kind}|${expectedValue}`
  if (_lastApplyKey === callKey && (now - _lastApplyTs) < 80) {
    return
  }
  _lastApplyKey = callKey
  _lastApplyTs = now

  // Toggle: same row clicked AGAIN (after the dedupe window) → clear highlight.
  if (_lastHL[kind] === expectedValue) {
    clearAllHighlights(m)
    _clearGeocoderProgrammatic()
    _lastApplyKey = null; _lastApplyTs = 0
    return
  }
  for (const k of Object.keys(_lastHL)) _lastHL[k] = null
  _lastHL[kind] = expectedValue

  // Mirror the selection into mapStore so the legend can paint a "selected"
  // class on the matching row. `_lastHL` is local to this profile; the legend
  // reads `mapStore.selectedFamily / selectedRegion / selectedLanguage` to
  // know which row to highlight visually (qa.md row-selection-indicator).
  if (kind === 'family')   mapStore.selectFamily?.(expectedValue)
  else if (kind === 'region') mapStore.selectRegion?.(expectedValue)
  else if (kind === 'language') mapStore.selectLanguage?.(expectedValue)
  else if (kind === 'dialect') mapStore.selectDialect?.({ key: expectedValue, originalLabels: detail.originalLabels || [] })

  // Constrain MST/network clustering to just the selected slice so the
  // graph doesn't re-build across the full 2,069-pin dataset on every click.
  // `property` is already the correct pin field for each kind.
  clustering.setSelectionFilter({ property, value: expectedValue })

  if (kind === 'region') {
    // Doxa Regions tab: don't dim pins. Instead, FILTER the pin source so only
    // pins inside the selected region render (Mapbox `setFilter`). Pins stay
    // fully opaque + on top of polygons. This matches the API-style "fetch
    // only pins within that region" UX request (2026-04-26).
    m.setFilter('language-family-pins', ['==', ['get', 'doxaRegion'], expectedValue])
    _syncHitboxFilter(m, ['==', ['get', 'doxaRegion'], expectedValue])
    m.setPaintProperty('language-family-pins', 'circle-opacity', 1)
    m.setPaintProperty('language-family-pins', 'circle-stroke-opacity', 1)
    if (m.getLayer('regions-fill')) {
      // Build a match expression on iso_3166_1_alpha_3 (vector tile property) to
      // highlight only the countries belonging to the selected WAGF region.
      // regionIsoMap keys are labels ('Asia'); expectedValue is a slug ('asia').
      // Normalize both sides to lowercase-alpha for reliable matching.
      const rMap = mapLayers.regionIsoMap?.value || {}
      const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '')
      const ev = norm(expectedValue)
      let isoCodes = rMap[expectedValue] || []
      if (!isoCodes.length) {
        for (const [k, v] of Object.entries(rMap)) {
          if (norm(k) === ev) { isoCodes = v; break }
        }
      }
      if (isoCodes.length) {
        const isoArr = ['literal', isoCodes]
        m.setPaintProperty('regions-fill', 'fill-opacity', [
          'case', ['in', ['get', 'iso_3166_1_alpha_3'], isoArr], 0.30, 0.02
        ])
        m.setPaintProperty('regions-border', 'line-color', [
          'case', ['in', ['get', 'iso_3166_1_alpha_3'], isoArr], '#111827', 'rgba(60,60,80,0.15)'
        ])
        m.setPaintProperty('regions-border', 'line-width', [
          'case', ['in', ['get', 'iso_3166_1_alpha_3'], isoArr], 2.5, 0.3
        ])
      } else {
        m.setPaintProperty('regions-fill', 'fill-opacity', 0.20)
        m.setPaintProperty('regions-border', 'line-color', 'rgba(60,60,80,0.35)')
        m.setPaintProperty('regions-border', 'line-width', 0.6)
      }
    }
  } else {
    // Family / language / prayer / engagement / adoption: keep all pins
    // rendered (no source-filter) but dim the non-matching ones.
    m.setFilter('language-family-pins', null)
    _syncHitboxFilter(m, null)

    // Build the per-kind match expression. Prayer compares against a numeric
    // bucket (noPrayer=0 / hasPrayer=(0,FULL_PRAYER_THRESHOLD) / fullPrayer
    // >=THRESHOLD); engagement/adoption compare against a boolean.
    let matchExpr
    if (kind === 'prayer') {
      const valueExpr = ['to-number', ['get', property]]
      if (expectedValue === 'noPrayer') {
        matchExpr = ['==', valueExpr, 0]
      } else if (expectedValue === 'fullPrayer') {
        matchExpr = ['>=', valueExpr, FULL_PRAYER_THRESHOLD]
      } else if (expectedValue === 'hasPrayer') {
        matchExpr = ['all',
          ['>',  valueExpr, 0],
          ['<',  valueExpr, FULL_PRAYER_THRESHOLD]
        ]
      } else {
        matchExpr = ['==', ['get', property], expectedValue]
      }
    } else if (kind === 'engagement') {
      // engagementStatus is a boolean on the feature (see useMapLayers.js).
      // 'hasEngagement' → true, 'notEngaged' → false.
      const want = expectedValue === 'hasEngagement'
      matchExpr = ['==', ['get', property], want]
    } else if (kind === 'adoption') {
      const want = expectedValue === 'hasAdoption'
      matchExpr = ['==', ['get', property], want]
    } else if (kind === 'religion') {
      // expectedValue is a family letter (C/M/H/B/E/J/S/N/O/U). Match against
      // the first character of the religion code on each pin.
      matchExpr = ['==',
        ['slice', ['coalesce', ['get', property], ''], 0, 1],
        expectedValue
      ]
    } else if (detail.filterExpr) {
      // The new SemanticTreeLegend ships pre-built Mapbox filter expressions
      // on each tree node. When a legend click fires legend:highlight, the
      // adapter forwards detail.filterExpr verbatim — no rebuild needed.
      matchExpr = detail.filterExpr
    } else if (kind === 'language') {
      // Two grouping patterns:
      //   comma-inverted: "Arabic" matches "Arabic" exact OR "Arabic, Shihhi" (prefix "Arabic,")
      //   suffix-grouped: "Sign Language" matches "Pakistan Sign Language" (contains " Sign Language")
      matchExpr = ['any',
        ['==', ['get', property], expectedValue],
        ['==', ['slice', ['get', property], 0, expectedValue.length + 1], expectedValue + ','],
        ['in', ' ' + expectedValue, ['get', property]]
      ]
    } else if (kind === 'dialect') {
      // Exact match against the original API label(s) stored on the dialect row.
      // originalLabels e.g. ["Arabic, Sudanese"] or ["Pakistan Sign Language"].
      const labels = detail.originalLabels || []
      if (labels.length === 1) {
        matchExpr = ['==', ['get', property], labels[0]]
      } else if (labels.length > 1) {
        matchExpr = ['in', ['get', property], ['literal', labels]]
      } else {
        // Fallback: shouldn't happen, but guard against empty labels array.
        matchExpr = ['==', ['get', property], expectedValue]
      }
    } else {
      // family
      matchExpr = ['==', ['get', property], expectedValue]
    }

    m.setPaintProperty('language-family-pins', 'circle-opacity', [
      'case', matchExpr, 1, 0
    ])
    m.setPaintProperty('language-family-pins', 'circle-stroke-opacity', [
      'case', matchExpr, 1, 0
    ])
    if (m.getLayer('language-family-pins-shadow')) {
      m.setPaintProperty('language-family-pins-shadow', 'circle-opacity', [
        'case', matchExpr, 1, 0
      ])
    }
    mapLayers.syncGlowFilter(matchExpr)
    if (m.getLayer('regions-fill')) {
      m.setPaintProperty('regions-fill', 'fill-opacity', 0.20)
      m.setPaintProperty('regions-border', 'line-color', 'rgba(60,60,80,0.35)')
      m.setPaintProperty('regions-border', 'line-width', 0.6)
    }
  }
}

// ─── Geocoder result handlers ────────────────────────────────────────────────
// Wired to <GeocoderComponent> in the template. Three events:
//   @people-group-result  — single PG result clicked → open detail panel
//   @aggregate-result     — country / language / religion aggregate clicked →
//                           setFilter the pin layer to that slice + scope MST
//                           clusters to the same slice via setSelectionFilter
//   @clear                — search cleared → drop the filter + selection
//
// Deliberately does NOT call applyDimFilter() — that path is owned by the
// legend-row code and is being extended by a parallel agent. Keeping the
// geocoder flow on its own setFilter avoids a merge conflict.
const _GEOCODER_FILTER_LAYER = 'language-family-pins'

function onGeocoderPeopleGroupResult(feature) {
  if (!feature || !mapStore) return
  // Open the detail panel — research-map gates PeopleGroupDetail on
  // mapStore.selectedFeature, so a single selectFeature() call is sufficient.
  mapStore.selectFeature(feature)
}

function onGeocoderAggregateResult(evt) {
  const m = map.value
  if (!evt || !m || !m.getLayer(_GEOCODER_FILTER_LAYER)) return

  // Map result.kind → the corresponding pin property to filter on.
  // Note 'language-family' uses the derived `languageFamily` pin prop; 'dialect'
  // exact-matches against `language` using originalLabels (e.g. "Arabic, Sudanese").
  let property = null
  switch (evt.kind) {
    case 'country':         property = 'countryName';    break
    case 'language-family': property = 'languageFamily'; break
    case 'language':        property = 'language';       break
    case 'dialect':         property = 'language';       break
    case 'religion':        property = 'religionName';   break
    case 'region':          property = 'doxaRegion';     break
    case 'affinity-bloc':   property = 'affinityBlock';  break
    case 'cluster':         property = 'cluster';        break
    case 'people-group':    property = 'peopleGroup';    break
    default: break
  }
  const value = evt.label
  if (!property || value == null || value === '') return

  // Build a per-kind filter expression. 'language' (base-language) matches the
  // base exactly OR comma-prefix ("Arabic," → "Arabic, Sudanese") OR suffix-
  // contains (" Sign Language" → "Pakistan Sign Language"). 'dialect' hard-
  // matches against originalLabels — the raw API string on the pin.
  try {
    let filterExpr
    if (evt.kind === 'language') {
      filterExpr = ['any',
        ['==', ['get', property], value],
        ['==', ['slice', ['get', property], 0, value.length + 1], value + ','],
        ['in', ' ' + value, ['get', property]]
      ]
    } else if (evt.kind === 'dialect') {
      const labels = Array.isArray(evt.originalLabels) ? evt.originalLabels : []
      if (labels.length === 1) {
        filterExpr = ['==', ['get', property], labels[0]]
      } else if (labels.length > 1) {
        filterExpr = ['in', ['get', property], ['literal', labels]]
      } else {
        filterExpr = ['==', ['get', property], value]
      }
    } else if (evt.kind === 'affinity-bloc') {
      const code = evt.blocCode || evt.properties?.blocCode || ''
      filterExpr = code
        ? ['==', ['get', 'affinityBlock'], code]
        : ['==', ['get', 'affinityBlockLabel'], value]
    } else if (evt.kind === 'cluster') {
      const code     = evt.clusterCode || evt.properties?.clusterCode || ''
      const blocCode = evt.blocCode    || evt.properties?.blocCode    || ''
      filterExpr = code && blocCode
        ? ['all', ['==', ['get', 'affinityBlock'], blocCode], ['==', ['get', 'cluster'], code]]
        : ['==', ['get', 'clusterLabel'], value]
    } else {
      filterExpr = ['==', ['get', property], value]
    }
    m.setFilter(_GEOCODER_FILTER_LAYER, filterExpr)
  } catch (e) {
    // setFilter throws on style mid-load; swallow — clear-on-error is harmless.
  }

  // Scope MST clusters to the same slice so the cluster graph isn't re-built
  // across the full 2,069-pin dataset on every aggregate pick.
  clustering.setSelectionFilter({ property, value })

  // Drive legend tab + store selection so legend row highlights correctly.
  // For family/language/dialect: legend row IS the active-filter indicator,
  // so we clear the geocoder text. For country/region/religion the geocoder
  // text stays visible as the indicator (QA R10 closeout).
  if (evt.kind === 'language-family' || evt.kind === 'family') {
    mapStore.selectFamily(evt.label)
    mapStore.setActiveLegendTab('family')
    _clearGeocoderProgrammatic()
    _emitLegendReveal()
  } else if (evt.kind === 'language') {
    mapStore.selectLanguage(evt.label)
    mapStore.setActiveLegendTab('language')
    _clearGeocoderProgrammatic()
    _emitLegendReveal()
  } else if (evt.kind === 'dialect') {
    // Build a legend-matching dialect key: "familyKey__baseLang__dialect".
    // useDoxaSearch threads familyDerived/baseLang/dialectLabel onto the Carmen
    // feature so we can construct the same key the legend's dialectRows compute.
    const labels = Array.isArray(evt.originalLabels) ? evt.originalLabels : []
    const family  = evt.familyDerived || ''
    const baseLang = evt.baseLang     || ''
    const dialect  = evt.dialectLabel || ''
    const dialectKey = `${family}__${baseLang}__${dialect}`
    mapStore.selectDialect?.({ key: dialectKey, originalLabels: labels })
    mapStore.setActiveLegendTab('dialect')
    _clearGeocoderProgrammatic()
    _emitLegendReveal()
  } else if (evt.kind === 'affinity-bloc' || evt.kind === 'cluster' || evt.kind === 'people-group') {
    // Build a synthetic tree node matching the shape useAffinityBlockLegendData
    // produces, then route through onSemanticTreeSelect. That re-uses the
    // dim-on-select path (case-expression opacity) the legend uses, keeping
    // search-click and row-click visually identical.
    let node = null
    if (evt.kind === 'affinity-bloc') {
      const code = evt.blocCode || ''
      node = {
        id: `bloc:${code}`,
        label: evt.label,
        depth: 0,                                          // ← bloc tab
        filter: code ? ['==', ['get', 'affinityBlock'], code] : null,
      }
    } else if (evt.kind === 'cluster') {
      const blocCode = evt.blocCode    || ''
      const clCode   = evt.clusterCode || ''
      node = {
        id: `cluster:${blocCode}__${clCode}`,
        label: evt.label,
        depth: 1,                                          // ← cluster tab
        filter: clCode ? ['==', ['get', 'cluster'], clCode] : null,
      }
    } else if (evt.kind === 'people-group') {
      const blocCode    = evt.blocCode        || ''
      const clCode      = evt.clusterCode     || ''
      const pgCode      = evt.peopleGroupCode || ''
      node = {
        id: `pg:${blocCode}__${clCode}__${pgCode}`,
        label: evt.label,
        depth: 2,                                          // ← people-group tab
        filter: pgCode ? ['==', ['get', 'peopleGroup'], pgCode] : null,
      }
    }
    if (node && node.filter) {
      // Drop the harsh setFilter applied earlier in this function — we want
      // dim, not hide. Then call the same handler the legend uses on row click.
      try { m.setFilter(_GEOCODER_FILTER_LAYER, null) } catch (_) {}
      onSemanticTreeSelect(node)
      // Drive the legend's selection ref so the matching row visually highlights.
      if (pplrInstance && pplrInstance.selection) {
        pplrInstance.selection.value = node
      }
    }
    _clearGeocoderProgrammatic()
    _emitLegendReveal()
  }
  // For country / region / religion: keep geocoder text as the active-filter
  // indicator. User clicks geocoder X to clear.
}

function onGeocoderClear() {
  if (_geoBeingCleared) return  // programmatic clear, not a user-X click
  const m = map.value
  if (m && m.getLayer(_GEOCODER_FILTER_LAYER)) {
    try { m.setFilter(_GEOCODER_FILTER_LAYER, null) } catch (e) { /* no-op */ }
  }
  clustering.setSelectionFilter(null)
  // Bidirectional sync — clearing search must also deselect the legend row (QA R7 Q4)
  mapStore.selectFamily(null)
  mapStore.selectLanguage(null)
  mapStore.selectDialect?.(null)
}

// ─── Filter sync — ResearchMapFilterPanel writes to mapStore.filters ─────────
// useMapLayers + useMapClustering subscribe to mapStore.filters and re-render
// the source / cluster layers when they change.
watch(() => mapStore.filters, () => {
  mapLayers.applyFilters?.(mapStore.filters)
  clustering.applyFilters?.(mapStore.filters)
}, { deep: true })

// ─── Universal-legend (LegendRows) → applyDimFilter bridge ───────────────────
// LegendRows / useLegendData routes row-clicks through mapStore.selectFamily()
// or mapStore.selectRegion() (NO `legend:highlight` window event). Synthesize
// the same payload shape that LegendFamilyTree emits, so applyDimFilter — and
// the cluster-selection-filter pushed inside it — runs uniformly for both
// language-families and doxa-regions tabs.
watch(() => mapStore.selectedRegion, (key) => {
  if (key) applyDimFilter({ kind: 'region', regionKey: key, coords: [] })
  else applyDimFilter({ kind: null })
})
// Legend selections are mutually exclusive (Bug 13). When the user swaps from
// family → language, mapStore.selectLanguage() also nulls selectedFamily — but
// the watcher mustn't fire applyDimFilter({kind:null}) for that cascade clear,
// because clearAllHighlights() would erase the new language selection. The
// guard: only run the kind:null clear when EVERY level is null.
watch(() => mapStore.selectedFamily, (key) => {
  if (key) applyDimFilter({ kind: 'family', familyKey: key, coords: [] })
  else if (!mapStore.selectedLanguage && !mapStore.selectedDialect) applyDimFilter({ kind: null })
})
watch(() => mapStore.selectedLanguage, (key) => {
  if (key) applyDimFilter({ kind: 'language', languageKey: key, coords: [] })
  else if (!mapStore.selectedFamily && !mapStore.selectedDialect) applyDimFilter({ kind: null })
})
watch(() => mapStore.selectedDialect, (dialect) => {
  if (dialect?.key) applyDimFilter({ kind: 'dialect', dialectKey: dialect.key, originalLabels: dialect.originalLabels || [], coords: [] })
  else if (!mapStore.selectedFamily && !mapStore.selectedLanguage) applyDimFilter({ kind: null })
})

// LegendRows row-clicks on the prayer / engagement / adoption tabs route through
// useLegendData → uiStore.set{Prayer,Engagement,Adoption}Filter — they do NOT
// dispatch the `legend:highlight` window event the family tree uses. Synthesize
// the same payload shape here so applyDimFilter dims non-matching pins on every
// row click. (Filter keys: prayer → noPrayer | hasPrayer | fullPrayer;
// engagement → notEngaged | hasEngagement; adoption → notAdopted | hasAdoption.)
watch(() => uiStore.prayerFilter, (key) => {
  if (key) applyDimFilter({ kind: 'prayer', property: 'peoplePraying', expectedValue: key, coords: [] })
  else applyDimFilter({ kind: null })
})
watch(() => uiStore.engagementFilter, (key) => {
  if (key) applyDimFilter({ kind: 'engagement', property: 'engagementStatus', expectedValue: key, coords: [] })
  else applyDimFilter({ kind: null })
})
watch(() => uiStore.adoptionFilter, (key) => {
  if (key) applyDimFilter({ kind: 'adoption', property: 'adoptionStatus', expectedValue: key, coords: [] })
  else applyDimFilter({ kind: null })
})
watch(() => uiStore.religionFilter, (key) => {
  if (key) applyDimFilter({ kind: 'religion', property: 'religion', expectedValue: key, coords: [] })
  else applyDimFilter({ kind: null })
})

// ─── Clusters toolbar wiring ─────────────────────────────────────────────────
// LegendDesktop's Clusters checkbox writes to mapStore.showClusters. Research-mfe
// only ever uses the MST line-clustering algorithm (lines between pins), so we
// force-set the mode to 'mst' BEFORE enabling, regardless of what's in the
// store. The clusterMode watcher is kept as a no-op for forwards compat.
watch(() => mapStore.showClusters, async (on) => {
  if (on) {
    // Mode must be set before setEnabled() so the composable's _applyLineClustering
    // path is selected; otherwise it falls back to its internal default ('mapbox').
    await clustering.setMode?.('mst')
    // Replay any legend-row selection that was made *before* clustering was
    // enabled — keeps the first MST pass scoped to that slice.
    clustering.flushSelectionFilter?.()
    await clustering.setEnabled?.(true)
  } else {
    await clustering.setEnabled?.(false)
  }
})

// ─── Lifecycle ───────────────────────────────────────────────────────────────
async function onMapReady(normalizedPeopleGroups) {
  mapStore.registerMap(mapId, map.value)
  try { map.value.setProjection('mercator') } catch (_) { /* style may not support */ }

  if (normalizedPeopleGroups?.length) {
    // NOTE: do NOT mirror into a second `dataStore.sources['research-map-pins']`
    // entry here — useMapData's `dataStore.cacheSourceData()` already stores
    // the same dataset under `dataStore.sources[dataSourceId].features`, and a
    // second copy doubles every legend count (e.g. Unengaged 2069 → 4138).

    mapLayers.addLanguageFamilyLayer(
      normalizedPeopleGroups,
      activeTab.value?.colorStrategy ?? 'languageFamily'
    )
    // Initial-render override: doxa-regions tab → solid grey pins so they
    // don't blend into the matching-color polygon fill.
    if (activeTab.value?.id === 'doxa-regions' && map.value?.getLayer('language-family-pins')) {
      map.value.setPaintProperty('language-family-pins', 'circle-color', '#4b5563')
    }
    // Start prayer glow if landing on the prayer tab
    if (activeTab.value?.id === 'prayer') mapLayers.startPrayerGlow()
    // Hand the same dataset to clustering so MST/network can rebuild on toggle
    clustering.setData?.(normalizedPeopleGroups)
    // Build the initial legend
    legend.build?.(normalizedPeopleGroups)
    // Selected-pin highlight + GO marker — must come after the language-families
    // source exists (added by addLanguageFamilyLayer above).
    selectedPin.initialize()
  }

  // PERF: doxa-regions GeoJSON is 6.4 MB decoded. If the user lands on the
  // Doxa Regions tab (the default), defer the load until the browser is idle
  // so the initial map paint + pin render aren't blocked by JSON.parse().
  if (activeTab.value?.id === 'doxa-regions') {
    const schedule = (typeof window !== 'undefined' && window.requestIdleCallback)
      ? (cb) => window.requestIdleCallback(cb, { timeout: 2000 })
      : (cb) => setTimeout(cb, 800)
    schedule(() => { void ensureRegionsLoaded() })
  }

  // Click-on-empty-map clears any active legend-row filter so dimmed pins
  // restore (qa: 2026-05-02 iter-12 — user reported clicking a row dimmed
  // non-matching pins as expected, but clicking off the row left the dim
  // state stuck). Mapbox layer-specific handlers fire BEFORE this generic
  // one, so we just check queryRenderedFeatures for the relevant interactive
  // layers; if empty, the click landed on empty map.
  map.value.on('click', (e) => {
    const interactiveLayers = ['language-family-pins', 'regions-fill']
      .filter(id => map.value.getLayer(id))
    const hits = interactiveLayers.length
      ? map.value.queryRenderedFeatures(e.point, { layers: interactiveLayers })
      : []
    if (hits.length) return
    const hadFilter =
      uiStore.prayerFilter || uiStore.engagementFilter || uiStore.adoptionFilter || uiStore.religionFilter ||
      mapStore.selectedFamily || mapStore.selectedLanguage || mapStore.selectedDialect ||
      mapStore.selectedRegion
    if (!hadFilter) return
    if (uiStore.prayerFilter)     uiStore.setPrayerFilter?.(null)
    if (uiStore.engagementFilter) uiStore.setEngagementFilter?.(null)
    if (uiStore.adoptionFilter)   uiStore.setAdoptionFilter?.(null)
    if (uiStore.religionFilter)   uiStore.setReligionFilter?.(null)
    clearAllHighlights(map.value)
  })

  mapStore.setMapReady(mapId)
  appReady.value = true
}

// ─── Container-scale ResizeObserver (clone of doxa-simple-map.vue:240-267) ──
// Sets the responsive CSS vars (--map-btn-size, --map-toolbar-gap,
// --map-font-md, --map-font-sm, --map-legend-width) based on host width so
// the geocoder pill, toolbar buttons, and legend card all scale together.
let _containerObserver = null
function applyContainerScale(width) {
  const el = rmRoot.value
  if (!el) return
  if (width >= 700) {
    el.style.setProperty('--map-btn-size',     '40px')
    el.style.setProperty('--map-toolbar-gap',  '8px')
    el.style.setProperty('--map-font-md',      '13px')
    el.style.setProperty('--map-font-sm',      '11px')
    // 380px matches SemanticTreeLegend's .stl-panel + the geocoder pill
    // (qa: 2026-05-02 — pin-detail card was 400px and looked WIDER than the
    // language-family legend below it; unify to 380px so the swap reads
    // as same-card different-content).
    el.style.setProperty('--map-legend-width', '380px')
  } else if (width >= 500) {
    el.style.setProperty('--map-btn-size',     '36px')
    el.style.setProperty('--map-toolbar-gap',  '6px')
    el.style.setProperty('--map-font-md',      '12px')
    el.style.setProperty('--map-font-sm',      '10px')
    el.style.setProperty('--map-legend-width', '360px')
  } else {
    el.style.setProperty('--map-btn-size',     '32px')
    el.style.setProperty('--map-toolbar-gap',  '5px')
    el.style.setProperty('--map-font-md',      '11px')
    el.style.setProperty('--map-font-sm',      '10px')
    el.style.setProperty('--map-legend-width', '280px')
  }
}

onMounted(async () => {
  // uiStore.init() registers the page-level ResizeObserver that drives
  // updateBreakpoint() — without this, breakpoint stays at default 'desktop'
  // and uiStore.isMobile is permanently false even on mobile devices, so
  // any code branching on isMobile (LegendDesktop's internal LegendMobile
  // mount, mobile-only feature gates, etc.) runs the desktop path.
  // The CSS @media path on .rm-legend-mobile-slot still works either way,
  // but isMobile-driven branches don't. (qa: 2026-05-02 mobile audit.)
  uiStore.init?.()
  activeTabId.value = tabs.value[0]?.id ?? 'doxa-regions'
  if (uiStore.isMobile) uiStore.collapseLegend?.()
  else uiStore.openLegend?.()
  // Container-scale: set CSS vars now + observe future resizes.
  if (rmRoot.value) {
    applyContainerScale(rmRoot.value.getBoundingClientRect().width)
    if (typeof ResizeObserver !== 'undefined') {
      _containerObserver = new ResizeObserver(entries => {
        for (const entry of entries) applyContainerScale(entry.contentRect.width)
      })
      _containerObserver.observe(rmRoot.value)
    }
  }
  // First tab ("Prayer") visible at the LEFT on mount — no auto-scroll-to-end.
  // User explicitly preferred this over the previous "scroll-to-end" default
  // (UX 2026-04-27). The active-tab scrollIntoView watcher above still keeps
  // tapped tabs visible if the bar overflows.
  window.addEventListener('doxa:legend-row-click', onLegendRowClick)
  window.addEventListener('legend:highlight', onLegendHighlight)

  const dataPromise = mapData.loadData().catch(err => {
    console.error('[research-map] data load failed:', err)
    return { normalizedPeopleGroups: [] }
  })
  await initializeMap()
  if (!map.value) return
  map.value.once('style.load', async () => {
    const { normalizedPeopleGroups } = await dataPromise
    await onMapReady(normalizedPeopleGroups)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('doxa:legend-row-click', onLegendRowClick)
  window.removeEventListener('legend:highlight', onLegendHighlight)
  if (_containerObserver) { _containerObserver.disconnect(); _containerObserver = null }
  poster.value?.cleanup?.()
  mapLayers.stopPrayerGlow()
  clustering.cleanup?.()
  selectedPin.cleanup?.()
  mapStore.unregisterMap(mapId)
  destroy()
})
</script>

<template>
  <div ref="rmRoot" :class="['rm-root', { 'rm-dark': isDark, 'dsm-dark': isDark }]">
    <!-- 10-tab bar -->
    <div v-if="showTabBar" ref="tabBar" class="rm-tab-bar">
      <template v-for="tab in tabs" :key="tab.id">
        <button
          class="rm-tab"
          :class="{ active: activeTabId === tab.id }"
          @click="switchTab(tab.id)"
        >{{ tab.label }}</button>
        <div v-if="tab.sepAfter" class="rm-tab-sep" aria-hidden="true" />
      </template>
    </div>

    <div class="rm-map-area">
      <div v-if="!appReady" class="rm-loading">Research map loading…</div>
      <div ref="mapContainer" class="rm-map-canvas" />
      <div class="map-scroll-edge map-scroll-edge--left" />
      <div class="map-scroll-edge map-scroll-edge--right" />

      <!-- "RESEARCH" corner badge removed per qa.md R5 status flag (2026-04-27).
           Style class .rm-badge kept in shadow CSS in case future tabs want it. -->

      <!-- Geocoder search bar (top-left) — canonical clone from read-only
           simple-map mfe so tabs 1-3 stay visually identical. -->
      <GeocoderComponent
        ref="geocoderRef"
        v-if="appReady && map"
        :map-instance="map"
        :access-token="mapboxToken"
        :data-source-id="dataSource"
        :is-dark="isDark"
        :placeholder="geocoderPlaceholder"
        @people-group-result="onGeocoderPeopleGroupResult"
        @aggregate-result="onGeocoderAggregateResult"
        @clear="onGeocoderClear"
      />

      <!-- Hamburger menu trigger — feature-flagged OFF per UX 2026-04-27. -->
      <HamburgerButton
        v-if="FEATURES.hamburgerMenu && appReady && map"
        :map="map"
        :is-open="showSideMenu"
        :is-dark="isDark"
        @toggle="showSideMenu = !showSideMenu"
      />

      <!-- Map toolbar (right rail) — canonical button set + ordering. -->
      <MapToolbar v-if="appReady && map">
        <ZoomInButton      :map="map"          :is-dark="isDark" />
        <ZoomOutButton     :map="map"          :is-dark="isDark" />
        <LocationButton    :map="map"          :is-dark="isDark" />
        <FullscreenButton  :map-container="mapContainer" :is-dark="isDark" />
        <ThemeToggleButton :is-dark="isDark"    @toggle="handleToggleTheme" />
      </MapToolbar>

      <!-- Fly + Clusters floating toolbar — sibling of the legend card, mounted
           between MapToolbar and the side menu so its CSS namespace doesn't
           collide with anything. The component's own internal predicate
           (showAutoFlyButton) limits rendering to doxa-regions / language-family
           tabs, so this can stay declared unconditionally besides appReady. -->
      <LegendTools
        v-if="appReady"
        :legend-type="activeLegendType"
        :is-dark="isDark"
      />

      <!-- Side-menu drawer (filter, cluster toggle, poster button) -->
      <ResearchMapSideMenu
        v-if="appReady"
        :is-open="showSideMenu"
        @close="showSideMenu = false"
        @open-poster="openPoster"
      >
        <ResearchMapFilterPanel />
      </ResearchMapSideMenu>

      <!-- Legend — ALL tabs render through SemanticTreeLegend. Flat tabs
           (prayer/adoption/engagement/religion) pass hideTabs to suppress the
           inner tab strip. LegendDesktop only renders for the people-group
           detail panel (pin click → PeopleGroupDetail swap). -->
      <div class="rm-legend-desktop-slot">
        <LegendDesktop
          v-if="appReady && uiStore.legendMode === 'detail' && uiStore.selectedPeopleGroup"
          :legend-type="activeLegendType"
          :popup-action="activePopupAction"
          :initially-collapsed="false"
          :is-dark="isDark"
        />
        <div v-show="!(uiStore.legendMode === 'detail' && uiStore.selectedPeopleGroup)">
          <SemanticTreeLegend
            v-if="appReady"
            :nodes="legendNodes"
            :tabs="legendInnerTabs"
            :title="legendTitle"
            :hideTabs="legendHideTabs"
            :columnLabel="legendColumnLabel"
            :open="_stlOpen"
            @select="onSemanticTreeSelect"
            @update:open="_onStlOpenChange"
          />
        </div>
      </div>
      <div class="rm-legend-mobile-slot">
        <LegendMobile
          v-if="appReady"
          :legend-type="activeLegendType"
          :popup-action="activePopupAction"
          :is-dark="isDark"
        />
      </div>

      <!-- People-group detail (opens on pin click via mapStore.selectedFeature) -->
      <PeopleGroupDetail
        v-if="appReady && selectedFeature"
        :feature="selectedFeature"
        :action="activePopupAction"
        :dark="isDark"
        @close="mapStore.selectFeature(null)"
      />

      <!-- Poster export modal -->
      <PosterDialog
        v-if="showPoster"
        :poster="poster"
        :legend-rows="legend.rows"
        :active-tab="activeTab"
        @close="showPoster = false"
      />
    </div>
  </div>
</template>
