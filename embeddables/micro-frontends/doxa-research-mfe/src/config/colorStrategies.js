/**
 * Color Strategy Configuration
 * Defines how different maps should color their pins/markers
 * 
 * This modular system allows each map to specify its own color mode:
 * - Language Family Map uses 'languageFamily' mode
 * - Affinity Block Map uses 'affinityBlock' mode
 * - DOXA Regions Map uses 'doxaRegion' mode
 */

import { 
    COLOR_MODES,
    LANGUAGE_FAMILY_COLORS,
    getLanguageFamilyColor,
    AFFINITY_BLOCK_COLORS,
    AFFINITY_BLOCK_NAMES,
    getAffinityBlockColorByCode,
    getAffinityBlockName,
    DOXA_REGION_COLORS,
    RESOURCE_COLORS,
    RESOURCE_PRIORITY
} from './colors.js';
import { PRAYER_COLORS, FULL_PRAYER_THRESHOLD, getPrayerColor } from '@/config/prayerColors.js';

// ── Engagement colors ─────────────────────────────────────────────────────────
export const ENGAGEMENT_COLORS = {
    notEngaged: '#1a1a2e',     // Near-black
    hasEngagement: '#39ff14'   // Neon green — high contrast against the dark not-engaged pins (UX request 2026-04-26)
}

export const ENGAGEMENT_LABELS = {
    notEngaged: 'Unengaged',
    hasEngagement: 'Engaged'
}

// ── Adoption colors ───────────────────────────────────────────────────────────
export const ADOPTION_COLORS = {
    notAdopted: '#1a1a2e',  // Near-black (matches engagement "not" color)
    hasAdoption: '#22c55e'  // Bright green — easier to see on the adoption map (feedback 2026-04-20)
}

export const ADOPTION_LABELS = {
    notAdopted: 'Needs Adoption',
    hasAdopted: 'Has Adoption'
}

/**
 * Color strategy definitions
 * Each strategy defines how to extract color from feature properties
 */
