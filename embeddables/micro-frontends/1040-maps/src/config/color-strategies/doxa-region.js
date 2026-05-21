/**
 * DOXA Region Color Strategy
 *
 * Colors pins based on their DOXA / WAGF region.
 * Sourced from doxa-research-mfe (research wins on drift).
 *
 * Drift note (vs simple-map):
 *   - simple-map's 'No WAGF Region/Bloc' = '#95a5a6' (grey),
 *     research = '#1a1a2e' (deep navy). Research wins.
 *
 * generateColorFromString fallback comes from utils/geoUtils.js — sister
 * subagent 1D owns that file. Cross-folder dep flagged.
 */

import { generateColorFromString } from '../../utils/geoUtils.js'

export const PROPERTY_KEY = 'doxaRegion'

const DEFAULT_COLOR = '#0098FF' // Bright blue for null/undefined region
const FALLBACK_COLOR = '#95a5a6'

/**
 * DOXA Region Color Palette — defines colors for the 8 DOXA regions.
 */
export const PALETTE = {
  'Africa': '#e74c3c',
  'Asia': '#3498db',
  'Europe': '#2ecc71',
  'Latin America & Caribbean': '#f39c12',
  'Middle East': '#9b59b6',
  'No WAGF Region/Bloc': '#1a1a2e',
  'North America & Non-Spanish Caribbean': '#1abc9c',
  'Oceania': '#e67e22'
}

export const DOXA_REGION_COLORS = PALETTE

/** Extended region aliases for flexible matching */
export const REGION_COLOR_ALIASES = {
  'Africa': '#e74c3c',
  'East Asia': '#3498db',
  'Asia': '#3498db',
  'Eurasia': '#2ecc71',
  'Europe': '#2ecc71',
  'Latin America': '#f39c12',
  'Latin America & Caribbean': '#f39c12',
  'Caribbean': '#f39c12',
  'Middle East': '#9b59b6',
  'North America': '#1abc9c',
  'North America (non-spanish)': '#1abc9c',
  'North America & Non-Spanish Caribbean': '#1abc9c',
  'Pacific': '#e67e22',
  'Oceania': '#e67e22',
  'South Asia': '#e67e22',
  'No WAGF Region/Bloc': '#1a1a2e',
  'Unknown': '#0098FF'
}

/**
 * Get color for a region — falls back to a deterministic
 * generateColorFromString() so unmapped regions still render.
 */
export function getRegionColor(regionName) {
  if (!regionName) {
    return DEFAULT_COLOR
  }

  const color = REGION_COLOR_ALIASES[regionName]
  if (!color) {
    return generateColorFromString(regionName)
  }

  return color
}

export function getColor(properties) {
  const region = properties.doxaRegion || properties._normalized?.doxaRegion
  return PALETTE[region] || FALLBACK_COLOR
}

/**
 * Build Mapbox color expression for DOXA regions.
 */
export function applyColor() {
  const colorExpression = ['match', ['get', PROPERTY_KEY]]
  Object.entries(PALETTE).forEach(([region, color]) => {
    colorExpression.push(region, color)
  })
  colorExpression.push(FALLBACK_COLOR)
  return colorExpression
}

export const buildColorExpression = applyColor

export default {
  name: 'DOXA Region',
  propertyKey: PROPERTY_KEY,
  palette: PALETTE,
  colors: PALETTE,
  aliases: REGION_COLOR_ALIASES,
  getColor,
  applyColor,
  buildColorExpression,
  getRegionColor
}
