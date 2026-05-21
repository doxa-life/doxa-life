/**
 * Affinity Block Color Strategy
 *
 * Colors pins based on their ROP1 code (A001, A002, etc.).
 * Uses ROP1 code as the primary key for consistency across data sources.
 *
 * ARCHITECTURE DECISION:
 * - Use ROP1 codes (A001, A002, etc.) as the PRIMARY KEY
 * - Store mappings from ROP1 → Name and ROP1 → Color
 * - Avoids issues with typos in affinity block names
 *
 * Sourced from doxa-research-mfe (research wins on drift).
 */

export const PROPERTY_KEY = 'affinityBlock' // This is the ROP1 code

const DEFAULT_COLOR = '#95a5a6'

/** Primary mapping: ROP1 Code → Affinity Block Name */
export const AFFINITY_BLOCK_NAMES = {
  'A001': 'Arab World',
  'A002': 'East Asian Peoples',
  'A003': 'Eurasian Peoples',
  'A004': 'Horn of Africa Peoples',
  'A005': 'Jewish',
  'A006': 'Malay Peoples',
  'A007': 'Persian-Median Peoples',
  'A008': 'South Asian Peoples',
  'A009': 'North American Peoples',
  'A010': 'Pacific Islanders',
  'A011': 'Southeast Asian Peoples',
  'A012': 'Sub-Saharan Peoples',
  'A013': 'Tibetan-Himalayan Peoples',
  'A014': 'Turkic Peoples',
  'A015': 'Latin-Caribbean Americans',
  'A017': 'Deaf'
}

/** Primary mapping: ROP1 Code → Color */
export const PALETTE = {
  'A001': '#E74C3C',  // Arab World - Red/Orange
  'A002': '#3498DB',  // East Asian Peoples - Blue
  'A003': '#2ECC71',  // Eurasian Peoples - Green
  'A004': '#F39C12',  // Horn of Africa Peoples - Orange
  'A005': '#9B59B6',  // Jewish - Purple
  'A006': '#1ABC9C',  // Malay Peoples - Teal
  'A007': '#E67E22',  // Persian-Median Peoples - Dark orange
  'A008': '#34495E',  // South Asian Peoples - Dark blue-grey
  'A009': '#95A5A6',  // North American Peoples - Grey
  'A010': '#5DADE2',  // Pacific Islanders - Light blue
  'A011': '#16A085',  // Southeast Asian Peoples - Sea green
  'A012': '#C0392B',  // Sub-Saharan Peoples - Deep red
  'A013': '#8E44AD',  // Tibetan-Himalayan Peoples - Purple
  'A014': '#D35400',  // Turkic Peoples - Burnt orange
  'A015': '#27AE60',  // Latin-Caribbean Americans - Forest green
  'A017': '#000000'   // Deaf - Black (universal accessibility)
}

export const AFFINITY_BLOCK_COLORS = PALETTE

/** Reverse lookup: Name → ROP1 Code */
export const AFFINITY_BLOCK_NAME_TO_CODE = Object.entries(AFFINITY_BLOCK_NAMES).reduce((acc, [code, name]) => {
  acc[name] = code
  return acc
}, {})

/** Legacy: Name-based color lookup (for backward compatibility) */
export const AFFINITY_BLOCK_COLORS_BY_NAME = Object.entries(AFFINITY_BLOCK_NAMES).reduce((acc, [code, name]) => {
  acc[name] = AFFINITY_BLOCK_COLORS[code]
  return acc
}, {})

export const NAMES = AFFINITY_BLOCK_NAMES

export function getAffinityBlockName(code) {
  return AFFINITY_BLOCK_NAMES[code] || 'Unknown'
}

export function getAffinityBlockColorByCode(code) {
  return AFFINITY_BLOCK_COLORS[code] || DEFAULT_COLOR
}

/**
 * Get color for an affinity block (supports both ROP1 code and name).
 */
export function getAffinityBlockColor(blockNameOrCode) {
  if (!blockNameOrCode) return DEFAULT_COLOR

  if (typeof blockNameOrCode === 'string' && /^A\d{3}$/.test(blockNameOrCode)) {
    return AFFINITY_BLOCK_COLORS[blockNameOrCode] || DEFAULT_COLOR
  }

  return AFFINITY_BLOCK_COLORS_BY_NAME[blockNameOrCode] || DEFAULT_COLOR
}

export function getAffinityBlocksArray() {
  return Object.entries(AFFINITY_BLOCK_NAMES).map(([code, name]) => ({
    code,
    name,
    color: AFFINITY_BLOCK_COLORS[code]
  }))
}

export function getAffinityBlockData(code) {
  return {
    code,
    name: AFFINITY_BLOCK_NAMES[code] || 'Unknown',
    color: AFFINITY_BLOCK_COLORS[code] || DEFAULT_COLOR
  }
}

/**
 * Strategy-aligned getter — uniform name across all per-strategy modules.
 * Expects properties.affinityBlock to contain ROP1 code (e.g., "A007").
 */
export function getColor(properties) {
  const rop1Code = properties.affinityBlock || properties._raw?.ROP1
  return getAffinityBlockColorByCode(rop1Code)
}

/**
 * Get display name for a feature.
 */
export function getName(properties) {
  const rop1Code = properties.affinityBlock || properties._raw?.ROP1
  return getAffinityBlockName(rop1Code)
}

/**
 * Build Mapbox color expression for affinity blocks.
 * Uses ROP1 code (A001, A002, etc.) as the match key.
 */
export function applyColor() {
  const colorExpression = ['match', ['get', PROPERTY_KEY]]
  Object.entries(AFFINITY_BLOCK_COLORS).forEach(([code, color]) => {
    colorExpression.push(code, color)
  })
  colorExpression.push(DEFAULT_COLOR)
  return colorExpression
}

export const buildColorExpression = applyColor

// Backward-compatibility aliases
export const affinityBlockCodeToName = AFFINITY_BLOCK_NAMES
export const affinityBlockCodeToColor = AFFINITY_BLOCK_COLORS
export const affinityBlockNameToCode = AFFINITY_BLOCK_NAME_TO_CODE
export const affinityBlockColors = AFFINITY_BLOCK_COLORS_BY_NAME
export const affinityBlockCodeLookup = AFFINITY_BLOCK_NAMES

export default {
  name: 'Affinity Block',
  propertyKey: PROPERTY_KEY,
  palette: PALETTE,
  colors: PALETTE,
  names: NAMES,
  getColor,
  applyColor,
  buildColorExpression,
  getName,
  getAffinityBlockName,
  getAffinityBlockColor,
  getAffinityBlockColorByCode,
  getAffinityBlocksArray,
  getAffinityBlockData
}