export const colorStrategies = {
    /**
     * Language Family Color Strategy
     * Colors pins based on their language family
     */
    [COLOR_MODES.LANGUAGE_FAMILY]: {
        name: 'Language Family',
        propertyKey: 'languageFamily',
        colors: LANGUAGE_FAMILY_COLORS,
        getColorFunction: getLanguageFamilyColor,
        
        /**
         * Build Mapbox color expression for language families
         */
        buildColorExpression() {
            const colorExpression = ['match', ['get', 'languageFamily']];
            Object.entries(LANGUAGE_FAMILY_COLORS).forEach(([family, color]) => {
                colorExpression.push(family, color);
            });
            colorExpression.push('#95a5a6'); // Default color
            return colorExpression;
        },
        
        /**
         * Get color for a feature
         */
        getColor(properties) {
            return getLanguageFamilyColor(properties.languageFamily || properties._normalized?.languageFamily);
        }
    },
    
    /**
     * Affinity Block Color Strategy
     * Colors pins based on their ROP1 code (A001, A002, etc.)
     * Uses ROP1 code as the primary key for consistency across data sources
     */
    [COLOR_MODES.AFFINITY_BLOCK]: {
        name: 'Affinity Block',
        propertyKey: 'affinityBlock',  // This is the ROP1 code
        colors: AFFINITY_BLOCK_COLORS,
        getColorFunction: getAffinityBlockColorByCode,
        
        /**
         * Build Mapbox color expression for affinity blocks
         * Uses ROP1 code (A001, A002, etc.) as the match key
         */
        buildColorExpression() {
            const colorExpression = ['match', ['get', 'affinityBlock']];
            // Use ROP1 codes as keys
            Object.entries(AFFINITY_BLOCK_COLORS).forEach(([code, color]) => {
                colorExpression.push(code, color);
            });
            colorExpression.push('#95a5a6'); // Default color
            return colorExpression;
        },
        
        /**
         * Get color for a feature
         * Expects affinityBlock property to contain ROP1 code (e.g., "A007")
         */
        getColor(properties) {
            const rop1Code = properties.affinityBlock || properties._raw?.ROP1;
            return getAffinityBlockColorByCode(rop1Code);
        },
        
        /**
         * Get display name for a feature
         * Converts ROP1 code to human-readable name
         */
        getName(properties) {
            const rop1Code = properties.affinityBlock || properties._raw?.ROP1;
            return getAffinityBlockName(rop1Code);
        }
    },
    
    /**
     * DOXA Region Color Strategy
     * Colors pins based on their DOXA region
     */
    [COLOR_MODES.DOXA_REGION]: {
        name: 'DOXA Region',
        propertyKey: 'doxaRegion',
        colors: DOXA_REGION_COLORS,
        
        /**
         * Build Mapbox color expression for DOXA regions
         */
        buildColorExpression() {
            const colorExpression = ['match', ['get', 'doxaRegion']];
            Object.entries(DOXA_REGION_COLORS).forEach(([region, color]) => {
                colorExpression.push(region, color);
            });
            colorExpression.push('#95a5a6'); // Default color
            return colorExpression;
        },
        
        /**
         * Get color for a feature
         */
        getColor(properties) {
            const region = properties.doxaRegion || properties._normalized?.doxaRegion;
            return DOXA_REGION_COLORS[region] || '#95a5a6';
        }
    },
    
    /**
     * Gospel Resources Color Strategy
     * Colors pins based on available gospel resources
     * DEFAULT: Binary coloring - Green (has ANY resource) / Black (no resources)
     * LEGEND COUNTS: Show TOTAL for each resource (can overlap)
     */
    [COLOR_MODES.RESOURCE]: {
        name: 'Gospel Resources',
        propertyKey: 'resourceType',
        colors: RESOURCE_COLORS,
        
        /**
         * Build Mapbox color expression for gospel resources
         * DEFAULT: Binary coloring - Green if has ANY resource, Black if none
         * This shows green/black on initial load before any legend selection
         */
        buildColorExpression() {
            // Binary coloring: Green = has ANY resource, Black = no resources
            return [
                'case',
                // If ANY resource is Available → Green (hasResources)
                ['any',
                    ['==', ['get', 'bible'], 'Available'],
                    ['==', ['get', 'jesusFilm'], 'Available'],
                    ['==', ['get', 'radio'], 'Available'],
                    ['==', ['get', 'gospel'], 'Available'],
                    ['==', ['get', 'audio'], 'Available'],
                    ['==', ['get', 'stories'], 'Available']
                ],
                RESOURCE_COLORS.hasResources,  // Green
                // Default: No resources → Black
                RESOURCE_COLORS.noResources    // Black
            ];
        },
        
        /**
         * Get color for a feature based on resource availability
         * Binary logic: Green if has ANY resource, Black if none
         */
        getColor(properties) {
            // Check if feature has ANY resource
            for (const resourceKey of RESOURCE_PRIORITY) {
                const value = properties[resourceKey] || properties._raw?.[this.getCSVColumn(resourceKey)];
                if (value === 'Available') {
                    return RESOURCE_COLORS.hasResources; // Green
                }
            }
            return RESOURCE_COLORS.noResources; // Black
        },
        
        /**
         * Get CSV column name for a resource key
         */
        getCSVColumn(resourceKey) {
            const mapping = {
                bible: 'Bible',
                jesusFilm: 'Jesus',
                radio: 'Radio',
                gospel: 'Gospel',
                audio: 'Audio',
                stories: 'Stories'
            };
            return mapping[resourceKey];
        },
        
        /**
         * Check if feature has ANY resource (for hasResources)
         */
        hasAnyResource(properties) {
            for (const resourceKey of RESOURCE_PRIORITY) {
                const value = properties[resourceKey] || properties._raw?.[this.getCSVColumn(resourceKey)];
                if (value === 'Available') {
                    return true;
                }
            }
            return false;
        },
        
        /**
         * Get the highest priority resource type for a feature
         * Returns the resource key that determines the pin color
         */
        getResourceType(properties) {
            for (const resourceKey of RESOURCE_PRIORITY) {
                const value = properties[resourceKey] || properties._raw?.[this.getCSVColumn(resourceKey)];
                if (value === 'Available') {
                    return resourceKey;
                }
            }
            return 'noResources';
        }
    },

    /**
     * Prayer Progress Color Strategy
     * Three-tier coloring based on prayer coverage:
     *   RED    = Needs Prayer (0 / null)
     *   ORANGE = Has Prayer   (1 … FULL_PRAYER_THRESHOLD-1)
     *   GREEN  = Full Prayer  (>= FULL_PRAYER_THRESHOLD)
     *
     * buildColorExpression accepts { colorSource } param:
     *   'properties'    — reads from GeoJSON feature properties (initial load)
     *   'feature-state' — reads from Mapbox feature-state (polling updates, per-pin, no re-render)
     */
    [COLOR_MODES.PRAYER_PROGRESS]: {
        name: 'Prayer Progress',
        propertyKey: 'peoplePraying',
        colors: PRAYER_COLORS,
        
        /**
         * Build Mapbox color expression for prayer progress (3-tier).
         * @param {{ colorSource?: 'properties'|'feature-state' }} [options]
         */
        buildColorExpression({ colorSource = 'properties' } = {}) {
            const valueExpr = colorSource === 'feature-state'
                ? ['feature-state', 'peoplePraying']   // polling update path — per-pin, no layer re-render
                : ['get', 'peoplePraying'];             // initial load path — from GeoJSON properties

            return [
                'case',
                // peoplePraying >= FULL_PRAYER_THRESHOLD → Green (full prayer coverage)
                ['>=', valueExpr, FULL_PRAYER_THRESHOLD],
                PRAYER_COLORS.fullPrayer,  // Green (#27ae60)
                // peoplePraying > 0 → Orange (has prayer, partial)
                ['>', valueExpr, 0],
                PRAYER_COLORS.hasPrayer,   // Orange (#f39c12)
                // Default: null / 0 → Red (needs prayer)
                PRAYER_COLORS.noPrayer     // Red (#e74c3c)
            ];
        },
        
        /**
         * Get color for a feature based on prayer coverage
         */
        getColor(properties) {
            return getPrayerColor(properties);
        }
    },

    /**
     * Engagement Color Strategy
     * Binary: Black (not engaged) / Purple (has engagement)
     * Reads `engagementStatus` (boolean) normalized from `people_committed > 0`.
     * Transparent circles — overlap accumulates darker.
     */
    [COLOR_MODES.ENGAGEMENT]: {
        name: 'Engagement Progress',
        propertyKey: 'engagementStatus',
        colors: ENGAGEMENT_COLORS,

        buildColorExpression({ colorSource = 'properties' } = {}) {
            const valueExpr = colorSource === 'feature-state'
                ? ['feature-state', 'engagementStatus']
                : ['get', 'engagementStatus']

            // engagementStatus is a boolean stored as 0/1 or true/false
            return [
                'case',
                ['==', valueExpr, true],  ENGAGEMENT_COLORS.hasEngagement,
                ['==', valueExpr, 1],     ENGAGEMENT_COLORS.hasEngagement,
                ENGAGEMENT_COLORS.notEngaged
            ]
        },

        getColor(properties) {
            const val = properties.engagementStatus ?? properties._raw?.people_committed
            const engaged = val === true || val === 1 || (typeof val === 'number' && val > 0)
                || (typeof val === 'object' && val?.value)
            return engaged ? ENGAGEMENT_COLORS.hasEngagement : ENGAGEMENT_COLORS.notEngaged
        }
    },

    /**
     * Adoption Color Strategy
     * Binary: Black (not adopted) / Teal (has adoption)
     * Reads `adoptionStatus` (boolean) normalized from `adopted_by_churches > 0`.
     * Transparent circles — overlap accumulates darker.
     */
    [COLOR_MODES.ADOPTION]: {
        name: 'Adoption Progress',
        propertyKey: 'adoptionStatus',
        colors: ADOPTION_COLORS,

        buildColorExpression({ colorSource = 'properties' } = {}) {
            const valueExpr = colorSource === 'feature-state'
                ? ['feature-state', 'adoptionStatus']
                : ['get', 'adoptionStatus']

            return [
                'case',
                ['==', valueExpr, true],  ADOPTION_COLORS.hasAdoption,
                ['==', valueExpr, 1],     ADOPTION_COLORS.hasAdoption,
                ADOPTION_COLORS.notAdopted
            ]
        },

        getColor(properties) {
            const val = properties.adoptionStatus ?? properties._raw?.adopted_by_churches
            const adopted = val === true || val === 1 || (typeof val === 'number' && val > 0)
                || (typeof val === 'object' && val?.value)
            return adopted ? ADOPTION_COLORS.hasAdoption : ADOPTION_COLORS.notAdopted
        }
    }
};

/**
 * Get color strategy for a given mode
 * @param {string} mode - Color mode (from COLOR_MODES)
 * @returns {object} Color strategy configuration
 */
export function getColorStrategy(mode) {
    return colorStrategies[mode] || colorStrategies[COLOR_MODES.LANGUAGE_FAMILY];
}

/**
 * Build Mapbox color expression for a given mode
 * @param {string} mode - Color mode (from COLOR_MODES)
 * @param {{ colorSource?: 'properties'|'feature-state' }} [options]
 * @returns {array} Mapbox expression array
 */
export function buildColorExpression(mode, options = {}) {
    const strategy = getColorStrategy(mode);
    return strategy.buildColorExpression(options);
}

/**
 * Get color for a feature based on mode
 * @param {object} properties - Feature properties
 * @param {string} mode - Color mode (from COLOR_MODES)
 * @returns {string} Hex color code
 */
export function getFeatureColor(properties, mode) {
    const strategy = getColorStrategy(mode);
    return strategy.getColor(properties);
}

export default {
    COLOR_MODES,
    colorStrategies,
    getColorStrategy,
    buildColorExpression,
    getFeatureColor
};
