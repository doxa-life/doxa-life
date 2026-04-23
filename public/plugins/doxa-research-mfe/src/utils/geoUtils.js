/**
 * geoUtils.js — Geographic / GeoJSON Utility Functions
 *
 * Pure functions — no Vue, no Mapbox dependency.
 * Safe to use in composables, stores, or profile components.
 */

/**
 * Extract all coordinates from a GeoJSON geometry.
 * @param {Object} geometry    - GeoJSON geometry (Polygon or MultiPolygon)
 * @param {Array}  coordsArray - Array to push [lng, lat] pairs into
 */
export function extractCoordinates(geometry, coordsArray) {
  if (!geometry || !coordsArray) return
  if (geometry.type === 'Polygon') {
    geometry.coordinates[0].forEach(coord => coordsArray.push(coord))
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polygon => {
      polygon[0].forEach(coord => coordsArray.push(coord))
    })
  }
}

/**
 * Calculate the centroid of an array of points.
 * @param {Array} points - Objects with `longitude` and `latitude` properties
 * @returns {Array} [lng, lat]
 */
export function calculateCentroid(points) {
  if (!points?.length) return [0, 0]
  let sumLon = 0, sumLat = 0
  points.forEach(p => { sumLon += p.longitude; sumLat += p.latitude })
  return [sumLon / points.length, sumLat / points.length]
}

/**
 * Calculate a bounding box for an array of points.
 * @param {Array} points - Objects with `longitude` and `latitude` properties
 * @returns {{ minLon, maxLon, minLat, maxLat } | null}
 */
export function calculateBounds(points) {
  if (!points?.length) return null
  let minLon = Infinity, maxLon = -Infinity
  let minLat = Infinity, maxLat = -Infinity
  points.forEach(p => {
    minLon = Math.min(minLon, p.longitude)
    maxLon = Math.max(maxLon, p.longitude)
    minLat = Math.min(minLat, p.latitude)
    maxLat = Math.max(maxLat, p.latitude)
  })
  return { minLon, maxLon, minLat, maxLat }
}

/**
 * Convert a bounds object to a Mapbox LngLatBoundsLike array.
 * @param {{ minLon, maxLon, minLat, maxLat }} bounds
 * @returns {Array} [[minLon, minLat], [maxLon, maxLat]]
 */
export function boundsToLngLatBounds(bounds) {
  if (!bounds) return null
  return [[bounds.minLon, bounds.minLat], [bounds.maxLon, bounds.maxLat]]
}

/**
 * Check if a [lng, lat] coordinate is valid (within world bounds).
 * @param {Array} coord - [lng, lat]
 * @returns {boolean}
 */
export function isValidCoord(coord) {
  if (!Array.isArray(coord) || coord.length < 2) return false
  const [lng, lat] = coord
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
}

/**
 * Build a GeoJSON FeatureCollection from an array of point records.
 * @param {Array}    records    - Objects with `longitude`, `latitude`, and any properties
 * @param {Function} [getProps] - (record) => properties object. Defaults to spreading the record.
 * @returns {Object} GeoJSON FeatureCollection
 */
export function toPointFeatureCollection(records, getProps) {
  const features = records
    .filter(r => r.longitude != null && r.latitude != null)
    .map(r => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [r.longitude, r.latitude]
      },
      properties: getProps ? getProps(r) : { ...r }
    }))
  return { type: 'FeatureCollection', features }
}

// ─── Ported from doxa-map-mfe geoUtils.js (Friction fix during research-mfe build) ──
/**
 * Generate a deterministic HSL color from a string (used by language-family
 * legend coloring fallback when no palette entry exists).
 * @param {string} str
 * @returns {string} `hsl(h,60%,50%)`
 */
export function generateColorFromString(str) {
  if (!str) return 'hsl(0, 60%, 50%)'
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 60%, 50%)`
}
