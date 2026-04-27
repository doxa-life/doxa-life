// useMapLayers.js - Map Layers Composable
// Handles adding/removing Mapbox layers (regions, pins, language families)
// Vue 3 Composition API - ES Module with NPM packages

// Import Vue functions from NPM package
import { ref } from 'vue';

// Import utilities
import { buildColorExpression } from '../config/colorStrategies.js';
import { getRegionColor, COLOR_MODES } from '../config/colors.js';
import { getCircleRadiusInterpolation, getCircleStrokeWidthInterpolation } from '@/config/zoom.js';
import { useMapEvents } from './useMapEvents.js';

/**
 * useMapLayers composable - manages Mapbox layer creation and updates
 *
 * NOTE: Event handlers (click, hover, popups) are handled by useMapEvents composable
 * which is automatically initialized and used by this composable.
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.getMap - Function that returns the map instance
 * @param {string} options.mapId - Unique map identifier for logging
 * @param {Function} options.getLanguageFamilyColor - Color lookup function
 *
 * @returns {Object} Layer management functions and state
 */
export function useMapLayers(options = {}) {
    const {
        getMap = () => null,
        mapId = 'unknown',
        getLanguageFamilyColor = () => '#999999'
    } = options;

    // Initialize events composable for click handlers, popups, cursor changes
    const mapEvents = useMapEvents({ getMap, mapId, getLanguageFamilyColor });

    // Track which layers have been added
    const layersAdded = ref({
        languageFamilyPins: false,
        regions: false,
        peopleGroups: false,
        familyConnections: false
    });

    /**
     * Add language family pins layer
     * Shows people groups as colored circles based on language family
     *
     * @param {Array} peopleGroups - Array of people group data
     * @param {string} colorMode - Color mode ('languageFamily', 'affinityBlock', etc.)
     */
    function addLanguageFamilyLayer(peopleGroups, colorMode = 'languageFamily') {
        const map = getMap();
        if (!map || !peopleGroups?.length) {
            return;
        }

        // Build color expression from properties for all modes.
        // peoplePraying is stored in GeoJSON feature properties as a number,
        // so the Mapbox ['get', 'peoplePraying'] expression reads directly from properties.
        const colorExpression = buildColorExpression(colorMode);

        // Create GeoJSON features
        const features = peopleGroups.map(pg => ({
            type: 'Feature',
            properties: {
                uniqueId: pg.id || pg.uniqueId,
                slug: pg.slug || pg._normalized?.slug || '',
                rop3: pg.rop3 || pg.peopleGroupId,
                peopleId3: pg.peopleId3 || '',
                name: pg.name,
                language: pg.language,
                languageFamily: pg.languageFamily || pg._normalized?.languageFamily || 'Unknown',
                affinityBlock: pg.affinityBlock || pg.affbloc || pg.Affbloc || pg._normalized?.affinityBlock || 'Unknown',
                // Prefer the top-level `pg.doxaRegion` because useMapData's
                // backfill loop canonicalizes raw value forms ("africa",
                // "latin_america_&_caribbean", "na") onto the DOXA_REGION_COLORS
                // keys ("Africa", "Latin America & Caribbean", "No WAGF Region/Bloc").
                // Reading `_normalized` first would pin the GeoJSON property to
                // the lowercase value form and break Mapbox setFilter matches.
                doxaRegion: pg.doxaRegion || pg._normalized?.doxaRegion || 'Unknown',
                // Country fields — `countryName` is the unified decoded display label
                country:         pg.country,
                countryIso:      pg.countryIso,
                countryIsoLabel: pg.countryIsoLabel,
                countryName:     pg.countryName,
                // Religion fields — `religionName` is the unified decoded display label.
                religion:        pg.religion,
                religionCode:    pg.religionCode,
                religionLabel:   pg.religionLabel,
                religionName:    pg.religionName,
                population: pg.population,
                status: pg.status,
                description: pg.description || '',
                imageUrl: pg.imageUrl || '',
                // peoplePraying: stored in feature properties for initial load path;
                // after polling starts, Mapbox feature-state overrides color via setFeatureState().
                peoplePraying: Number(pg.peoplePraying ?? pg._normalized?.peoplePraying ?? 0),
                // engagementStatus / adoptionStatus: stored as booleans so Mapbox expressions work
                engagementStatus: pg.engagementStatus === true || pg.engagementStatus === 1 || false,
                adoptionStatus:   pg.adoptionStatus   === true || pg.adoptionStatus   === 1 || false,
                // Gospel resources for resource coloring (all 6 types)
                bible: pg.bible || pg._normalized?.bible || 'Not Available',
                jesusFilm: pg.jesusFilm || pg._normalized?.jesusFilm || 'Not Available',
                radio: pg.radio || pg._normalized?.radio || 'Not Available',
                gospel: pg.gospel || pg._normalized?.gospel || 'Not Available',
                audio: pg.audio || pg._normalized?.audio || 'Not Available',
                stories: pg.stories || pg._normalized?.stories || 'Not Available',
                // lng stored as feature property so wave animation expressions can read it
                lng: parseFloat(pg.longitude || pg.lng) || 0
            },
            geometry: {
                type: 'Point',
                coordinates: [parseFloat(pg.longitude || pg.lng), parseFloat(pg.latitude || pg.lat)]
            }
        })).filter(f =>
            !isNaN(f.geometry.coordinates[0]) &&
            !isNaN(f.geometry.coordinates[1])
        );

        const geojson = {
            type: 'FeatureCollection',
            features: features
        };


        // Add source — promoteId promotes properties.uniqueId → feature.id for setFeatureState()
        map.addSource('language-families', {
            type: 'geojson',
            data: geojson,
            promoteId: 'uniqueId'
        });

        // Add the pins layer. Pins render fully opaque so they read clearly
        // on top of the doxa-regions polygon fill (which is semi-transparent).
        map.addLayer({
            id: 'language-family-pins',
            type: 'circle',
            source: 'language-families',
            paint: {
                'circle-radius': getCircleRadiusInterpolation('standard'),
                'circle-color': colorExpression,
                'circle-stroke-width': getCircleStrokeWidthInterpolation('standard'),
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 1,
                'circle-stroke-opacity': 1
            }
        });

        layersAdded.value.languageFamilyPins = true;

        // Attach event handlers (click for popup, cursor change on hover)
        mapEvents.attachLanguageFamilyEvents();

    }

    /**
     * Add regions polygon layer
     * Shows regions as colored fill polygons
     *
     * @param {Object} regionsData - GeoJSON regions data
     * @param {string} colorScheme - Color scheme ('doxa-regions', 'affinity-blocs', 'none')
     */
    function addRegionsLayer(regionsData, colorScheme = 'doxa-regions') {
        const map = getMap();
        if (!map || !regionsData) {
            return;
        }

        // Determine which color palette to use
        let getColor;
        if (colorScheme === 'doxa-regions') {
            getColor = (country, region) => getRegionColor(region.name) || '#cccccc';
        } else if (colorScheme === 'affinity-blocs') {
            getColor = () => '#e0e0e0'; // Placeholder
        } else {
            getColor = () => 'rgba(200, 200, 200, 0.3)';
        }

        // Create GeoJSON FeatureCollection from regions data
        const features = [];

        regionsData.regions.forEach(region => {
            region.subRegions.forEach(subRegion => {
                subRegion.countries.forEach(country => {
                    if (country.geometry && country.geometry.type) {
                        features.push({
                            type: 'Feature',
                            properties: {
                                name: country.name,
                                geoName: country.geoName,
                                region: region.name,
                                subRegion: subRegion.name,
                                uupgCount: country.uupgCount,
                                hasWAGFMember: country.hasWAGFMember,
                                color: getColor(country, region)
                            },
                            geometry: country.geometry
                        });
                    }
                });
            });
        });

        const geojson = {
            type: 'FeatureCollection',
            features: features
        };


        // Add source
        map.addSource('regions', {
            type: 'geojson',
            data: geojson
        });

        // Insert regions UNDER the pins layer so pins stay on top + clickable.
        // Mapbox addLayer(layer, beforeId) inserts beneath beforeId.
        const beforeId = map.getLayer('language-family-pins') ? 'language-family-pins' : undefined;

        map.addLayer({
            id: 'regions-fill',
            type: 'fill',
            source: 'regions',
            paint: {
                'fill-color': ['get', 'color'],
                'fill-opacity': colorScheme === 'none' ? 0.2 : 0.35
            }
        }, beforeId);

        map.addLayer({
            id: 'regions-border',
            type: 'line',
            source: 'regions',
            paint: {
                'line-color': '#ffffff',
                'line-width': 1
            }
        }, beforeId);

        layersAdded.value.regions = true;

        // Attach event handlers (click for popup, cursor change on hover)
        mapEvents.attachRegionEvents();

    }

    /**
     * Add family connection lines (tapestry effect)
     * Connects people groups of the same language family
     *
     * @param {string} familyName - Language family name
     * @param {Array} peopleGroups - Array of people groups
     */
    function addFamilyConnectionLines(familyName, peopleGroups) {
        const map = getMap();
        if (!map || !familyName || !peopleGroups?.length) return;

        // Remove existing lines first
        removeFamilyConnectionLines();

        // Get all people groups in this family
        const familyGroups = peopleGroups.filter(pg => {
            const pgFamily = pg.languageFamily || pg._normalized?.languageFamily || 'Unknown';
            return pgFamily === familyName;
        });


        if (familyGroups.length < 2) return;

        // Get the color for this family
        const familyColor = getLanguageFamilyColor(familyName);

        // Create line features connecting nearby points
        const lineFeatures = [];
        const maxDistance = 15; // Maximum degrees distance

        // Sort by longitude for efficient neighbor finding
        const sorted = [...familyGroups].sort((a, b) =>
            (a.longitude || a.lng) - (b.longitude || b.lng)
        );

        for (let i = 0; i < sorted.length; i++) {
            const current = sorted[i];
            const currLng = current.longitude || current.lng;
            const currLat = current.latitude || current.lat;

            for (let j = i + 1; j < Math.min(i + 15, sorted.length); j++) {
                const other = sorted[j];
                const otherLng = other.longitude || other.lng;
                const otherLat = other.latitude || other.lat;

                const distance = Math.sqrt(
                    Math.pow(currLng - otherLng, 2) +
                    Math.pow(currLat - otherLat, 2)
                );

                if (distance < maxDistance) {
                    lineFeatures.push({
                        type: 'Feature',
                        properties: { family: familyName },
                        geometry: {
                            type: 'LineString',
                            coordinates: [
                                [currLng, currLat],
                                [otherLng, otherLat]
                            ]
                        }
                    });
                }
            }
        }

        // Add source and layer
        map.addSource('family-connections', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: lineFeatures
            }
        });

        map.addLayer({
            id: 'family-connection-lines',
            type: 'line',
            source: 'family-connections',
            paint: {
                'line-color': familyColor,
                'line-width': 0.75,
                'line-opacity': 0.5
            }
        }, 'language-family-pins'); // Add below the pins layer

        layersAdded.value.familyConnections = true;
    }

    /**
     * Remove family connection lines
     */
    function removeFamilyConnectionLines() {
        const map = getMap();
        if (!map) return;

        if (map.getLayer('family-connection-lines')) {
            map.removeLayer('family-connection-lines');
        }
        if (map.getSource('family-connections')) {
            map.removeSource('family-connections');
        }
        layersAdded.value.familyConnections = false;
    }

    /**
     * Update layer source data
     */
    function updateLayerSource(sourceId, data) {
        const map = getMap();
        if (!map) return;

        const source = map.getSource(sourceId);
        if (source) {
            source.setData(data);
        }
    }

    /**
     * Remove a layer and its source
     */
    function removeLayer(layerId, sourceId = null) {
        const map = getMap();
        if (!map) return;

        if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
        }
        if (map.getSource(sourceId || layerId)) {
            map.removeSource(sourceId || layerId);
        }
    }

    /**
     * Check if a layer exists
     */
    function hasLayer(layerId) {
        const map = getMap();
        return map ? !!map.getLayer(layerId) : false;
    }

    /**
     * Set paint property on a layer
     */
    function setPaintProperty(layerId, property, value) {
        const map = getMap();
        if (!map || !map.getLayer(layerId)) return;

        map.setPaintProperty(layerId, property, value);
    }

    /**
     * Cleanup: detach all event handlers
     * Call this before destroying the map
     */
    function cleanup() {
        mapEvents.detachAllEventHandlers();
    }

    return {
        // State
        layersAdded,

        // Layer creation (includes event handler attachment)
        addLanguageFamilyLayer,
        addRegionsLayer,
        addFamilyConnectionLines,
        removeFamilyConnectionLines,

        // Layer management
        updateLayerSource,
        removeLayer,
        hasLayer,
        setPaintProperty,

        // Event management (exposed for advanced usage)
        mapEvents,

        // Cleanup
        cleanup
    };
}

// ES Module export
