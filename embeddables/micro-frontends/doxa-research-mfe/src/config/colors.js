/**
 * Unified Color Configuration
 * Single source of truth for all color constants across the application.
 *
 * Sections:
 *  1. COLOR_MODES — color strategy enum
 *  1B. RESOURCE_COLORS — gospel resources palette
 *  2. DOXA_REGION_COLORS — region palette + alias map
 *  3. AFFINITY_BLOCK_COLORS — Joshua Project ROP1-coded palette
 *  4. LANGUAGE_FAMILY_COLORS — language family palette (40+ entries)
 *  5. Unified getColor() helper
 */

import { generateColorFromString } from '@/utils/geoUtils.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: COLOR MODES
// ═══════════════════════════════════════════════════════════════════════════════

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

/** Resource priority order for pin coloring */
export const RESOURCE_PRIORITY = ['bible', 'jesusFilm', 'radio', 'gospel', 'audio', 'stories'];

/** Resource display names for legend */
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
 * DOXA Region Color Palette — defines colors for the 8 DOXA regions.
 * TODO: domain-specific. Override via colorStrategies if your app uses
 * different region names.
 */
export const DOXA_REGION_COLORS = {
    'Africa': '#e74c3c',
    'Asia': '#3498db',
    'Europe': '#2ecc71',
    'Latin America & Caribbean': '#f39c12',
    'Middle East': '#9b59b6',
    'No WAGF Region/Bloc': '#1a1a2e',
    'North America & Non-Spanish Caribbean': '#1abc9c',
    'Oceania': '#e67e22'
};

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
};

/**
 * Get color for a region — falls back to a deterministic
 * generateColorFromString() so unmapped regions still render.
 */
