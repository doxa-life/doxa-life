/**
 * Prayer Progress Color Configuration
 * Three-tier strategy:
 *   RED    = Needs Prayer        (peoplePraying === 0 or null)
 *   ORANGE = Has Prayer          (0 < peoplePraying < FULL_PRAYER_THRESHOLD)
 *   GREEN  = Full Prayer Coverage (peoplePraying >= FULL_PRAYER_THRESHOLD)
 *
 * QA Session Round 2 A1: `people_praying` null = 0 = "not prayed for".
 * Implementation: treat null and 0 both as noPrayer (red).
 * When someone prays, people_praying updates to a positive integer → orange.
 * When enough people pray (>= threshold) → green.
 */

/**
 * Number of people praying required for "Full Prayer Coverage".
 * Set to match the platform's prayer goal (144 people per people group).
 * Adjust this constant to change the green threshold.
 */
export const FULL_PRAYER_THRESHOLD = 144

export const PRAYER_COLORS = {
  noPrayer:   '#e74c3c', // Red — Needs Prayer (default)
  hasPrayer:  '#f39c12', // Orange — Has Prayer (partial)
  fullPrayer: '#27ae60'  // Green — Full Prayer Coverage
}

export const PRAYER_LABELS = {
  noPrayer:   'Needs Prayer',
  hasPrayer:  'Has Prayer',
  fullPrayer: 'Has Full Prayer Coverage'
}

/**
 * Determine prayer level: 'noPrayer' | 'hasPrayer' | 'fullPrayer'
 * @param {Object} properties - Feature properties
 * @returns {'noPrayer'|'hasPrayer'|'fullPrayer'}
 */
export function getPrayerLevel(properties) {
  const peoplePraying = properties.peoplePraying ?? properties._raw?.people_praying ?? null
  const count = Number(peoplePraying) || 0
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
  return PRAYER_COLORS[getPrayerLevel(properties)]
}

/**
 * Check if a people group has any prayer (partial or full).
 * Backward-compatible — returns true when peoplePraying > 0.
 * @param {Object} properties - Feature properties
 * @returns {boolean}
 */
export function checkHasPrayer(properties) {
  const peoplePraying = properties.peoplePraying ?? properties._raw?.people_praying ?? null
  return peoplePraying !== null && peoplePraying > 0
}

/**
 * Check if a people group has full prayer coverage.
 * @param {Object} properties - Feature properties
 * @returns {boolean}
 */
export function checkHasFullPrayer(properties) {
  return getPrayerLevel(properties) === 'fullPrayer'
}
