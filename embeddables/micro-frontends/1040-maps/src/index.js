/**
 * @map — public surface re-exports.
 *
 * Convention: bundles import from this barrel for the most-used pieces, OR
 * subpath-import from '@map/components/X.vue' / '/composables/Y.js'
 * etc. for surgical imports that tree-shake more cleanly.
 *
 * Add re-exports as `map-core` grows during migration. Keep this file thin —
 * a fat barrel kills tree-shaking. Subpath imports are preferred.
 */

// Components — populated during migration-001+
// export { default as SemanticTreeLegend } from './components/SemanticTreeLegend.vue'
// export { default as PeopleGroupDetail }  from './components/PeopleGroupDetail.vue'

// Composables — populated during migration-001+
// export { useMapData }     from './composables/useMapData.js'
// export { useMapLayers }   from './composables/useMapLayers.js'
// export { useDoxaSearch }  from './composables/useDoxaSearch.js'

// Config — populated during migration-001+
// export * from './config/colorStrategies.js'
// export * from './config/colors.js'
// export * from './config/prayerColors.js'

// Utils — populated during migration-001+
// export { default as DataSourceManager } from './utils/DataSourceManager.js'

// Stores — Pinia stores live at './stores/<name>.js' and are intentionally NOT
// re-exported here. Bundle entries should subpath-import them as
// `@map/stores/dataStore.js` (or mapStore / uiStore) for tree-shaking
// reasons. Keeping this barrel thin avoids pulling pinia into bundles that
// don't need it.

// Data lookup tables — JSON in './data/' (e.g. langFamilyByLanguage.json) —
// subpath-import as `@map/data/langFamilyByLanguage.json`. Not
// re-exported (would force JSON into the barrel chunk).

export const MAP_CORE_VERSION = '0.1.0'
