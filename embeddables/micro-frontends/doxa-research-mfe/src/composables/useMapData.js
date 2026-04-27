// useMapData.js - Map Data Loading Composable
// Handles DataSourceManager integration, data loading, and normalization
// Vue 3 Composition API - ES Module with NPM packages

// Import Vue functions from NPM package
import { ref, computed } from 'vue';
// Static lookup: language label (e.g. "Telugu") → language family ("Dravidian").
// Used to derive `languageFamily` for pray-tools rows where the upstream returns
// null for `imb_language_family` (true for ALL rows as of 2026-04-25).
import langFamilyByLanguage from '../data/langFamilyByLanguage.json';
import { DOXA_REGION_COLORS, canonicalFamilyName } from '../config/colors.js';

// Normalize pray-tools wagf_region values ("asia", "latin_america_&_caribbean",
// "na") onto canonical DOXA_REGION_COLORS keys so pin GeoJSON properties match
// the legend's row keys for dim-filter expressions.
const _REGION_KEY_ALIASES = (() => {
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    const map = {};
    for (const k of Object.keys(DOXA_REGION_COLORS)) map[norm(k)] = k;
    map['na'] = 'No WAGF Region/Bloc';
    return map;
})();
function canonicalizeRegion(raw) {
    if (!raw) return '';
    if (typeof raw === 'object') raw = raw.label || raw.value || '';
    const normalized = String(raw).toLowerCase().replace(/[^a-z0-9]+/g, '');
    return _REGION_KEY_ALIASES[normalized] || String(raw).trim();
}

function unwrapLabel(v) {
    if (v == null) return '';
    if (typeof v === 'object') return v.label || v.value || '';
    return String(v);
}
function deriveLanguageFamily(pg) {
    const existing = unwrapLabel(pg.languageFamily);
    if (existing) return existing;
    const langLabel = unwrapLabel(pg.language || pg.primary_language);
    return langFamilyByLanguage[langLabel] || '';
}

/**
 * useMapData composable - manages data loading and normalization for maps
 *
 * NOTE: dataSourceManager must be passed in since it's loaded via ES module import.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.mapId - Unique map identifier for logging
 * @param {string} options.dataSourceId - Data source ID (e.g., 'doxa-csv', 'doxa-api')
 * @param {Object} options.dataSourceManager - The dataSourceManager instance (required)
 * @param {Object} options.dataStore - Optional Pinia dataStore instance for caching
 * @param {Function} options.markRaw - Vue markRaw function to prevent reactivity on large arrays
 *
 * @returns {Object} { loadData, peopleGroups, normalizedPeopleGroups, regionsData, languageFamiliesData, doxaRegionsData, isLoading, error }
 */
