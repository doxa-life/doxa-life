/**
 * geoUtils.js
 * 
 * Geometry and coordinate utility functions extracted from MapComponent.
 * Part of Phase 5: Component Decomposition
 * Reference: Flaw #1/#19 in qa-wholistic-design-boilerplate.md
 */

/**
 * Extract all coordinates from a GeoJSON geometry
 * @param {Object} geometry - GeoJSON geometry object (Polygon or MultiPolygon)
 * @param {Array} coordsArray - Array to push coordinates into
 */
export function extractCoordinates(geometry, coordsArray) {
    if (!geometry || !coordsArray) return;
    
    if (geometry.type === 'Polygon') {
        geometry.coordinates[0].forEach(coord => coordsArray.push(coord));
    } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach(polygon => {
            polygon[0].forEach(coord => coordsArray.push(coord));
        });
    }
}

/**
 * Calculate the centroid of a set of points
 * @param {Array} points - Array of objects with longitude and latitude properties
 * @returns {Array} [longitude, latitude] of centroid
 */
export function calculateCentroid(points) {
    if (!points || points.length === 0) return [0, 0];
    
    let sumLon = 0, sumLat = 0;
    points.forEach(p => {
        sumLon += p.longitude;
        sumLat += p.latitude;
    });
    
    return [sumLon / points.length, sumLat / points.length];
}

/**
 * Calculate bounding box for a set of points
 * @param {Array} points - Array of objects with longitude and latitude properties
 * @returns {Object|null} Bounds object { minLon, maxLon, minLat, maxLat } or null if empty
 */
export function calculateBounds(points) {
    if (!points || points.length === 0) return null;
    
    let minLon = Infinity, maxLon = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    points.forEach(p => {
        minLon = Math.min(minLon, p.longitude);
        maxLon = Math.max(maxLon, p.longitude);
        minLat = Math.min(minLat, p.latitude);
        maxLat = Math.max(maxLat, p.latitude);
    });
    
    return { minLon, maxLon, minLat, maxLat };
}

/**
 * Calculate appropriate zoom level for given bounds
 * More conservative - zooms out more to show all points
 * @param {Object} bounds - Bounds object from calculateBounds
 * @returns {number} Zoom level (1-5)
 */
export function calculateZoomForBounds(bounds) {
    if (!bounds) return 3;
    
    const lonSpread = bounds.maxLon - bounds.minLon;
    const latSpread = bounds.maxLat - bounds.minLat;
    const maxSpread = Math.max(lonSpread, latSpread);
    
    if (maxSpread > 120) return 1;
    if (maxSpread > 80) return 1.5;
    if (maxSpread > 50) return 2;
    if (maxSpread > 30) return 2.5;
    if (maxSpread > 20) return 3;
    if (maxSpread > 10) return 3.5;
    if (maxSpread > 5) return 4;
    return 4.5;
}

/**
 * Generate a consistent color from a string (hash-based)
 * @param {string} str - String to generate color from
 * @returns {string} HSL color string
 */
