/**
 * mapConfig.js — Default map initialization settings
 *
 * These are the defaults applied to every map instance.
 * Suites can override any of these values.
 *
 * Token: NEVER hardcode here.
 * The TK (temporary key) comes from profile-config prop → inject('mapboxToken').
 */

export const mapDefaults = {
  style:      'mapbox://styles/mapbox/light-v11',
  center:     [20, 10],   // [lng, lat] — centered on Africa/Middle East
  zoom:       1.8,
  minZoom:    0.5,
  maxZoom:    18,
  pitch:      20,         // default tilt in degrees (0 = flat, 60 = steep); gives extra vertical space on mobile
  bearing:    0,          // rotation in degrees (0 = north up)
  projection: 'mercator'
}

/**
 * Layer z-order (insert new layers in this order using beforeId)
 * background → raster → fill → line → symbol → popup
 */
export const LAYER_ORDER = [
  'background',
  'raster',
  'country-fill',
  'region-fill',
  'people-group-line',
  'people-group-symbol',
  'cluster-circle',
  'cluster-count',
  'popup'
]
