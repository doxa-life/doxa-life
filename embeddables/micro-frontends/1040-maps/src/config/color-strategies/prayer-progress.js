/**
 * Prayer Progress Color Strategy
 *
 * Three-tier coloring based on how many people have committed to pray:
 *   RED    = No One Committed      (peopleCommitted === 0 or null)
 *   ORANGE = 1+ Committed to Pray  (0 < peopleCommitted < FULL_PRAYER_THRESHOLD)
 *   GREEN  = 100+ Committed to Pray (peopleCommitted >= FULL_PRAYER_THRESHOLD)
 *
 * Sourced from doxa-research-mfe (research wins on drift).
 */

export const PROPERTY_KEY = 'peopleCommitted'

/**
 * Number of people committed to pray required for "Full Prayer Coverage".
 * Set to match the platform's prayer goal (100 people per people group).
 * Adjust this constant to change the green threshold.
 */
export const FULL_PRAYER_THRESHOLD = 100

export const PALETTE = {
  noPrayer: '#e74c3c', // Red — No One Committed (default)
  hasPrayer: '#f39c12', // Orange — 1+ Committed to Pray (partial)
  fullPrayer: '#22c55e' // Green — 100+ Committed to Pray
}

export const PRAYER_COLORS = PALETTE

export const LABELS = {
  noPrayer: 'No One Committed',
  hasPrayer: '1+ Committed to Pray',
  fullPrayer: '100+ Committed to Pray'
}

export const PRAYER_LABELS = LABELS

/**
 * Determine prayer level: 'noPrayer' | 'hasPrayer' | 'fullPrayer'
 * @param {Object} properties - Feature properties
 * @returns {'noPrayer'|'hasPrayer'|'fullPrayer'}
 */
export function getPrayerLevel(properties) {
  const peopleCommitted = properties.peopleCommitted ?? properties._raw?.people_committed ?? null
  const count = Number(peopleCommitted) || 0
  if (count >= FULL_PRAYER_THRESHOLD) return 'fullPrayer'
  if (count > 0) return 'hasPrayer'
  return 'noPrayer'
}

/**
 * Determine prayer color based on feature properties.
 * @param {Object} properties - Feature properties
 * @returns {string} Color hex code
 */
export function getPrayerColor(properties) {
  return PALETTE[getPrayerLevel(properties)]
}

/**
 * Check if a people group has any prayer (partial or full).
 * @param {Object} properties - Feature properties
 * @returns {boolean}
 */
export function checkHasPrayer(properties) {
  const peopleCommitted = properties.peopleCommitted ?? properties._raw?.people_committed ?? null
  return peopleCommitted !== null && peopleCommitted > 0
}

/**
 * Check if a people group has full prayer coverage.
 * @param {Object} properties - Feature properties
 * @returns {boolean}
 */
export function checkHasFullPrayer(properties) {
  return getPrayerLevel(properties) === 'fullPrayer'
}

/**
 * Strategy-aligned getter — uniform name across all per-strategy modules.
 */
export function getColor(properties) {
  return getPrayerColor(properties)
}

/**
 * Build Mapbox color expression for prayer progress (3-tier).
 * @param {{ colorSource?: 'properties'|'feature-state' }} [options]
 *   'properties'    — reads from GeoJSON feature properties (initial load)
 *   'feature-state' — reads from Mapbox feature-state (polling updates, per-pin)
 */
export function applyColor({ colorSource = 'properties' } = {}) {
  const valueExpr = colorSource === 'feature-state'
    ? ['feature-state', 'peopleCommitted']
    : ['get', 'peopleCommitted']

  return [
    'case',
    // peopleCommitted >= FULL_PRAYER_THRESHOLD → Green (full prayer coverage)
    ['>=', valueExpr, FULL_PRAYER_THRESHOLD],
    PALETTE.fullPrayer,
    // peopleCommitted > 0 → Orange (has prayer, partial)
    ['>', valueExpr, 0],
    PALETTE.hasPrayer,
    // Default: null / 0 → Red (needs prayer)
    PALETTE.noPrayer
  ]
}

// Back-compat alias for migration from monolithic colorStrategies.js
export const buildColorExpression = applyColor

export default {
  name: 'Prayer Progress',
  propertyKey: PROPERTY_KEY,
  palette: PALETTE,
  colors: PALETTE,
  labels: LABELS,
  threshold: FULL_PRAYER_THRESHOLD,
  getColor,
  applyColor,
  buildColorExpression,
  getPrayerLevel,
  getPrayerColor,
  checkHasPrayer,
  checkHasFullPrayer
}