export function generateColorFromString(str) {
    if (!str) return 'hsl(0, 60%, 50%)';
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 60%, 50%)`;
}

/**
 * Darken a hex color by a percentage
 * Includes hardcoded overrides for specific region colors
 * @param {string} color - Hex color (e.g., '#e74c3c')
 * @param {number} percent - Percentage to darken (0-100), default 15%
 * @returns {string} Darkened hex color
 */
export function darkenColor(color, percent = 15) {
    // Validate input
    if (!color || typeof color !== 'string') {
        console.error('darkenColor: Invalid color input:', color);
        return '#000000'; // Return black as fallback
    }
    
    // HARDCODED custom colors for each region based on their actual polygon colors
    // This ensures the line colors match the region but are darker and visible
    
    // East Asia (currently showing BLUE on map) → Dark Blue
    if (color === '#3498db') {  // Blue
        return '#2171b5'; // Dark blue, clearly visible
    }
    
    // Africa (RED on map) → Dark Red  
    if (color === '#e74c3c') {  // Red
        return '#c0392b'; // Dark red, clearly visible
    }
    
    // Latin America (ORANGE on map) → Darker mandarin/reddish-orange
    if (color === '#f39c12') {  // Orange
        return '#ca6f1e'; // Darker reddish-orange/mandarin, NOT black
    }
    
    // Eurasia/Europe (GREEN on map) → Fisher green / darker green
    if (color === '#2ecc71') {  // Green
        return '#229954'; // Fisher green / darker green, NOT black
    }
    
    // North America (TEAL/CYAN on map) → Darker teal
    if (color === '#1abc9c') {  // Teal
        return '#138d75'; // Darker teal, clearly teal not black
    }
    
    // Middle East (PURPLE on map) → Dark purple (already working)
    if (color === '#9b59b6') {  // Purple
        return '#7d3c98'; // Dark purple
    }
    
    // For any other colors, use the percentage method
    const hex = color.replace('#', '');
    
    // Validate hex string
    if (hex.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(hex)) {
        console.error('darkenColor: Invalid hex color:', color);
        return '#000000'; // Return black as fallback
    }
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Double-check for NaN
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        console.error('darkenColor: Failed to parse RGB from:', color);
        return '#000000';
    }
    
    const factor = (100 - percent) / 100;
    const newR = Math.max(0, Math.floor(r * factor));
    const newG = Math.max(0, Math.floor(g * factor));
    const newB = Math.max(0, Math.floor(b * factor));
    
    const toHex = (n) => {
        const hexVal = n.toString(16);
        return hexVal.length === 1 ? '0' + hexVal : hexVal;
    };
    
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

// ============================================
// VALIDATION HELPERS (Flaw #35)
// ============================================

/**
 * Validate a coordinate pair
 * @param {number} lon - Longitude (-180 to 180)
 * @param {number} lat - Latitude (-90 to 90)
 * @returns {boolean} True if valid
 */
export function isValidCoordinate(lon, lat) {
    return (
        typeof lon === 'number' && !isNaN(lon) && lon >= -180 && lon <= 180 &&
        typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90
    );
}

/**
 * Validate a GeoJSON feature
 * @param {Object} feature - GeoJSON feature to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateGeoJSONFeature(feature) {
    const errors = [];
    
    if (!feature) {
        return { valid: false, errors: ['Feature is null or undefined'] };
    }
    
    if (feature.type !== 'Feature') {
        errors.push(`Invalid type: ${feature.type}, expected 'Feature'`);
    }
    
    if (!feature.geometry) {
        errors.push('Missing geometry');
    } else {
        const validTypes = ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon'];
        if (!validTypes.includes(feature.geometry.type)) {
            errors.push(`Invalid geometry type: ${feature.geometry.type}`);
        }
        if (!feature.geometry.coordinates) {
            errors.push('Missing coordinates');
        }
    }
    
    return { valid: errors.length === 0, errors };
}

/**
 * Validate a people group data object has required fields
 * @param {Object} pg - People group object
 * @param {string[]} requiredFields - Fields to check for
 * @returns {Object} { valid: boolean, missing: string[] }
 */
export function validatePeopleGroup(pg, requiredFields = ['id', 'name', 'latitude', 'longitude']) {
    if (!pg) {
        return { valid: false, missing: ['entire object'] };
    }
    
    const missing = requiredFields.filter(field => {
        const value = pg[field] ?? pg._normalized?.[field];
        return value === undefined || value === null || value === '';
    });
    
    return { valid: missing.length === 0, missing };
}

/**
 * Validate zoom level is within acceptable range
 * @param {number} zoom - Zoom level to validate
 * @param {number} min - Minimum zoom (default 0)
 * @param {number} max - Maximum zoom (default 22 for Mapbox)
 * @returns {number} Clamped zoom value
 */
export function clampZoom(zoom, min = 0, max = 22) {
    if (typeof zoom !== 'number' || isNaN(zoom)) return min;
    return Math.max(min, Math.min(max, zoom));
}

/**
 * Validate hex color format
 * @param {string} color - Color string to validate
 * @returns {boolean} True if valid hex color (#RGB or #RRGGBB)
 */
export function isValidHexColor(color) {
    if (typeof color !== 'string') return false;
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

// Export all functions as default object for backward compatibility
export default {
    extractCoordinates,
    calculateCentroid,
    calculateBounds,
    calculateZoomForBounds,
    generateColorFromString,
    darkenColor,
    // Validation helpers
    isValidCoordinate,
    validateGeoJSONFeature,
    validatePeopleGroup,
    clampZoom,
    isValidHexColor
};