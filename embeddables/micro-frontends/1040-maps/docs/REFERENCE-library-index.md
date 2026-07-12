# REFERENCE-library-index — reusable pieces you can import into an app-profile

> **DERIVED FILE — do not hand-edit.** Regenerate: `node internal/generate-library-index.mjs`
> Generated: run `node internal/generate-library-index.mjs` to refresh

**You are a programmer (or an agent) building a map.** This is the menu of REUSABLE,
parameterized pieces the shared `library/` offers. Import what you need with the `@map/…`
alias; **build your own custom code in your app-profile's `src/` folder.** Do NOT edit
anything listed here unless you know what you're doing — these are shared across every map,
and a change here can break other maps.

- **Three zones:** `library/` (this menu — reuse, don't edit) · `app-profiles/<map>/` (your sandbox — build anything) · `internal/` (the build machine — never touch).
- **To make a new map:** copy `app-profiles/template-bundle/`, read its README, list your requirements, pick from below.

### Components (reusable UI)

- **PeopleGroupDetail** — (no description)  
  `import … from '@map/components/PeopleGroupDetail.vue'`
- **ResearchMapFilterPanel** — ResearchMapFilterPanel.vue — Multi-field filter UI for the research-map.  
  `import … from '@map/components/ResearchMapFilterPanel.vue'`
- **ResearchMapSideMenu** — ResearchMapSideMenu.vue — Side drawer specific to the research-map profile.  
  `import … from '@map/components/ResearchMapSideMenu.vue'`
- **SideMenuDrawer** — SideMenuDrawer.vue — Slide-in side panel for the map application.  
  `import … from '@map/components/SideMenuDrawer.vue'`
- **LegendDesktop** — Async-import the heavier branches so the boot bundle stays lean.  
  `import … from '@map/components/legends/LegendDesktop.vue'`
- **LegendMobile** — useShadowStyles(  
  `import … from '@map/components/legends/LegendMobile.vue'`
- **LegendRows** — (no description)  
  `import … from '@map/components/legends/LegendRows.vue'`
- **LegendTools** — LegendTools.vue — Fly + Clusters floating toolbar  
  `import … from '@map/components/legends/LegendTools.vue'`
- **SemanticTreeLegend** — SemanticTreeLegend — reusable hierarchical legend for any one-to-many semantic tree.  
  `import … from '@map/components/legends/SemanticTreeLegend.vue'`
- **FullscreenButton** — FullscreenButton.vue — Toggles fullscreen for the map host element.  
  `import … from '@map/components/map-controls/FullscreenButton.vue'`
- **GeocoderComponent** — GeocoderComponent.vue — Mapbox Geocoder search bar as a self-contained Vue component.  
  `import … from '@map/components/map-controls/GeocoderComponent.vue'`
- **HamburgerButton** — HamburgerButton.vue — Toggle button for the side menu drawer.  
  `import … from '@map/components/map-controls/HamburgerButton.vue'`
- **HelpButton** — HelpButton.vue — Opens the "About this map" help modal.  
  `import … from '@map/components/map-controls/HelpButton.vue'`
- **LocationButton** — LocationButton.vue — Flies the map to the user's current location via the  
  `import … from '@map/components/map-controls/LocationButton.vue'`
- **MapControlButton** — MapControlButton.vue — Shared base button for all map toolbar controls.  
  `import … from '@map/components/map-controls/MapControlButton.vue'`
- **MapToolbar** — MapToolbar.vue — Positioned layout shell for map control buttons.  
  `import … from '@map/components/map-controls/MapToolbar.vue'`
- **ShareButton** — ShareButton.vue — Non-technical share modal for the map toolbar.  
  `import … from '@map/components/map-controls/ShareButton.vue'`
- **ThemeToggleButton** — ThemeToggleButton.vue — Switches the app between light and dark mode.  
  `import … from '@map/components/map-controls/ThemeToggleButton.vue'`
- **ZoomInButton** — ZoomInButton.vue — Increments the map zoom level by one step.  
  `import … from '@map/components/map-controls/ZoomInButton.vue'`
- **ZoomOutButton** — ZoomOutButton.vue — Decrements the map zoom level by one step.  
  `import … from '@map/components/map-controls/ZoomOutButton.vue'`
- **PosterDialog** — PosterDialog.vue — modal for previewing + rendering a poster export.  
  `import … from '@map/components/poster/PosterDialog.vue'`
- **PosterPreview** — PosterPreview.vue — scaled live preview of the poster composition.  
  `import … from '@map/components/poster/PosterPreview.vue'`
- **FooterSlot** — FooterSlot.vue — STUB. Poster-rendering slot for FooterSlot.  
  `import … from '@map/components/poster/slots/FooterSlot.vue'`
- **LegendSlot** — LegendSlot.vue — STUB. Poster-rendering slot for LegendSlot.  
  `import … from '@map/components/poster/slots/LegendSlot.vue'`
- **NorthArrowSlot** — NorthArrowSlot.vue — STUB. Poster-rendering slot for NorthArrowSlot.  
  `import … from '@map/components/poster/slots/NorthArrowSlot.vue'`
- **ScaleBarSlot** — ScaleBarSlot.vue — STUB. Poster-rendering slot for ScaleBarSlot.  
  `import … from '@map/components/poster/slots/ScaleBarSlot.vue'`
- **TitleSlot** — TitleSlot.vue — renders the poster title strip.  
  `import … from '@map/components/poster/slots/TitleSlot.vue'`

### Composables (reusable logic — Vue Composition API)

- **researchLegendOptions** — researchLegendOptions.js — research-mfe-only options passed to the shared  
  `import … from '@map/composables/legends/researchLegendOptions.js'`
- **useAffinityBlockLegendData** — useAffinityBlockLegendData — 4-tier affinity-block legend data for SemanticTreeLegend.  
  `import … from '@map/composables/legends/useAffinityBlockLegendData.js'`
- **useLanguageFamilyLegendData** — useLanguageFamilyLegendData — language-family legend rows with  
  `import … from '@map/composables/legends/useLanguageFamilyLegendData.js'`
- **useLegendData** — useLegendData — builds a unified, data-driven legend item tree  
  `import … from '@map/composables/legends/useLegendData.js'`
- **useWagfRegionsLegendData** — useWagfRegionsLegendData — 3-tier WAGF Regions legend for SemanticTreeLegend.  
  `import … from '@map/composables/legends/useWagfRegionsLegendData.js'`
- **useMapPoster** — useMapPoster — render a Mapbox GL map to a poster-grade PNG or PDF blob.  
  `import … from '@map/composables/poster/useMapPoster.js'`
- **usePosterLayout** — usePosterLayout — slot positioning math for poster compositions.  
  `import … from '@map/composables/poster/usePosterLayout.js'`
- **useAvatarGenerator** — Avatar Generator Composable  
  `import … from '@map/composables/useAvatarGenerator.js'`
- **useCountryOutline** — useCountryOutline.js — country boundary OUTLINE overlay on country search.  
  `import … from '@map/composables/useCountryOutline.js'`
- **useDoxaSearch** — useDoxaSearch.js — Local geocoder search composable  
  `import … from '@map/composables/useDoxaSearch.js'`
- **useGeocoderSearch** — Shared geocoder→map search logic (kind-switch + Mapbox filter builder + the  
  `import … from '@map/composables/useGeocoderSearch.js'`
- **useMapClustering** — useMapClustering.js — Map Clustering Composable  
  `import … from '@map/composables/useMapClustering.js'`
- **useMapData** — useMapData.js - Map Data Loading Composable  
  `import … from '@map/composables/useMapData.js'`
- **useMapEvents** — useMapEvents.js - Map Event Handlers Composable  
  `import … from '@map/composables/useMapEvents.js'`
- **useMapFly** — useMapFly.js - Map Navigation/Fly Composable  
  `import … from '@map/composables/useMapFly.js'`
- **useMapInstance** — useMapInstance.js — Map Initialization Composable  
  `import … from '@map/composables/useMapInstance.js'`
- **useMapLayers** — useMapLayers.js - Map Layers Composable  
  `import … from '@map/composables/useMapLayers.js'`
- **useMapPacket** — useMapPacket — render a multi-page "prayer packet" PDF for a map selection.  
  `import … from '@map/composables/useMapPacket.js'`
- **useMapSelection** — useMapSelection.js - Map Selection Composable  
  `import … from '@map/composables/useMapSelection.js'`
- **useMapTheme** — useMapTheme.js — shared light/dark theme for every map profile.  
  `import … from '@map/composables/useMapTheme.js'`
- **usePplrInstance** — usePplrInstance.js — per-map "instance store" mediator.  
  `import … from '@map/composables/usePplrInstance.js'`
- **usePrayerStatistics** — usePrayerStatistics.js — the ONE authoritative prayer-coverage source of truth.  
  `import … from '@map/composables/usePrayerStatistics.js'`
- **useSelectedPin** — useSelectedPin.js - Selected Pin Highlight + Animated GO Marker  
  `import … from '@map/composables/useSelectedPin.js'`
- **useShadowStyles** — useShadowStyles.js — Shadow DOM Style Injection  
  `import … from '@map/composables/useShadowStyles.js'`

### Utilities (pure helper functions)

- **ClusterHelpers** — ClusterHelpers.js — Pure helpers shared across clustering modes.  
  `import … from '@map/utils/ClusterHelpers.js'`
- **DataSourceManager** — Back-compat shim. The real DataSourceManager.js lives in the api/ seam  
  `import … from '@map/utils/DataSourceManager.js'`
- **MSTClusteringUtil** — MSTClusteringUtil.js  
  `import … from '@map/utils/MSTClusteringUtil.js'`
- **NetworkClusteringUtil** — NetworkClusteringUtil.js  
  `import … from '@map/utils/NetworkClusteringUtil.js'`
- **apiBaseUrl** — Back-compat shim. The real apiBaseUrl.js lives in the api/ seam folder.  
  `import … from '@map/utils/apiBaseUrl.js'`
- **geoUtils** — geoUtils.js — Geographic / GeoJSON Utility Functions  
  `import … from '@map/utils/geoUtils.js'`

### Stores (Pinia — shared state)

- **dataStore** — dataStore.js — Centralized data cache  
  `import … from '@map/stores/dataStore.js'`
- **mapStore** — Map Store - Centralized state management for all map instances  
  `import … from '@map/stores/mapStore.js'`
- **uiStore** — UI Store - Centralized UI state management  
  `import … from '@map/stores/uiStore.js'`

### Constants (never-change values)

- **mapDefaults** — mapDefaults.js — Default map initialization settings  
  `import … from '@map/constants/mapDefaults.js'`
- **posterDefaults** — posterDefaults.js — default margins, bleed, slot sizes, and typography  
  `import … from '@map/constants/posterDefaults.js'`
- **posterSizes** — posterSizes.js — preset poster dimensions (US + ISO).  
  `import … from '@map/constants/posterSizes.js'`
- **zoom** — zoom.js - Centralized Zoom Configuration  
  `import … from '@map/constants/zoom.js'`

### Data (static reference tables)

- **iso-numeric-to-alpha2** — "4":"AF","8":"AL","12":"DZ","24":"AO","32":"AR","36":"AU","40":"AT","50":"BD",  
  `import … from '@map/data/iso-numeric-to-alpha2.json'`
- **langFamilyByIso** — "aar": "Afro-Asiatic",  
  `import … from '@map/data/langFamilyByIso.json'`
- **langFamilyByLanguage** — {"Chamacoco":"Zamucoan","Ninam":"Yanomaman","Yagua":"Yaguan","Muinane":"Witotoan","Finnish":"Uralic","Hill Mar  
  `import … from '@map/data/langFamilyByLanguage.json'`

### API / data sources (`@map/api`)

The library provides the data-source **mechanism**; you declare WHICH sources your map uses
in your own `src/api/sources.json`. Add a REST API, CSV, or MCP source by adding one entry —
no code. Mechanism (do not edit): `@map/api/_registry.js`, `@map/api/DataSourceManager.js`.

### Colors (`@map/colors`)

The library provides the color-strategy **registry** (the mechanism). Shared color taxonomies
(religion, adoption, engagement, language-family) live here. Your map's OWN colors live in your
app-profile's `src/colors/` folder — strategy `.js` files auto-merge OVER the shared set
for your map only, so editing them can't break other maps. Mechanism (do not edit): `@map/colors/_registry.js`.
