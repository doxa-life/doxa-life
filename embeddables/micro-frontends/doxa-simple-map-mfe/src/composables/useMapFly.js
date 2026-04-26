// useMapFly.js - Map Navigation/Fly Composable
// Handles smooth map navigation with fly animations
// Vue 3 Composition API - ES Module with NPM packages
// 
// QA Reference: Round 1 Q4 - Composable decomposition (lines 246-250)
// Design Flaw Fix: Extracts fly navigation from MapComponent (~100 lines)
//
// REFACTORED: Now uses NPM Vue package instead of vendored libs

// Import Vue functions from NPM package
import { ref, computed } from 'vue';

// Import zoom configuration (region zoom settings are in zoom.js)
import { getRegionZoomConfig, REGION_ZOOM_CONFIG } from '../config/zoom.js';
// Import map configuration for initial view defaults
import { mapConfig } from '../config/mapConfig.js';

/**
 * useMapFly composable - manages smooth map navigation
 * 
 * Extracted from MapComponent.js:
 * - getOffsetCenter() (lines 1030-1058)
 * - slowFlyToFamily() (lines 1060-1085)
 * - slowFlyToRegion() (lines 1087-1115)
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.getMap - Function that returns the map instance
 * @param {string} options.mapId - Unique map identifier for logging
 * @param {Object} options.mapStore - Pinia mapStore for shared state
 * @param {Object} options.regionsGeoData - Regions geo data with polygon features
 * 
 * @returns {Object} Fly navigation functions
 */
export function useMapFly(options = {}) {
    const {
        getMap = () => null,
        mapId = 'unknown',
        mapStore = null,
        regionsGeoData = null
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
     * Reset map to initial view
     */
    function resetView() {
        const map = getMap();
        if (!map) return;
        
        // Use mapConfig.defaults for initial view settings
        const initialCenter = mapConfig.defaults?.center || [34, 9];
        const initialZoom = mapConfig.defaults?.zoom || 3;
        
        map.flyTo({
            center: initialCenter,
            zoom: initialZoom,
            ...FLY_CONFIG
        });
    }
    
    return {
        // Core navigation
        getOffsetCenter,
        slowFlyToFamily,
        slowFlyToRegion,
        flyTo,
        resetView,
        
        // Utilities
        calculateRegionCenterFromPolygon
    };
}

// ES Module export
