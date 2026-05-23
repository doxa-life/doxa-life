// useMapFly.js - Map Navigation/Fly Composable
// Handles smooth map navigation with fly animations
// Vue 3 Composition API - ES Module with NPM packages

// Import Vue functions from NPM package
import { ref, computed } from 'vue';

// Import zoom configuration (region zoom settings are in zoom.js)
import { getRegionZoomConfig, REGION_ZOOM_CONFIG } from '../config/zoom.js';
// Import map configuration for initial view defaults
import { mapDefaults } from '../config/mapConfig.js';

/**
 * useMapFly composable - manages smooth map navigation
 *
 * Includes:
 * - flyTo(center, options)
 * - flyToCoords({ longitude, latitude }, zoom?)
 * - fitBounds(bounds, padding?)
 * - slowFlyToFamily / slowFlyToRegion (domain-aware helpers used by legend clicks)
 * - getOffsetCenter — shifts map center to account for a UI panel overlay
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.getMap - Function that returns the map instance
 * @param {string} options.mapId - Unique map identifier for logging
 * @param {Object} options.mapStore - Pinia mapStore for shared state
 * @param {Object} options.regionsGeoData - Regions geo data with polygon features
 * @param {Array}  options.defaultCenter - [lng, lat] used by resetView()
 * @param {number} options.defaultZoom   - Zoom for resetView()
 *
 * @returns {Object} Fly navigation functions
 */