export function useMapData(options) {
    const {
        mapId = 'unknown',
        dataSourceId = 'doxa-csv',
        dataSourceManager = null,  // Must be passed in!
        dataStore = null,
        markRaw = (x) => x // Default to identity function if not provided
    } = options;

    // Validate required dependency
    if (!dataSourceManager) {
        console.error('useMapData: dataSourceManager is required!');
    }

    // Reactive state
    const isLoading = ref(false);
    const error = ref(null);
    const isInitialized = ref(false);

    // Data arrays (will be marked as raw for performance)
    const peopleGroups = ref([]);
    const normalizedPeopleGroups = ref([]);
    const regionsData = ref(null);
    const languageFamiliesData = ref([]);
    const doxaRegionsData = ref([]);
    const resourcesData = ref([]);

    // Statistics
    const stats = ref(null);

    /**
     * Initialize and load all data from the configured source
     * This is the main entry point for data loading
     *
     * @returns {Promise<Object>} Loaded data object
     */
    async function loadData() {
        if (!dataSourceManager) {
            throw new Error('dataSourceManager is required for useMapData');
        }

        isLoading.value = true;
        error.value = null;

        try {
            // Initialize the data source manager (singleton)
            await dataSourceManager.init();


            // Load from dataStore cache if available, otherwise from DataSourceManager
            if (dataStore && dataStore.hasSourceData && dataStore.hasSourceData(dataSourceId)) {
                const cached = dataStore.getSourceData(dataSourceId);
                normalizedPeopleGroups.value = markRaw(cached.normalizedData || []);
            } else {
                // Load fresh data from DataSourceManager
                const rawData = await dataSourceManager.setActiveSource(dataSourceId);
                // Backfill languageFamily from primary_language label — upstream API
                // returns `imb_language_family: null` for every row today.
                // Also flatten language to its display label so legend keys
                // (label form) match GeoJSON properties used in dim filters.
                // canonicalFamilyName() collapses case-different variants onto
                // the one proper-case key from LANGUAGE_FAMILY_COLORS so legend
                // setFilter('Sign Language') matches pins with 'Sign language'.
                for (const pg of rawData) {
                    const langLabel = unwrapLabel(pg.language || pg.primary_language);
                    if (langLabel) pg.language = langLabel;
                    const fam = deriveLanguageFamily(pg);
                    pg.languageFamily = canonicalFamilyName(fam);
                }
                normalizedPeopleGroups.value = markRaw(rawData);

                // Cache in dataStore if available
                if (dataStore && dataStore.cacheSourceData) {
                    dataStore.cacheSourceData(dataSourceId, {
                        normalizedData: rawData,
                        timestamp: Date.now()
                    });
                }
            }

            // Build backward-compatible peopleGroups array
            peopleGroups.value = markRaw(normalizedPeopleGroups.value.map(pg => ({
                id: pg.uniqueId,
                slug: pg.slug || '',
                rop3: pg.peopleGroupId,
                peopleId3: pg.peopleId3,
                name: pg.name,
                language: pg.language,
                languageFamily: pg.languageFamily,
                country: pg.country,
                population: pg.population,
                status: pg.engagementStatus || pg.status,
                latitude: pg.latitude,
                longitude: pg.longitude,
                lng: pg.longitude,
                lat: pg.latitude,
                description: pg.description,
                imageUrl: pg.imageUrl,
                doxaRegion: pg.doxaRegion || pg.wagfRegion || '',
                peoplePraying: pg.peoplePraying ?? null,
                _normalized: pg // Keep reference to normalized data
            })));

            // Build language families data from normalized data
            const familyGroups = dataSourceManager.getDataByLanguageFamily();
            languageFamiliesData.value = Object.entries(familyGroups)
                .map(([name, groups]) => {
                    // Sum population from all people groups in this language family
                    const totalPopulation = groups.reduce((sum, pg) => {
                        const pop = parseInt(pg.population) || 0;
                        return sum + pop;
                    }, 0);
                    return {
                        name,
                        count: groups.length,
                        peopleGroupCount: groups.length,
                        population: totalPopulation,
                        groups
                    };
                })
                .sort((a, b) => b.count - a.count);


            // Build DOXA regions data with people group counts and population
            const regionGroups = dataSourceManager.getDataByRegion();
            doxaRegionsData.value = Object.entries(regionGroups)
                .map(([name, groups]) => {
                    // Sum population from all people groups in this region
                    const totalPopulation = groups.reduce((sum, pg) => {
                        const pop = parseInt(pg.population) || 0;
                        return sum + pop;
                    }, 0);
                    return {
                        name,
                        count: groups.length,
                        peopleGroupCount: groups.length,
                        population: totalPopulation,
                        groups
                    };
                })
                .sort((a, b) => a.name.localeCompare(b.name));

            // Build gospel resources data - INCLUSIVE counts (each UPG counted in ALL resources it has)
            const resourceCounts = {
                bible: { count: 0, population: 0, groups: [] },
                jesusFilm: { count: 0, population: 0, groups: [] },
                radio: { count: 0, population: 0, groups: [] },
                gospel: { count: 0, population: 0, groups: [] },
                audio: { count: 0, population: 0, groups: [] },
                stories: { count: 0, population: 0, groups: [] },
                hasResources: { count: 0, population: 0, groups: [] },
                noResources: { count: 0, population: 0, groups: [] }
            };

            normalizedPeopleGroups.value.forEach(pg => {
                const pop = parseInt(pg.population) || 0;
                let hasAnyResource = false;

                // Check each resource - INCLUSIVE counting (can be in multiple)
                if (pg.bible === 'Available') {
                    resourceCounts.bible.count++;
                    resourceCounts.bible.population += pop;
                    resourceCounts.bible.groups.push(pg);
                    hasAnyResource = true;
                }
                if (pg.jesusFilm === 'Available') {
                    resourceCounts.jesusFilm.count++;
                    resourceCounts.jesusFilm.population += pop;
                    resourceCounts.jesusFilm.groups.push(pg);
                    hasAnyResource = true;
                }
                if (pg.radio === 'Available') {
                    resourceCounts.radio.count++;
                    resourceCounts.radio.population += pop;
                    resourceCounts.radio.groups.push(pg);
                    hasAnyResource = true;
                }
                if (pg.gospel === 'Available') {
                    resourceCounts.gospel.count++;
                    resourceCounts.gospel.population += pop;
                    resourceCounts.gospel.groups.push(pg);
                    hasAnyResource = true;
                }
                if (pg.audio === 'Available') {
                    resourceCounts.audio.count++;
                    resourceCounts.audio.population += pop;
                    resourceCounts.audio.groups.push(pg);
                    hasAnyResource = true;
                }
                if (pg.stories === 'Available') {
                    resourceCounts.stories.count++;
                    resourceCounts.stories.population += pop;
                    resourceCounts.stories.groups.push(pg);
                    hasAnyResource = true;
                }

                // Has Resources = has ANY of the above (inverse of noResources)
                if (hasAnyResource) {
                    resourceCounts.hasResources.count++;
                    resourceCounts.hasResources.population += pop;
                    resourceCounts.hasResources.groups.push(pg);
                } else {
                    // No resources = has NONE of the above
                    resourceCounts.noResources.count++;
                    resourceCounts.noResources.population += pop;
                    resourceCounts.noResources.groups.push(pg);
                }
            });

            // Build resourcesData as TREE structure with parent/children
            const totalUPGs = normalizedPeopleGroups.value.length;
            const totalPopulation = normalizedPeopleGroups.value.reduce((sum, pg) => sum + (parseInt(pg.population) || 0), 0);

            const resourceNames = {
                bible: 'Bible',
                jesusFilm: 'Jesus Film',
                radio: 'Radio',
                gospel: 'Gospel',
                audio: 'Audio',
                stories: 'Stories',
                hasResources: 'Has Resources',
                noResources: 'No Resources'
            };

            // Calculate "without" counts (total - with = without)
            const withoutCounts = {
                bible: { count: totalUPGs - resourceCounts.bible.count, population: totalPopulation - resourceCounts.bible.population },
                jesusFilm: { count: totalUPGs - resourceCounts.jesusFilm.count, population: totalPopulation - resourceCounts.jesusFilm.population },
                radio: { count: totalUPGs - resourceCounts.radio.count, population: totalPopulation - resourceCounts.radio.population },
                gospel: { count: totalUPGs - resourceCounts.gospel.count, population: totalPopulation - resourceCounts.gospel.population },
                audio: { count: totalUPGs - resourceCounts.audio.count, population: totalPopulation - resourceCounts.audio.population },
                stories: { count: totalUPGs - resourceCounts.stories.count, population: totalPopulation - resourceCounts.stories.population }
            };

            // Build tree: 6 resources with "No X" children, then "Has Resources" with "No Resources" child
            const BLACK_COLOR = '#2c3e50'; // All "No X" children use black

            resourcesData.value = [
                // 6 specific resources - each with "No [Resource]" child
                {
                    name: resourceNames.bible,
                    key: 'bible',
                    count: resourceCounts.bible.count,
                    population: resourceCounts.bible.population,
                    isParent: true,
                    children: [{
                        name: 'No Bible',
                        key: 'noBible',
                        count: withoutCounts.bible.count,
                        population: withoutCounts.bible.population,
                        color: BLACK_COLOR
                    }]
                },
                {
                    name: resourceNames.jesusFilm,
                    key: 'jesusFilm',
                    count: resourceCounts.jesusFilm.count,
                    population: resourceCounts.jesusFilm.population,
                    isParent: true,
                    children: [{
                        name: 'No Jesus Film',
                        key: 'noJesusFilm',
                        count: withoutCounts.jesusFilm.count,
                        population: withoutCounts.jesusFilm.population,
                        color: BLACK_COLOR
                    }]
                },
                {
                    name: resourceNames.radio,
                    key: 'radio',
                    count: resourceCounts.radio.count,
                    population: resourceCounts.radio.population,
                    isParent: true,
                    children: [{
                        name: 'No Radio',
                        key: 'noRadio',
                        count: withoutCounts.radio.count,
                        population: withoutCounts.radio.population,
                        color: BLACK_COLOR
                    }]
                },
                {
                    name: resourceNames.gospel,
                    key: 'gospel',
                    count: resourceCounts.gospel.count,
                    population: resourceCounts.gospel.population,
                    isParent: true,
                    children: [{
                        name: 'No Gospel',
                        key: 'noGospel',
                        count: withoutCounts.gospel.count,
                        population: withoutCounts.gospel.population,
                        color: BLACK_COLOR
                    }]
                },
                {
                    name: resourceNames.audio,
                    key: 'audio',
                    count: resourceCounts.audio.count,
                    population: resourceCounts.audio.population,
                    isParent: true,
                    children: [{
                        name: 'No Audio',
                        key: 'noAudio',
                        count: withoutCounts.audio.count,
                        population: withoutCounts.audio.population,
                        color: BLACK_COLOR
                    }]
                },
                {
                    name: resourceNames.stories,
                    key: 'stories',
                    count: resourceCounts.stories.count,
                    population: resourceCounts.stories.population,
                    isParent: true,
                    children: [{
                        name: 'No Stories',
                        key: 'noStories',
                        count: withoutCounts.stories.count,
                        population: withoutCounts.stories.population,
                        color: BLACK_COLOR
                    }]
                },
                // "Has Resources" with "No Resources" as child
                {
                    name: resourceNames.hasResources,
                    key: 'hasResources',
                    count: resourceCounts.hasResources.count,
                    population: resourceCounts.hasResources.population,
                    isParent: true,
                    children: [{
                        name: resourceNames.noResources,
                        key: 'noResources',
                        count: resourceCounts.noResources.count,
                        population: resourceCounts.noResources.population,
                        color: BLACK_COLOR
                    }]
                }
            ];


            // Get stats
            stats.value = dataSourceManager.getStats();

            isInitialized.value = true;

            return {
                peopleGroups: peopleGroups.value,
                normalizedPeopleGroups: normalizedPeopleGroups.value,
                languageFamiliesData: languageFamiliesData.value,
                doxaRegionsData: doxaRegionsData.value,
                resourcesData: resourcesData.value,
                stats: stats.value
            };
        } catch (err) {
            console.error(`Failed to load data for map "${mapId}":`, err);
            error.value = err.message || 'Failed to load data';
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Load region polygon data (GeoJSON) for map display
     *
     * @returns {Promise<Object>} GeoJSON regions data
     */
    async function loadRegionsData() {
        try {
            const baseUrl = window.MAP_APP_BASE_URL || './';
            // TODO: domain-specific path. Override or pass via options if your
            // app stores its region polygons elsewhere.
            const response = await fetch(baseUrl + 'assets/data/doxa-regions-with-geo.json');
            regionsData.value = await response.json();
            return regionsData.value;
        } catch (err) {
            console.error(`Error loading regions data for map "${mapId}":`, err);
            error.value = err.message || 'Failed to load regions';
            throw err;
        }
    }

    /**
     * Get data grouped by language family from DataSourceManager
     */
    function getDataByLanguageFamily() {
        if (!dataSourceManager) return {};
        return dataSourceManager.getDataByLanguageFamily();
    }

    /**
     * Get data grouped by region from DataSourceManager
     */
    function getDataByRegion() {
        if (!dataSourceManager) return {};
        return dataSourceManager.getDataByRegion();
    }

    function getPeopleGroupsByFamily(familyName) {
        const byFamily = getDataByLanguageFamily();
        return byFamily[familyName] || [];
    }

    function getPeopleGroupsByRegion(regionName) {
        const byRegion = getDataByRegion();
        return byRegion[regionName] || [];
    }

    /**
     * Clear all loaded data (for cleanup or refresh)
     */
    function clearData() {
        peopleGroups.value = [];
        normalizedPeopleGroups.value = [];
        regionsData.value = null;
        languageFamiliesData.value = [];
        doxaRegionsData.value = [];
        resourcesData.value = [];
        stats.value = null;
        isInitialized.value = false;
        error.value = null;
    }

    return {
        // Reactive State
        isLoading,
        isInitialized,
        error,

        // Data Arrays (reactive refs, but content is marked as raw)
        peopleGroups,
        normalizedPeopleGroups,
        regionsData,
        languageFamiliesData,
        doxaRegionsData,
        resourcesData,
        stats,

        // Methods
        loadData,
        loadRegionsData,
        getDataByLanguageFamily,
        getDataByRegion,
        getPeopleGroupsByFamily,
        getPeopleGroupsByRegion,
        clearData
    };
}

// ES Module export
