/**
 * Unified Color Configuration
 * Single source of truth for all color constants across the application
 * 
 * Consolidates:
 * - colorModes.js (14 lines)
 * - doxaRegionColors.js (64 lines)
 * - affinityBlockColors.js (153 lines)
 * - languageFamilyColors.js (93 lines)
 * 
 * Total: 324 lines → Centralized configuration
 */

import { generateColorFromString } from '../utils/geoUtils.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: COLOR MODES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Color Mode Constants
 * Defines available color strategies for map visualizations
 */
export const COLOR_MODES = {
    LANGUAGE_FAMILY: 'languageFamily',
    AFFINITY_BLOCK: 'affinityBlock',
    DOXA_REGION: 'doxaRegion',
    RESOURCE: 'resource',
    STATUS: 'status',
    CUSTOM: 'custom',
    PRAYER_PROGRESS: 'prayerProgress',
    ENGAGEMENT: 'engagement',
    ADOPTION: 'adoption'
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1B: GOSPEL RESOURCES COLORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gospel Resources Colors
 * Used for Tab 4: Gospel Resources visualization
 * DEFAULT: Binary coloring - Green (has ANY resource) / Black (no resources)
 * LEGEND: Show TOTAL count for each resource (INCLUSIVE, can overlap)
 */
export const RESOURCE_COLORS = {
    bible: '#3498db',        // Blue - Bible available
    jesusFilm: '#20c997',    // Fisher Green (teal-green) - Jesus Film available
    radio: '#9b59b6',        // Purple - Radio broadcast available
    gospel: '#f39c12',       // Orange - Gospel recordings available
    audio: '#1abc9c',        // Teal - Audio resources available
    stories: '#e74c3c',      // Red - Stories available
    hasResources: '#27ae60', // Green - Has ANY gospel resource (default pin color)
    noResources: '#2c3e50'   // Dark/Black - No gospel resources
};

/**
 * Resource priority order for pin coloring
 * Higher priority resources determine pin color when multiple are available
 */
export const RESOURCE_PRIORITY = ['bible', 'jesusFilm', 'radio', 'gospel', 'audio', 'stories'];

/**
 * Resource display names for legend
 */
export const RESOURCE_NAMES = {
    bible: 'Bible',
    jesusFilm: 'Jesus Film',
    radio: 'Radio',
    gospel: 'Gospel',
    audio: 'Audio',
    stories: 'Stories',
    hasResources: 'Has Resources',
    noResources: 'No Resources'
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: DOXA REGION COLORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DOXA Region Color Palette
 * Defines color palette for the 8 DOXA regions
 * Single source of truth for region colors
 */
export const DOXA_REGION_COLORS = {
    'Africa': '#e74c3c',
    'Asia': '#3498db',
    'Europe': '#2ecc71',
    'Latin America & Caribbean': '#f39c12',
    'Middle East': '#9b59b6',
    'No WAGF Region/Bloc': '#95a5a6',
    'North America & Non-Spanish Caribbean': '#1abc9c',
    'Oceania': '#e67e22'
};

/**
 * Extended region aliases for flexible matching
 */
export const REGION_COLOR_ALIASES = {
    'Africa': '#e74c3c',        // Red (confirmed working)
    'East Asia': '#3498db',     // Blue (was black - fixed)
    'Asia': '#3498db',          // Also handle just "Asia"
    'Eurasia': '#2ecc71',       // Green (will be fisher green when darkened)
    'Europe': '#2ecc71',        // Also handle just "Europe"
    'Latin America': '#f39c12', // Orange (will be mandarin when darkened)
    'Latin America & Caribbean': '#f39c12', // Handle full name
    'Caribbean': '#f39c12',     // Also handle just "Caribbean"
    'Middle East': '#9b59b6',   // Purple (confirmed working)
    'North America': '#1abc9c', // Teal (was black - fixed)
    'North America (non-spanish)': '#1abc9c', // Handle specific variant
    'North America & Non-Spanish Caribbean': '#1abc9c',
    'Pacific': '#e67e22',       // Orange (Oceania region)
    'Oceania': '#e67e22',       // Orange - matches DOXA_REGION_COLORS
    'South Asia': '#e67e22',    // Dark orange
    'No WAGF Region/Bloc': '#95a5a6',
    'Unknown': '#0098FF'        // Bright VS Code blue
};

/**
 * Get color for a DOXA region - these MUST match the actual polygon colors on the map
 * @param {string} regionName - The region name to look up
 * @returns {string} Hex color string
 */
export function getRegionColor(regionName) {
    // Handle null/undefined
    if (!regionName) {
        return '#0098FF'; // Default bright blue
    }
    
    const color = REGION_COLOR_ALIASES[regionName];
    if (!color) {
        return generateColorFromString(regionName);
    }
    
    return color;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: AFFINITY BLOCK COLORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Affinity Block Color Palette
 * Based on Joshua Project official classification
 * Source: https://joshuaproject.net/global/affblocs
 * 
 * ARCHITECTURE DECISION:
 * - Use ROP1 codes (A001, A002, etc.) as the PRIMARY KEY
 * - Store mappings from ROP1 → Name and ROP1 → Color
 * - This ensures consistency across CSV, API, and other data sources
 * - Avoids issues with typos in affinity block names
 * 
 * Special consideration: Deaf peoples use black (#000000) for high visibility.
 */

/**
 * Primary mapping: ROP1 Code → Affinity Block Name
 * This is the SINGLE SOURCE OF TRUTH for affinity block names
 */
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
};

/**
 * Primary mapping: ROP1 Code → Color
 * Colors are designed to be visually distinct and accessible
 */
export const AFFINITY_BLOCK_COLORS = {
    'A001': '#E74C3C',  // Arab World - Red/Orange (Middle East)
    'A002': '#3498DB',  // East Asian Peoples - Blue (Pacific)
    'A003': '#2ECC71',  // Eurasian Peoples - Green (diverse landscapes)
    'A004': '#F39C12',  // Horn of Africa Peoples - Orange (African sun)
    'A005': '#9B59B6',  // Jewish - Purple (royalty, heritage)
    'A006': '#1ABC9C',  // Malay Peoples - Teal (island nations)
    'A007': '#E67E22',  // Persian-Median Peoples - Dark orange (ancient civilizations)
    'A008': '#34495E',  // South Asian Peoples - Dark blue-grey (vast populations)
    'A009': '#95A5A6',  // North American Peoples - Grey (mostly reached)
    'A010': '#5DADE2',  // Pacific Islanders - Light blue (ocean)
    'A011': '#16A085',  // Southeast Asian Peoples - Sea green (tropical)
    'A012': '#C0392B',  // Sub-Saharan Peoples - Deep red (rich heritage)
    'A013': '#8E44AD',  // Tibetan-Himalayan Peoples - Purple (mountains)
    'A014': '#D35400',  // Turkic Peoples - Burnt orange (steppes)
    'A015': '#27AE60',  // Latin-Caribbean Americans - Forest green (Americas)
    'A017': '#000000'   // Deaf - Black (universal accessibility)
};

/**
 * Reverse lookup: Name → ROP1 Code
 * Useful for matching CSV data that uses names instead of codes
 */
export const AFFINITY_BLOCK_NAME_TO_CODE = Object.entries(AFFINITY_BLOCK_NAMES).reduce((acc, [code, name]) => {
    acc[name] = code;
    return acc;
}, {});

/**
 * Legacy: Name-based color lookup (for backward compatibility)
 * DEPRECATED: Prefer using ROP1 codes with AFFINITY_BLOCK_COLORS
 */
export const AFFINITY_BLOCK_COLORS_BY_NAME = Object.entries(AFFINITY_BLOCK_NAMES).reduce((acc, [code, name]) => {
    acc[name] = AFFINITY_BLOCK_COLORS[code];
    return acc;
}, {});

/**
 * Get affinity block name from ROP1 code
 * @param {string} code - ROP1 code (e.g., "A001")
 * @returns {string} Affinity block name or "Unknown"
 */
export function getAffinityBlockName(code) {
    return AFFINITY_BLOCK_NAMES[code] || 'Unknown';
}

/**
 * Get color for an affinity block by ROP1 code
 * @param {string} code - ROP1 code (e.g., "A001")
 * @returns {string} Hex color code
 */
export function getAffinityBlockColorByCode(code) {
    return AFFINITY_BLOCK_COLORS[code] || '#95a5a6';
}

/**
 * Get color for an affinity block (supports both code and name)
 * @param {string} blockNameOrCode - Affinity block name or ROP1 code
 * @returns {string} Hex color code
 */
export function getAffinityBlockColor(blockNameOrCode) {
    if (!blockNameOrCode) return '#95a5a6';
    
    // If it's a ROP1 code (starts with 'A' and has numbers)
    if (typeof blockNameOrCode === 'string' && /^A\d{3}$/.test(blockNameOrCode)) {
        return AFFINITY_BLOCK_COLORS[blockNameOrCode] || '#95a5a6';
    }
    
    // Otherwise treat as name
    return AFFINITY_BLOCK_COLORS_BY_NAME[blockNameOrCode] || '#95a5a6';
}

/**
 * Get all affinity blocks as array for legends
 * @returns {Array} Array of {code, name, color} objects
 */
export function getAffinityBlocksArray() {
    return Object.entries(AFFINITY_BLOCK_NAMES).map(([code, name]) => ({
        code,
        name,
        color: AFFINITY_BLOCK_COLORS[code]
    }));
}

/**
 * Get affinity block data by ROP1 code
 * @param {string} code - ROP1 code (e.g., "A001")
 * @returns {object} {code, name, color}
 */
export function getAffinityBlockData(code) {
    return {
        code,
        name: AFFINITY_BLOCK_NAMES[code] || 'Unknown',
        color: AFFINITY_BLOCK_COLORS[code] || '#95a5a6'
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: LANGUAGE FAMILY COLORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Language Family Color Palette
 * Single source of truth for language family colors
 * Both MapComponent and LegendComponent should import from this file
 */
export const LANGUAGE_FAMILY_COLORS = {
    // ═══════════════════════════════════════════════════════════════
    // TOP 6 MAJOR FAMILIES - Most visible, distinct primary colors
    // ═══════════════════════════════════════════════════════════════
    'Indo-European': '#e74c3c',      // RED - Europe/South Asia
    'Dravidian': '#ff9800',          // BRIGHT ORANGE - South India
    'Afro-Asiatic': '#27ae60',       // GREEN - North Africa/Middle East/Horn
    'Sino-Tibetan': '#3498db',       // BLUE - East Asia/Tibet
    'Niger-Congo': '#9b59b6',        // PURPLE - Sub-Saharan Africa
    'Unclassified': '#95a5a6',       // GREY
    
    // ═══════════════════════════════════════════════════════════════
    // AFRICA - Colors that work between green and purple neighbors
    // ═══════════════════════════════════════════════════════════════
    'Nilo-Saharan': '#e91e63',       // MAGENTA/PINK - stands out between green & purple
    'Khoe-Kwadi': '#00bcd4',         // CYAN - Southern Africa
    
    // ═══════════════════════════════════════════════════════════════
    // SOUTHEAST ASIA & PACIFIC
    // ═══════════════════════════════════════════════════════════════
    'Austro-Asiatic': '#00bcd4',     // CYAN - SE Asia mainland
    'Kra-Dai': '#8e44ad',            // DEEP PURPLE - Thailand/Laos
    'Austronesian': '#ff69b4',       // PINK - SE Asia islands/Pacific
    'Hmong-Mien': '#f44336',         // BRIGHT RED - South China/SE Asia
    
    // ═══════════════════════════════════════════════════════════════
    // CENTRAL ASIA & CAUCASUS
    // ═══════════════════════════════════════════════════════════════
    'Turkic': '#ffc107',             // AMBER/YELLOW - Central Asia
    'Nakh-Daghestanian': '#009688',  // TEAL - Caucasus
    'Mongolic': '#795548',           // BROWN - Mongolia
    'Uralic': '#607d8b',             // BLUE GREY - Northern Europe/Russia
    'Tungusic': '#4caf50',           // LIGHT GREEN - Siberia
    
    // ═══════════════════════════════════════════════════════════════
    // EAST ASIA
    // ═══════════════════════════════════════════════════════════════
    'Japonic': '#ff5722',            // DEEP ORANGE - Japan
    
    // ═══════════════════════════════════════════════════════════════
    // AMERICAS - Many small families, varied colors
    // ═══════════════════════════════════════════════════════════════
    'Cariban': '#673ab7',            // DEEP PURPLE - Amazon
    'Tupian': '#03a9f4',             // LIGHT BLUE - Brazil
    'Tucanoan': '#8bc34a',           // LIGHT GREEN - Colombia/Brazil
    'Maipurean': '#ffc107',          // YELLOW - Amazon
    'Panoan': '#cddc39',             // LIME - Peru/Brazil
    'Guajiboan': '#9e9e9e',          // GREY - Venezuela/Colombia
    'Chibchan': '#ff7043',           // DEEP ORANGE - Central America
    'Quechuan': '#ab47bc',           // PURPLE - Andes
    'Jean': '#26a69a',               // TEAL - Brazil
    'Harákmbut': '#7e57c2',          // DEEP PURPLE - Peru
    'Nambikwara': '#42a5f5',         // BLUE - Brazil
    'Muran': '#66bb6a',              // GREEN - Brazil
    'Karajá': '#ffa726',             // ORANGE - Brazil
    'Bororoan': '#ef5350',           // RED - Brazil
    'Arauan': '#5c6bc0',             // INDIGO - Amazon
    'Yanomaman': '#26c6da',          // CYAN - Venezuela/Brazil
    'Yaguan': '#d4e157',             // LIME YELLOW - Peru
    'Witotoan': '#78909c',           // BLUE GREY - Colombia
    'Zamucoan': '#8d6e63',           // BROWN - Paraguay
    'Puinavean': '#aed581',          // LIGHT GREEN - Colombia
    'Barbacoan': '#4db6ac',          // TEAL - Ecuador
    'Eyak-Athabaskan': '#7986cb',    // INDIGO - North America
    
    // ═══════════════════════════════════════════════════════════════
    // OCEANIA & OTHER
    // ═══════════════════════════════════════════════════════════════
    'Trans-New Guinea': '#ba68c8',   // LIGHT PURPLE - Papua
    'Andamanese': '#4dd0e1',         // LIGHT CYAN - Andaman Islands
    
    // ═══════════════════════════════════════════════════════════════
    // SPECIAL CATEGORIES
    // ═══════════════════════════════════════════════════════════════
    'Sign Language': '#212121',      // DARK GREY (not pure black for visibility)
    'Sign language': '#212121',      // Alternate case
    'Creole': '#9575cd',             // LIGHT PURPLE
    'Mixed language': '#a1887f',     // LIGHT BROWN
    'Language isolate': '#90a4ae',   // LIGHT BLUE GREY
    'Unknown': '#0098FF',            // BRIGHT VS CODE BLUE - highly visible for missing data
};

/**
 * Get color for a language family with fallback
 * @param {string} familyName - The language family name
 * @returns {string} Hex color code
 */
export function getLanguageFamilyColor(familyName) {
    return LANGUAGE_FAMILY_COLORS[familyName] || '#95a5a6';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: UNIFIED COLOR GETTER (Optional - for future use)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Unified color getter - get color from any system
 * @param {string} system - Color system: 'region', 'affinityBlock', 'languageFamily'
 * @param {string} key - The key to look up (region name, ROP1 code, family name)
 * @returns {string} Hex color code
 */
export function getColor(system, key) {
    switch (system) {
        case 'region':
        case 'doxaRegion':
            return getRegionColor(key);
        
        case 'affinityBlock':
            return getAffinityBlockColor(key);
        
        case 'languageFamily':
            return getLanguageFamilyColor(key);
        
        default:
            return '#95a5a6';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKWARD COMPATIBILITY EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Legacy exports for backward compatibility with existing imports
export const affinityBlockCodeToName = AFFINITY_BLOCK_NAMES;
export const affinityBlockCodeToColor = AFFINITY_BLOCK_COLORS;
export const affinityBlockNameToCode = AFFINITY_BLOCK_NAME_TO_CODE;
export const affinityBlockColors = AFFINITY_BLOCK_COLORS_BY_NAME;
export const affinityBlockCodeLookup = AFFINITY_BLOCK_NAMES;
export const languageFamilyColors = LANGUAGE_FAMILY_COLORS;
export const defaultFamilyColor = '#95a5a6';

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
    // Color Modes
    COLOR_MODES,
    
    // DOXA Regions
    DOXA_REGION_COLORS,
    REGION_COLOR_ALIASES,
    getRegionColor,
    
    // Affinity Blocks
    AFFINITY_BLOCK_NAMES,
    AFFINITY_BLOCK_COLORS,
    AFFINITY_BLOCK_NAME_TO_CODE,
    AFFINITY_BLOCK_COLORS_BY_NAME,
    getAffinityBlockName,
    getAffinityBlockColor,
    getAffinityBlockColorByCode,
    getAffinityBlocksArray,
    getAffinityBlockData,
    
    // Language Families
    LANGUAGE_FAMILY_COLORS,
    getLanguageFamilyColor,
    
    // Unified
    getColor,
    
    // Legacy
    affinityBlockCodeToName,
    affinityBlockCodeToColor,
    affinityBlockNameToCode,
    affinityBlockColors,
    languageFamilyColors,
    defaultFamilyColor
};