export function useMapFly(options = {}) {
    const {
        getMap = () => null,
        mapId = 'unknown',
        mapStore = null,
        regionsGeoData = null,
        defaultCenter = mapDefaults?.center || [20, 10],
        defaultZoom   = mapDefaults?.zoom   || 2
    } = options;

    // Default fly animation configuration
    const FLY_CONFIG = {
        speed: 0.5,          // Slow fly speed
        essential: true,
        curve: 1.2
    };

    /**
     * Calculate center with offset accounting for UI overlays
     * This prevents the map center from being hidden behind sidebars/panels
     *
     * @param {Array} center - [lng, lat] coordinates
     * @param {number} zoom - Target zoom level
     * @param {Object} offsetOptions - Pixel offsets {x, y}
     * @returns {Array} Adjusted [lng, lat] center
     */
    function getOffsetCenter(center, zoom, offsetOptions = { x: 150, y: 0 }) {
        const map = getMap();
        if (!map) return center;

        try {
            // Get canvas dimensions
            const canvas = map.getCanvas();
            const width = canvas.width;
            const height = canvas.height;

            // Project center to pixels
            const projected = map.project(center);

            // Calculate meters per pixel at this zoom
            // Account for device pixel ratio
            const dpr = window.devicePixelRatio || 1;

            // Apply offset (typically shift left to account for right sidebar)
            const offsetX = (offsetOptions.x || 0) * dpr;
            const offsetY = (offsetOptions.y || 0) * dpr;

            // Create offset point
            const offsetPoint = {
                x: projected.x - offsetX,
                y: projected.y - offsetY
            };

            // Unproject back to coordinates
            const newCenter = map.unproject(offsetPoint);

            return [newCenter.lng, newCenter.lat];
        } catch (error) {
            return center;
        }
    }

    /**
     * Slow fly animation to a language family's centroid
     * Uses family data to calculate center and zoom
     *
     * @param {string} familyName - Name of the language family
     * @param {Array} peopleGroups - People groups data (optional, for calculating bounds)
     */
    function slowFlyToFamily(familyName, peopleGroups = []) {
        const map = getMap();
        if (!map) {
            return;
        }

        // Try to get family data from mapStore or calculate from people groups
        let center = null;
        let zoom = 5;

        // Calculate centroid from people groups matching this family
        const familyGroups = peopleGroups.filter(pg => pg.languageFamily === familyName);

        if (familyGroups.length > 0) {
            // Calculate bounding box and center
            let minLng = Infinity, maxLng = -Infinity;
            let minLat = Infinity, maxLat = -Infinity;

            familyGroups.forEach(pg => {
                if (pg.longitude && pg.latitude) {
                    minLng = Math.min(minLng, pg.longitude);
                    maxLng = Math.max(maxLng, pg.longitude);
                    minLat = Math.min(minLat, pg.latitude);
                    maxLat = Math.max(maxLat, pg.latitude);
                }
            });

            if (minLng !== Infinity) {
                center = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];

                // Calculate zoom based on extent
                const lngSpan = maxLng - minLng;
                const latSpan = maxLat - minLat;
                const maxSpan = Math.max(lngSpan, latSpan);

                // Rough zoom calculation
                if (maxSpan > 50) zoom = 2;
                else if (maxSpan > 20) zoom = 3;
                else if (maxSpan > 10) zoom = 4;
                else if (maxSpan > 5) zoom = 5;
                else zoom = 6;
            }
        }

        if (!center) {
            return;
        }

        // Apply offset to account for UI panels
        const offsetCenter = getOffsetCenter(center, zoom);


        map.flyTo({
            center: offsetCenter,
            zoom: zoom,
            ...FLY_CONFIG
        });
    }

    /**
     * Slow fly animation to a region
     * Uses region config or calculates from polygon data
     *
     * @param {string} regionName - Name of the region
     */
    function slowFlyToRegion(regionName) {
        const map = getMap();
        if (!map) {
            return;
        }

        // First check REGION_ZOOM_CONFIG from zoom.js for region zoom settings
        let center = null;
        let zoom = 4;

        const regionConfig = getRegionZoomConfig(regionName);
        if (regionConfig) {
            center = regionConfig.center;
            zoom = regionConfig.zoom || 4;
        } else if (regionsGeoData?.features) {
            // Calculate center from polygon data
            const regionFeature = regionsGeoData.features.find(
                f => f.properties?.region === regionName || f.properties?.name === regionName
            );

            if (regionFeature) {
                center = calculateRegionCenterFromPolygon(regionFeature);
            }
        }

        if (!center) {
            return;
        }

        // Apply offset to account for UI panels
        const offsetCenter = getOffsetCenter(center, zoom);


        map.flyTo({
            center: offsetCenter,
            zoom: zoom,
            ...FLY_CONFIG
        });
    }

    /**
     * Calculate center point from a GeoJSON polygon feature
     *
     * @param {Object} feature - GeoJSON feature
     * @returns {Array|null} [lng, lat] center or null
     */
    function calculateRegionCenterFromPolygon(feature) {
        if (!feature || !feature.geometry) return null;

        const { type, coordinates } = feature.geometry;
        let allCoords = [];

        if (type === 'Polygon') {
            allCoords = coordinates[0] || [];
        } else if (type === 'MultiPolygon') {
            coordinates.forEach(polygon => {
                allCoords = allCoords.concat(polygon[0] || []);
            });
        }

        if (allCoords.length === 0) return null;

        // Calculate centroid
        let sumLng = 0, sumLat = 0;
        allCoords.forEach(coord => {
            sumLng += coord[0];
            sumLat += coord[1];
        });

        return [sumLng / allCoords.length, sumLat / allCoords.length];
    }

    /**
     * Fly to specific coordinates with options
     *
     * @param {Array} center - [lng, lat] coordinates
     * @param {Object} flyOptions - Fly animation options
     */
    function flyTo(center, flyOptions = {}) {
        const map = getMap();
        if (!map) return;

        const options = {
            center,
            ...FLY_CONFIG,
            ...flyOptions
        };

        map.flyTo(options);
    }

    /**
     * Fly to a { longitude, latitude } object (e.g. a people group record).
     * @param {Object} coords   - { longitude, latitude }
     * @param {number} [zoom]   - Target zoom (defaults to current zoom + 2)
     */
    function flyToCoords(coords, zoom) {
        const map = getMap();
        if (!map || coords?.longitude == null || coords?.latitude == null) return;
        const targetZoom = zoom ?? Math.min(map.getZoom() + 2, 8);
        flyTo([coords.longitude, coords.latitude], { zoom: targetZoom });
    }

    /**
     * Fit the map to a LngLatBounds (e.g. to frame a region polygon).
     * @param {mapboxgl.LngLatBounds} bounds
     * @param {Object} [padding]  - { top, right, bottom, left } in px
     */
    function fitBounds(bounds, padding = { top: 40, right: 40, bottom: 40, left: 40 }, options = {}) {
        const map = getMap();
        if (!map || !bounds) return;
        // maxZoom defaults to 4 (continent-scale framing). Caller can override.
        const maxZoom = options.maxZoom ?? 4;
        map.fitBounds(bounds, { padding, maxZoom, ...FLY_CONFIG });
    }

    /**
     * Reset map to initial view
     */
    function resetView() {
        const map = getMap();
        if (!map) return;

        map.flyTo({
            center: defaultCenter,
            zoom: defaultZoom,
            ...FLY_CONFIG
        });
    }

    // Card d1336834 — uniform legend-row camera constants (driver-confirmed)
    const LEGEND_FIT_PADDING_PX = 40;
    const LEGEND_FIT_DURATION_MS = 800;
    const LEGEND_SINGLE_PIN_ZOOM = 8;

    // Why: map.querySourceFeatures(sourceId, {filter}) is viewport-clipped —
    // pins outside the rendered camera are dropped, so legend rows for off-screen
    // regions silently no-op when the user is zoomed in. We evaluate the Mapbox
    // filter expression against the full source data instead, so fitBounds can
    // zoom OUT to a different region or IN to a tight cluster uniformly.
    function _resolveExpr(expr, props) {
        if (!Array.isArray(expr)) return expr;
        const op = expr[0];
        switch (op) {
            case 'get':      return props?.[expr[1]];
            case 'literal':  return expr[1];
            case 'has':      return props != null && expr[1] in props;
            case '!has':     return props == null || !(expr[1] in props);
            case '!':        return !_resolveExpr(expr[1], props);
            case 'coalesce': {
                for (let i = 1; i < expr.length; i++) {
                    const v = _resolveExpr(expr[i], props);
                    if (v != null) return v;
                }
                return null;
            }
            case 'to-number': {
                const v = _resolveExpr(expr[1], props);
                const n = Number(v);
                if (Number.isFinite(n)) return n;
                if (expr.length > 2) {
                    const fb = Number(_resolveExpr(expr[2], props));
                    return Number.isFinite(fb) ? fb : 0;
                }
                return NaN;
            }
            case 'to-string': {
                const v = _resolveExpr(expr[1], props);
                return v == null ? '' : String(v);
            }
            case 'to-boolean': return Boolean(_resolveExpr(expr[1], props));
            default:           return expr;
        }
    }
    function _matchesFilter(filter, props) {
        if (filter === true) return true;
        if (filter === false) return false;
        if (!Array.isArray(filter)) return Boolean(filter);
        const op = filter[0];
        if (op === 'all') {
            for (let i = 1; i < filter.length; i++) {
                if (!_matchesFilter(filter[i], props)) return false;
            }
            return true;
        }
        if (op === 'any') {
            for (let i = 1; i < filter.length; i++) {
                if (_matchesFilter(filter[i], props)) return true;
            }
            return false;
        }
        if (op === '!')   return !_matchesFilter(filter[1], props);
        if (op === 'has') return props != null && filter[1] in props;
        if (op === '!has') return props == null || !(filter[1] in props);

        if (op === '==' || op === '!=' || op === '>' || op === '>=' ||
            op === '<'  || op === '<=') {
            // Legacy form: ['==', 'propName', value] (no ['get', ...])
            const left = (typeof filter[1] === 'string')
                ? props?.[filter[1]]
                : _resolveExpr(filter[1], props);
            const right = _resolveExpr(filter[2], props);
            switch (op) {
                case '==': return left === right || (left == null && right == null);
                case '!=': return !(left === right || (left == null && right == null));
                case '>':  return left >  right;
                case '>=': return left >= right;
                case '<':  return left <  right;
                case '<=': return left <= right;
            }
        }
        if (op === 'in') {
            const v = _resolveExpr(filter[1], props);
            const haystack = _resolveExpr(filter[2], props);
            if (Array.isArray(haystack)) return haystack.includes(v);
            if (typeof haystack === 'string') return haystack.includes(v);
            return false;
        }
        if (op === 'match') {
            const input = _resolveExpr(filter[1], props);
            const lastIdx = filter.length - 1;
            for (let i = 2; i < lastIdx; i += 2) {
                const labelRaw = filter[i];
                const labels = Array.isArray(labelRaw) ? labelRaw : [labelRaw];
                if (labels.includes(input)) return Boolean(_resolveExpr(filter[i + 1], props));
            }
            return Boolean(_resolveExpr(filter[lastIdx], props));
        }
        return false;
    }
    function _readSourceFeatures(map, sourceId) {
        const src = map.getSource(sourceId);
        if (!src) return [];
        const data = src._data ?? src.serialize?.()?.data;
        if (!data) return [];
        if (Array.isArray(data?.features)) return data.features;
        if (data?.type === 'Feature') return [data];
        return [];
    }

    /**
     * zoomToLegendRow — uniform "click a legend row, fit the scope it represents."
     *
     * Reads the full `language-families` source data via map.getSource()._data
     * and evaluates the Mapbox filter expression in JS, bypassing the viewport
     * clip that previously caused off-screen regions to silently no-op. fitBounds
     * is bidirectional — it zooms OUT to a wider region just as readily as it
     * zooms IN to a tight cluster, so Africa-row and North-India-cluster-row
     * feel like the same gesture from any starting camera.
     *
     *   count == 0 → no-op (intentional — never blank-out the map)
     *   count == 1 → flyTo single-pin coords @ LEGEND_SINGLE_PIN_ZOOM
     *   count >= 2 → fitBounds with padding LEGEND_FIT_PADDING_PX
     *
     * @param {Object} row - STL legend node { id, label, filter, ... }
     * @param {Object} [opts]
     * @param {Array}  [opts.matchExpr] - Override Mapbox expression for flat tabs
     *                                    (prayer/engagement/adoption) where row.filter
     *                                    is a placeholder against `_flat_filter`.
     * @param {string} [opts.sourceId='language-families'] - Pin source id to query
     */
    function zoomToLegendRow(row, opts = {}) {
        const map = getMap();
        if (!map || !row) return;

        const sourceId = opts.sourceId ?? 'language-families';
        if (!map.getSource(sourceId)) return;

        const filter = opts.matchExpr ?? row.filter;
        if (!filter) return;

        const allFeatures = _readSourceFeatures(map, sourceId);
        if (!allFeatures.length) return;

        let minLng = Infinity, maxLng = -Infinity;
        let minLat = Infinity, maxLat = -Infinity;
        let pointCount = 0;
        let firstLng = 0, firstLat = 0;
        const seen = new Set();
        for (const f of allFeatures) {
            const props = f?.properties;
            if (!_matchesFilter(filter, props)) continue;
            const id = props?.uniqueId;
            if (id != null) {
                if (seen.has(id)) continue;
                seen.add(id);
            }
            const c = f.geometry?.coordinates;
            if (!Array.isArray(c) || c.length < 2) continue;
            const lng = c[0], lat = c[1];
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
            if (pointCount === 0) { firstLng = lng; firstLat = lat; }
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            pointCount++;
        }
        if (pointCount === 0) return;

        if (pointCount === 1) {
            map.flyTo({
                center: [firstLng, firstLat],
                zoom: LEGEND_SINGLE_PIN_ZOOM,
                duration: LEGEND_FIT_DURATION_MS,
                essential: true
            });
            return;
        }

        try {
            map.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
                padding: LEGEND_FIT_PADDING_PX,
                duration: LEGEND_FIT_DURATION_MS,
                essential: true
            });
        } catch (_) { /* fitBounds throws on degenerate bounds */ }
    }

    return {
        // Core navigation
        getOffsetCenter,
        slowFlyToFamily,
        slowFlyToRegion,
        flyTo,
        flyToCoords,
        fitBounds,
        resetView,
        zoomToLegendRow,

        // Utilities
        calculateRegionCenterFromPolygon
    };
}

// ES Module export
