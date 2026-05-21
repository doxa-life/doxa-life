/**
 * Religion color strategy — colors pins by religion family.
 *
 * The Doxa API's `religion` field is a 1-3 char code (e.g., "CPR", "MSN", "H").
 * The FIRST LETTER identifies the religion family:
 *   C = Christianity (special — only family that gets blue)
 *   M = Islam (Muslim)
 *   H = Hinduism
 *   B = Buddhism
 *   E = Ethnoreligion
 *   J = Judaism
 *   S = Sikhism
 *   N = Unaffiliated
 *   O = Other (Bahai, Druze, Jainism, Mandaeism, Zoroastrianism)
 *   U = Unknown
 *
 * Convention: Christianity is the ONLY family colored blue. Every other family
 * uses a non-blue hue (red/orange/yellow/green/purple/pink/gray) so blue pins
 * always read as "Christianity". This is the inverse of every other taxonomy
 * map — the blue-stand-out lets the eye pick out Christ-following peoples
 * against the broader religious landscape.
 *
 * Field on Mapbox feature: `religion` (the code value, ValueLabel-flattened by
 * DataSourceManager — see objectFields list in DSM).
 */

export const PROPERTY_KEY = 'religion'

const DEFAULT_COLOR = '#94a3b8' // soft slate gray (matches Unknown family)

/**
 * Family-letter → display name. Used by the legend to render row labels.
 */
export const RELIGION_FAMILIES = {
  'C': 'Christianity',
  'M': 'Islam',
  'H': 'Hinduism',
  'B': 'Buddhism',
  'E': 'Ethnoreligion',
  'J': 'Judaism',
  'S': 'Sikhism',
  'N': 'Unaffiliated',
  'O': 'Other',
  'U': 'Unknown',
}

/**
 * Family-letter → color. Christianity is the only blue; every other family
 * sits on a non-blue hue so Christ-following pins read as distinct.
 */
export const PALETTE = {
  'C': '#3b82f6', // Christianity — light blue (the ONLY blue)
  'M': '#ef4444', // Islam — red
  'H': '#f59e0b', // Hinduism — saffron / orange
  'B': '#facc15', // Buddhism — gold / yellow
  'E': '#84cc16', // Ethnoreligion — lime green
  'J': '#a855f7', // Judaism — purple
  'S': '#ec4899', // Sikhism — pink / magenta
  'N': '#71717a', // Unaffiliated — neutral gray
  'O': '#ff6b2b', // Other — vivid orange
  'U': '#94a3b8', // Unknown — slate gray
}

/** First letter of the religion code = family. Defaults to 'U' when missing. */
export function getReligionFamily(code) {
  if (!code || typeof code !== 'string') return 'U'
  const firstChar = code.charAt(0).toUpperCase()
  return RELIGION_FAMILIES[firstChar] ? firstChar : 'U'
}

/** Per-feature color resolver, used by Mapbox at the JS layer. */
export function getColor(properties) {
  const code = properties?.religion || properties?._raw?.religion?.value || properties?._raw?.religion
  return PALETTE[getReligionFamily(code)] || DEFAULT_COLOR
}

/**
 * Build a Mapbox match expression colored by religion family.
 * Uses ['slice', ['get', 'religion'], 0, 1] to extract the first letter.
 */
export function applyColor() {
  return [
    'match',
    ['slice', ['coalesce', ['get', 'religion'], ''], 0, 1],
    'C', PALETTE.C,
    'M', PALETTE.M,
    'H', PALETTE.H,
    'B', PALETTE.B,
    'E', PALETTE.E,
    'J', PALETTE.J,
    'S', PALETTE.S,
    'N', PALETTE.N,
    'O', PALETTE.O,
    /* default */ DEFAULT_COLOR,
  ]
}

// Alias so callers that use the registry-level name (e.g. the tab-switch
// handler in research-map.vue at `strat?.buildColorExpression()`) work.
// Mirrors the pattern in language-family.js / affinity-block.js / doxa-region.js.
export const buildColorExpression = applyColor

export default {
  propertyKey: PROPERTY_KEY,
  palette:     PALETTE,
  families:    RELIGION_FAMILIES,
  getColor,
  applyColor,
  buildColorExpression,
  fallback:    DEFAULT_COLOR,
}
