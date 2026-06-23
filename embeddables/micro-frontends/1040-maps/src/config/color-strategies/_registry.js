/**
 * Color Strategies Registry
 *
 * Central enum + lookup for all per-strategy modules in this folder.
 * Each strategy lives in its own file (one strategy = one file rule, per
 * upstream refactor ideation3.md § R2).
 *
 * Add a new strategy:
 *   1. Create <name>.js next to this file (export default { ... }).
 *   2. Add an entry to COLOR_MODES.
 *   3. Import + register in STRATEGIES below.
 */

import prayerProgress  from './prayer-progress.js'
import engagement      from './engagement.js'
import adoption        from './adoption.js'
import affinityBlock   from './affinity-block.js'
import languageFamily  from './language-family.js'
import doxaRegion      from './doxa-region.js'
import resource        from './resource.js'
import religion        from './religion.js'

export const COLOR_MODES = {
  LANGUAGE_FAMILY:  'languageFamily',
  AFFINITY_BLOCK:   'affinityBlock',
  DOXA_REGION:      'doxaRegion',
  RESOURCE:         'resource',
  STATUS:           'status',
  CUSTOM:           'custom',
  PRAYER_PROGRESS:  'prayerProgress',
  ENGAGEMENT:       'engagement',
  ADOPTION:         'adoption',
  RELIGION:         'religion'
}

const STRATEGIES = {
  [COLOR_MODES.LANGUAGE_FAMILY]:  languageFamily,
  [COLOR_MODES.AFFINITY_BLOCK]:   affinityBlock,
  [COLOR_MODES.DOXA_REGION]:      doxaRegion,
  [COLOR_MODES.RESOURCE]:         resource,
  [COLOR_MODES.PRAYER_PROGRESS]:  prayerProgress,
  [COLOR_MODES.ENGAGEMENT]:       engagement,
  [COLOR_MODES.ADOPTION]:         adoption,
  [COLOR_MODES.RELIGION]:        religion,
}

/**
 * Resolve a color strategy by mode key.
 * Falls back to LANGUAGE_FAMILY when mode is missing or unknown.
 *
 * @param {string} mode - Color mode (from COLOR_MODES)
 * @returns {object} Strategy module default export
 */
export function getColorStrategy(mode) {
  return STRATEGIES[mode] || STRATEGIES[COLOR_MODES.LANGUAGE_FAMILY]
}

/**
 * Build Mapbox color expression for a given mode.
 *
 * @param {string} mode - Color mode (from COLOR_MODES)
 * @param {{ colorSource?: 'properties'|'feature-state' }} [options]
 * @returns {array} Mapbox expression array
 */
export function buildColorExpression(mode, options = {}) {
  const strategy = getColorStrategy(mode)
  return strategy.applyColor(options)
}

/**
 * Get color for a feature based on mode.
 *
 * @param {object} properties - Feature properties
 * @param {string} mode - Color mode (from COLOR_MODES)
 * @returns {string} Hex color code
 */
export function getFeatureColor(properties, mode) {
  const strategy = getColorStrategy(mode)
  return strategy.getColor(properties)
}

/**
 * List all registered strategies (for debug / introspection).
 */
export function listStrategies() {
  return Object.entries(STRATEGIES).map(([mode, strategy]) => ({
    mode,
    name: strategy.name,
    propertyKey: strategy.propertyKey
  }))
}

export {
  prayerProgress,
  engagement,
  adoption,
  affinityBlock,
  languageFamily,
  doxaRegion,
  resource,
  religion
}

// Back-compat: name matches the monolithic colorStrategies.js export.
export const colorStrategies = STRATEGIES

export default {
  COLOR_MODES,
  colorStrategies: STRATEGIES,
  getColorStrategy,
  buildColorExpression,
  getFeatureColor,
  listStrategies
}