export function getRegionColor(regionName) {
    if (!regionName) {
        return '#0098FF';
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
 * Based on Joshua Project official classification (ROP1 codes).
 *
 * ARCHITECTURE DECISION:
 * - Use ROP1 codes (A001, A002, etc.) as the PRIMARY KEY
 * - Store mappings from ROP1 → Name and ROP1 → Color
 * - Avoids issues with typos in affinity block names
 */

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
};

/** Primary mapping: ROP1 Code → Color */
export const AFFINITY_BLOCK_COLORS = {
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
};

/** Reverse lookup: Name → ROP1 Code */
export const AFFINITY_BLOCK_NAME_TO_CODE = Object.entries(AFFINITY_BLOCK_NAMES).reduce((acc, [code, name]) => {
    acc[name] = code;
    return acc;
}, {});

/** Legacy: Name-based color lookup */
export const AFFINITY_BLOCK_COLORS_BY_NAME = Object.entries(AFFINITY_BLOCK_NAMES).reduce((acc, [code, name]) => {
    acc[name] = AFFINITY_BLOCK_COLORS[code];
    return acc;
}, {});

export function getAffinityBlockName(code) {
    return AFFINITY_BLOCK_NAMES[code] || 'Unknown';
}

export function getAffinityBlockColorByCode(code) {
    return AFFINITY_BLOCK_COLORS[code] || '#95a5a6';
}

/**
 * Get color for an affinity block (supports both ROP1 code and name).
 */
export function getAffinityBlockColor(blockNameOrCode) {
    if (!blockNameOrCode) return '#95a5a6';

    if (typeof blockNameOrCode === 'string' && /^A\d{3}$/.test(blockNameOrCode)) {
        return AFFINITY_BLOCK_COLORS[blockNameOrCode] || '#95a5a6';
    }

    return AFFINITY_BLOCK_COLORS_BY_NAME[blockNameOrCode] || '#95a5a6';
}

export function getAffinityBlocksArray() {
    return Object.entries(AFFINITY_BLOCK_NAMES).map(([code, name]) => ({
        code,
        name,
        color: AFFINITY_BLOCK_COLORS[code]
    }));
}

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
 * Single source of truth for language family colors.
 */
export const LANGUAGE_FAMILY_COLORS = {
    // ── Top 6 major families ─────────────────────────────────────────────────
    'Indo-European': '#e74c3c',      // RED
    'Dravidian': '#ff9800',          // BRIGHT ORANGE
    'Afro-Asiatic': '#27ae60',       // GREEN
    'Sino-Tibetan': '#3498db',       // BLUE
    'Niger-Congo': '#9b59b6',        // PURPLE
    'Unclassified': '#95a5a6',       // GREY

    // ── Africa ───────────────────────────────────────────────────────────────
    'Nilo-Saharan': '#e91e63',
    'Khoe-Kwadi': '#00bcd4',

    // ── Southeast Asia & Pacific ─────────────────────────────────────────────
    'Austro-Asiatic': '#00bcd4',
    'Kra-Dai': '#8e44ad',
    'Austronesian': '#ff69b4',
    'Hmong-Mien': '#f44336',

    // ── Central Asia & Caucasus ──────────────────────────────────────────────
    'Turkic': '#ffc107',
    'Nakh-Daghestanian': '#009688',
    'Mongolic': '#795548',
    'Uralic': '#607d8b',
    'Tungusic': '#4caf50',

    // ── East Asia ────────────────────────────────────────────────────────────
    'Japonic': '#ff5722',

    // ── Americas ─────────────────────────────────────────────────────────────
    'Cariban': '#673ab7',
    'Tupian': '#03a9f4',
    'Tucanoan': '#8bc34a',
    'Maipurean': '#ffc107',
    'Panoan': '#cddc39',
    'Guajiboan': '#9e9e9e',
    'Chibchan': '#ff7043',
    'Quechuan': '#ab47bc',
    'Jean': '#26a69a',
    'Harákmbut': '#7e57c2',
    'Nambikwara': '#42a5f5',
    'Muran': '#66bb6a',
    'Karajá': '#ffa726',
    'Bororoan': '#ef5350',
    'Arauan': '#5c6bc0',
    'Yanomaman': '#26c6da',
    'Yaguan': '#d4e157',
    'Witotoan': '#78909c',
    'Zamucoan': '#8d6e63',
    'Puinavean': '#aed581',
    'Barbacoan': '#4db6ac',
    'Eyak-Athabaskan': '#7986cb',

    // ── Oceania & other ──────────────────────────────────────────────────────
    'Trans-New Guinea': '#ba68c8',
    'Andamanese': '#4dd0e1',

    // ── Special categories ───────────────────────────────────────────────────
    'Sign Language': '#212121',
    'Creole': '#9575cd',
    'Mixed language': '#a1887f',
    'Language isolate': '#90a4ae',
    // Null/unknown family bucket — case-different upstream values fold to this
    // single canonical key via canonicalFamilyName(). Keep just one entry so
    // the legend's seed loop (LANGUAGE_FAMILY_COLORS keys) doesn't emit
    // multiple zero-count rows for the same bucket.
    'Unknown': '#000000',
};

export function getLanguageFamilyColor(familyName) {
    // Unmapped / null / undefined family → black (per UX 2026-04-27).
    return LANGUAGE_FAMILY_COLORS[familyName] || '#000000';
}

// Case-fold lookup so upstream values that differ only in case
// ("Sign Language" vs "Sign language") collapse onto one canonical key
// (the proper-case spelling stored in LANGUAGE_FAMILY_COLORS).
const _LANG_FAMILY_ALIAS = (() => {
    const norm = (s) => String(s || '').toLowerCase().trim();
    const map = {};
    for (const k of Object.keys(LANGUAGE_FAMILY_COLORS)) map[norm(k)] = k;
    return map;
})();
export function canonicalFamilyName(raw) {
    if (!raw) return 'Unknown';
    const trimmed = String(raw).trim();
    return _LANG_FAMILY_ALIAS[trimmed.toLowerCase()] || trimmed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: UNIFIED COLOR GETTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Unified color getter — get color from any system.
 * @param {string} system - 'region' | 'doxaRegion' | 'affinityBlock' | 'languageFamily'
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

export const affinityBlockCodeToName = AFFINITY_BLOCK_NAMES;
export const affinityBlockCodeToColor = AFFINITY_BLOCK_COLORS;
export const affinityBlockNameToCode = AFFINITY_BLOCK_NAME_TO_CODE;
export const affinityBlockColors = AFFINITY_BLOCK_COLORS_BY_NAME;
export const affinityBlockCodeLookup = AFFINITY_BLOCK_NAMES;
export const languageFamilyColors = LANGUAGE_FAMILY_COLORS;
export const defaultFamilyColor = '#95a5a6';

export default {
    COLOR_MODES,
    DOXA_REGION_COLORS,
    REGION_COLOR_ALIASES,
    getRegionColor,
    AFFINITY_BLOCK_NAMES,
    AFFINITY_BLOCK_COLORS,
    AFFINITY_BLOCK_NAME_TO_CODE,
    AFFINITY_BLOCK_COLORS_BY_NAME,
    getAffinityBlockName,
    getAffinityBlockColor,
    getAffinityBlockColorByCode,
    getAffinityBlocksArray,
    getAffinityBlockData,
    LANGUAGE_FAMILY_COLORS,
    getLanguageFamilyColor,
    getColor,
    affinityBlockCodeToName,
    affinityBlockCodeToColor,
    affinityBlockNameToCode,
    affinityBlockColors,
    languageFamilyColors,
    defaultFamilyColor
};
