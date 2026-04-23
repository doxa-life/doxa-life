// useMapSelection.js - Map Selection Composable
// Handles region/family selection and visibility updates
// Vue 3 Composition API - ES Module with NPM packages

// Import Vue functions from NPM package
import { ref, computed } from 'vue';

// Import zoom utilities
import { getCircleRadiusInterpolation } from '../config/zoom.js';

/**
 * useMapSelection composable - manages map selection state and visibility
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.getMap - Function that returns the map instance
 * @param {string} options.mapId - Unique map identifier for logging
 * @param {Object} options.mapStore - Pinia mapStore for shared state
 * @param {Function} options.addFamilyConnectionLines - Function to add connection lines
 * @param {Function} options.removeFamilyConnectionLines - Function to remove connection lines
 *
 * @returns {Object} Selection management functions and state
 */
export function useMapSelection(options = {}) {
    const {
        getMap = () => null,
        mapId = 'unknown',
        mapStore = null,
        addFamilyConnectionLines = () => {},
        removeFamilyConnectionLines = () => {}
    } = options;

    // Local state for color scheme
    const colorScheme = ref('doxa-regions');

    // Computed from mapStore if available
    const selectedRegion = computed(() => mapStore?.selectedRegion || null);
    const selectedFamily = computed(() => mapStore?.selectedFamily || null);

    /**
     * Update region layer visibility based on selection
     * Highlights selected region, fades others
     */
    function updateRegionVisibility() {
        const map = getMap();
        if (!map || !map.getLayer('regions-fill')) {
            return;
        }

        const region = selectedRegion.value;

        if (region) {
            // Highlight selected region, fade others
            map.setPaintProperty('regions-fill', 'fill-opacity', [
                'case',
                ['==', ['get', 'region'], region],
                0.6,
                0.15
            ]);
        } else {
            // Show all at normal opacity
            const opacity = colorScheme.value === 'none' ? 0.2 : 0.5;
            map.setPaintProperty('regions-fill', 'fill-opacity', opacity);
        }
    }

    /**
     * Update pin opacity based on region selection
     * Dims pins outside selected region
     */
    function updatePinOpacityByRegion() {
        const map = getMap();
        if (!map || !map.getLayer('language-family-pins')) {
            return;
        }

        const region = selectedRegion.value;

        // If no region selected, show all pins at normal opacity
        if (!region) {
            map.setPaintProperty('language-family-pins', 'circle-opacity', 0.9);
            return;
        }

        // Dim pins based on PHYSICAL region location (not cluster membership)
        map.setPaintProperty('language-family-pins', 'circle-opacity', [
            'case',
            ['==', ['get', 'doxaRegion'], region],
            0.9,  // In selected region: bright
            0.2   // Outside selected region: dimmed
        ]);

    }

    /**
     * Update language family layer visibility based on selection
     * Highlights selected family, fades others
     *
     * @param {Array} peopleGroups - People groups data (for connection lines)
     */
    function updateLanguageFamilyVisibility(peopleGroups = []) {
        const map = getMap();
        if (!map || !map.getLayer('language-family-pins')) {
            return;
        }

        const family = selectedFamily.value;

        if (family) {
            // Highlight selected family, fade others
            map.setPaintProperty('language-family-pins', 'circle-opacity', [
                'case',
                ['==', ['get', 'languageFamily'], family],
                1,
                0.15
            ]);

            // Keep standard radius (no size change on selection)
            // NOTE: Cannot use zoom expressions inside case statements in Mapbox

            // Add connecting lines for selected family (tapestry effect)
            addFamilyConnectionLines(family, peopleGroups);

        } else {
            // Show all at normal opacity and size
            map.setPaintProperty('language-family-pins', 'circle-opacity', 0.9);
            map.setPaintProperty('language-family-pins', 'circle-radius',
                getCircleRadiusInterpolation('standard')
            );

            // Remove connection lines
            removeFamilyConnectionLines();

        }
    }

    /**
     * Set the color scheme for region display
     */
    function setColorScheme(scheme) {
        colorScheme.value = scheme;
    }

    /**
     * Clear all selections via mapStore
     */
    function clearSelections() {
        if (mapStore) {
            mapStore.selectRegion(null);
            mapStore.selectFamily(null);
        }
    }

    return {
        // State
        selectedRegion,
        selectedFamily,
        colorScheme,

        // Visibility updates
        updateRegionVisibility,
        updatePinOpacityByRegion,
        updateLanguageFamilyVisibility,

        // Configuration
        setColorScheme,
        clearSelections
    };
}

// ES Module export
