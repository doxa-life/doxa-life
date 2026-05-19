// useMapLayers.js - Map Layers Composable
// Handles adding/removing Mapbox layers (regions, pins, language families)
// Vue 3 Composition API - ES Module with NPM packages

// Import Vue functions from NPM package
import { ref } from 'vue';

// Import utilities
import { buildColorExpression } from '../config/colorStrategies.js';
import { getRegionColor, COLOR_MODES } from '../config/colors.js';
import { getCircleRadiusInterpolation, getCircleStrokeWidthInterpolation } from '../config/zoom.js';
import { FULL_PRAYER_THRESHOLD, PALETTE as PRAYER_PALETTE } from '../config/color-strategies/prayer-progress.js';
import { useMapEvents } from './useMapEvents.js';
import langFamilyByLanguage from '../data/langFamilyByLanguage.json';

// ── Client-side language → family derivation ────────────────────────────────
// API field `imb_language_family` is null for all 2,069 records (qa-feedback1
// Round 5 A2). The legend bucketing (useLanguageFamilyLegendData.readFamily)
// derives family client-side via langFamilyByLanguage; mirror the same
// derivation here so pin features carry the correct languageFamily property.
// Without this, the languageFamily color strategy paints pins as 'Unknown'
// (gray/black) and PPLR-style property filters miss them.
const FAMILY_SUFFIXES_PIN = [
  [/ sign language$/i, 'Sign Language'],
];
function deriveFamilyFromLanguage(label) {
  if (!label || typeof label !== 'string') return null;
  const lbl = label.trim();
  // Comma-inverted lookup: "Arabic, Sudanese" → "Sudanese Arabic"
  const parts = lbl.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const fullReversed = [...parts].reverse().join(' ');
    if (langFamilyByLanguage[fullReversed]) return langFamilyByLanguage[fullReversed];
    if (parts.length >= 3) {
      const twoReversed = [parts[1], parts[0]].join(' ');
      if (langFamilyByLanguage[twoReversed]) return langFamilyByLanguage[twoReversed];
    }
  }
  if (langFamilyByLanguage[lbl]) return langFamilyByLanguage[lbl];
  // Strip parenthetical suffix: "Ainu (China)" → "Ainu"
  const stripped = lbl.replace(/\s*\(.*?\)\s*$/, '').trim();
  if (stripped !== lbl && langFamilyByLanguage[stripped]) return langFamilyByLanguage[stripped];
  // Suffix groups: "Pakistan Sign Language" → "Sign Language"
  for (const [re, base] of FAMILY_SUFFIXES_PIN) {
    if (re.test(lbl)) return base;
  }
  return null;
}

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
 * @param {Function} options.getNormalizedPeopleGroups - Returns normalized PG array for region popups
 *
 * @returns {Object} Layer management functions and state
 */
export function useMapLayers(options = {}) {
    const {
        getMap = () => null,
        mapId = 'unknown',
        getLanguageFamilyColor = () => '#999999',
        getNormalizedPeopleGroups = () => []
    } = options;

    // Initialize events composable for click handlers, popups, cursor changes
    const mapEvents = useMapEvents({ getMap, mapId, getLanguageFamilyColor, getNormalizedPeopleGroups });

    // Track which layers have been added
    const layersAdded = ref({
        languageFamilyPins: false,
        regions: false,
        peopleGroups: false,
        familyConnections: false
    });

    // Populated by addRegionsLayer — maps WAGF region label → Set of ISO alpha-2 codes.
    // Used by applyDimFilter to build the Mapbox match expression for polygon highlight.
    const regionIsoMap = ref({});

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
                // Derive languageFamily client-side when API is null. The api
                // field `imb_language_family` is null for all 2,069 PGs; without
                // this fallback, every pin's languageFamily is 'Unknown' which
                // breaks the languageFamily color strategy AND any property-
                // based family filter (the legend's family-bucket only
                // catches whatever subset of langs the lookup happened to hit).
                languageFamily: pg.languageFamily
                  || pg._normalized?.languageFamily
                  || deriveFamilyFromLanguage(pg.language)
                  || 'Unknown',
                affinityBlock: pg.affinityBlock || pg.affbloc || pg.Affbloc || pg._normalized?.affinityBlock || 'Unknown',
                affinityBlockLabel: pg.affinityBlockLabel || pg._normalized?.affinityBlockLabel || '',
                // Cluster (rop2) — added 2026-05-08 for the affinity-block 4-tier legend.
                cluster:           pg.cluster      || pg._normalized?.cluster      || '',
                clusterLabel:      pg.clusterLabel || pg._normalized?.clusterLabel || '',
                // People group (rop25) — added 2026-05-08 for the affinity-block tier-3 filter.
                peopleGroup:       pg.peopleGroup      || pg._normalized?.peopleGroup      || '',
                peopleGroupLabel:  pg.peopleGroupLabel || pg._normalized?.peopleGroupLabel || '',
                // Prefer the top-level `pg.doxaRegion` because useMapData's
                // backfill loop canonicalizes raw value forms ("africa",
                // "latin_america_&_caribbean", "na") onto the DOXA_REGION_COLORS
                // keys ("Africa", "Latin America & Caribbean", "No WAGF Region/Bloc").
                // Reading `_normalized` first would pin the GeoJSON property to
                // the lowercase value form and break Mapbox setFilter matches.
                doxaRegion: pg.doxaRegion || pg._normalized?.doxaRegion || 'Unknown',
                wagfBlock: pg.wagfBlock || pg._normalized?.wagfBlock || '',
                wagfBlockLabel: pg.wagfBlockLabel || pg._normalized?.wagfBlockLabel || '',
                wagfRegionLabel: pg.wagfRegionLabel || pg._normalized?.wagfRegionLabel || '',
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

        // Offset co-located pins so they fan out in a circle instead of stacking.
        // Radius is ~0.04 degrees (~4 km) — visible at zoom ≥ 5, invisible at world view.
        const OFFSET_RADIUS_DEG = 0.04;
        const coordKey = (f) => `${f.geometry.coordinates[0]},${f.geometry.coordinates[1]}`;
        const groups = new Map();
        for (const f of features) {
            const k = coordKey(f);
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k).push(f);
        }
        for (const bucket of groups.values()) {
            if (bucket.length < 2) continue;
            const [cx, cy] = bucket[0].geometry.coordinates;
            const n = bucket.length;
            for (let i = 0; i < n; i++) {
                const angle = (2 * Math.PI * i) / n;
                bucket[i].geometry.coordinates = [
                    cx + OFFSET_RADIUS_DEG * Math.cos(angle),
                    cy + OFFSET_RADIUS_DEG * Math.sin(angle)
                ];
            }
        }

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

        // Shadow layer — rendered BEFORE pins for a subtle drop-shadow effect.
        // Uses circle-blur + circle-translate to simulate depth with zero DOM overhead.
        map.addLayer({
            id: 'language-family-pins-shadow',
            type: 'circle',
            source: 'language-families',
            paint: {
                'circle-radius': getCircleRadiusInterpolation('standard'),
                'circle-color': 'rgba(0,0,0,0.12)',
                'circle-blur': 0.8,
                'circle-translate': [0, 1],
                'circle-stroke-width': 0,
                'circle-opacity': 1
            }
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
                'circle-stroke-color': 'rgba(0,0,0,0.2)',
                'circle-opacity': 1,
                'circle-stroke-opacity': 1,
                'circle-opacity-transition': { duration: 250 }
            }
        });

        // Invisible hitbox layer — larger transparent circles on top of pins
        // for easier touch/click targeting (especially on mobile/tablet).
        // Uses 'touchTarget' profile: 22px+ radius at zoom 4-8 for >=44px
        // effective tap diameter (Apple HIG / Material minimum).
        map.addLayer({
            id: 'language-family-pins-hitbox',
            type: 'circle',
            source: 'language-families',
            paint: {
                'circle-radius': getCircleRadiusInterpolation('touchTarget'),
                'circle-color': 'rgba(0,0,0,0)',
                'circle-stroke-width': 0,
                'circle-opacity': 0
            }
        });

        layersAdded.value.languageFamilyPins = true;

        // Attach event handlers (click for popup, cursor change on hover)
        mapEvents.attachLanguageFamilyEvents();

    }

    /**
     * Add regions polygon layer using Mapbox's built-in country boundaries
     * vector tileset (mapbox.country-boundaries-v1). No external fetch —
     * same CDN as the base map, vector tiles load only the visible viewport.
     *
     * @param {Object} regionsData - { isoToRegion: { 'AF': 'Asia', … } }
     * @param {string} colorScheme - 'doxa-regions' | 'none'
     */
    function addRegionsLayer(regionsData, colorScheme = 'doxa-regions') {
        const map = getMap();
        if (!map) return;

        // If layers already exist (e.g. after a style reload) remove them first.
        if (map.getLayer('regions-fill'))   map.removeLayer('regions-fill');
        if (map.getLayer('regions-border')) map.removeLayer('regions-border');
        if (map.getSource('regions'))       map.removeSource('regions');

        const REGION_COLORS = {
            'Africa':                                 '#e74c3c',
            'Asia':                                   '#3498db',
            'Europe':                                 '#2ecc71',
            'Latin America & Caribbean':              '#f39c12',
            'Middle East':                            '#9b59b6',
            'North America & Non-Spanish Caribbean':  '#1abc9c',
            'Oceania':                                '#e67e22',
        };
        const DEFAULT_COLOR = '#cccccc';

        // Build a Mapbox `match` expression on iso_3166_1_alpha_3 (alpha-3).
        // The mapbox.country-boundaries-v1 tileset exposes both iso_3166_1 (alpha-2)
        // AND iso_3166_1_alpha_3 (alpha-3). The API gives us country_code as alpha-3
        // (e.g. 'MYS', 'SDN') so we match on the alpha-3 property to avoid a lookup table.
        const isoToRegion = (regionsData && regionsData.isoToRegion) ? regionsData.isoToRegion : {};
        const matchPairs = [];
        // Build regionIsoMap: region label → array of ISO alpha-3 codes for that region.
        const _regionIsoMap = {};
        for (const [iso, region] of Object.entries(isoToRegion)) {
            const color = REGION_COLORS[region];
            if (color) matchPairs.push(iso, color);
            if (!_regionIsoMap[region]) _regionIsoMap[region] = [];
            _regionIsoMap[region].push(iso);
        }
        regionIsoMap.value = _regionIsoMap;

        // If no mapping available fall back to a flat grey — map still renders.
        const fillColorExpr = matchPairs.length
            ? ['match', ['get', 'iso_3166_1_alpha_3'], ...matchPairs, DEFAULT_COLOR]
            : DEFAULT_COLOR;

        // Insert regions UNDER the pins (and shadow) layer so pins stay on top + clickable.
        // Prefer inserting before the shadow layer so z-order is: regions → shadow → pins → hitbox.
        const beforeId = map.getLayer('language-family-pins-shadow')
            ? 'language-family-pins-shadow'
            : map.getLayer('language-family-pins')
                ? 'language-family-pins'
                : undefined;

        map.addSource('regions', {
            type: 'vector',
            url: 'mapbox://mapbox.country-boundaries-v1'
        });

        map.addLayer({
            id: 'regions-fill',
            type: 'fill',
            source: 'regions',
            'source-layer': 'country_boundaries',
            paint: {
                'fill-color': fillColorExpr,
                'fill-opacity': colorScheme === 'none' ? 0.1 : 0.20,
                'fill-antialias': true,
                'fill-opacity-transition': { duration: 300 }
            }
        }, beforeId);

        map.addLayer({
            id: 'regions-border',
            type: 'line',
            source: 'regions',
            'source-layer': 'country_boundaries',
            paint: {
                'line-color': 'rgba(60,60,80,0.35)',
                'line-width': 0.6
            }
        }, beforeId);

        layersAdded.value.regions = true;

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

    // ── Prayer ripple animation (continuous WiFi-style waves) ─────────────────
    // Solid colored disc behind pin + 4 ring layers in perpetual staggered
    // expansion. Each ring is offset by 1/4 of the cycle so there is ALWAYS
    // at least 2 rings visible — no gap, no pause. Rings emit continuously
    // from the pin center and fade to transparent at max radius, like ripples
    // on water or WiFi signal waves radiating outward.
    //
    // Pin radii: z0=3, z2=3.5, z4=4, z5=5, z6=6.5, z7=8, z8=10, z10=14, z12=18, z14=22
    let _glowRafId = null;
    let _glowActive = false;
    const GLOW_BASE  = 'prayer-glow-base';
    const RING_COUNT = 4;
    const _RING_IDS = [];
    for (let _ri = 0; _ri < RING_COUNT; _ri++) _RING_IDS.push('prayer-glow-ring-' + _ri);
    const _GLOW_IDS  = [GLOW_BASE, ..._RING_IDS];
    const CYCLE_SEC  = 6.0;
    const MIN_SCALE  = 0.3;
    const MAX_SCALE  = 2.5;

    function _glowColorExpr() {
        return [
            'case',
            ['>=', ['get', 'peoplePraying'], FULL_PRAYER_THRESHOLD],
            '#15803d',
            ['>', ['get', 'peoplePraying'], 0],
            '#d97706',
            'rgba(0,0,0,0)'
        ];
    }

    const _BASE_R = [0,5, 2,6, 4,7, 5,9, 6,12, 7,14, 8,18, 10,25, 12,32, 14,40];

    function _scaledRadius(base, scale) {
        const out = ['interpolate', ['linear'], ['zoom']];
        for (let i = 0; i < base.length; i += 2) {
            out.push(base[i], base[i+1] * scale);
        }
        return out;
    }

    function addPrayerGlowLayers() {
        const map = getMap();
        if (!map || !map.getSource('language-families')) return;

        const prayerFilter = ['>', ['get', 'peoplePraying'], 0];
        const color = _glowColorExpr();

        if (!map.getLayer(GLOW_BASE)) {
            map.addLayer({
                id: GLOW_BASE,
                type: 'circle',
                source: 'language-families',
                filter: prayerFilter,
                paint: {
                    'circle-radius': _scaledRadius(_BASE_R, 1.0),
                    'circle-color': color,
                    'circle-blur': 0.3,
                    'circle-opacity': 0.45,
                    'circle-stroke-width': 0,
                }
            }, 'language-family-pins');
        }

        for (const ringId of _RING_IDS) {
            if (!map.getLayer(ringId)) {
                map.addLayer({
                    id: ringId,
                    type: 'circle',
                    source: 'language-families',
                    filter: prayerFilter,
                    paint: {
                        'circle-radius': _scaledRadius(_BASE_R, 1.0),
                        'circle-color': 'rgba(0,0,0,0)',
                        'circle-blur': 0,
                        'circle-opacity': 1,
                        'circle-stroke-width': 2,
                        'circle-stroke-color': color,
                        'circle-stroke-opacity': 0,
                    }
                }, 'language-family-pins');
            }
        }
    }

    function removePrayerGlowLayers() {
        const map = getMap();
        if (!map) return;
        for (const id of _GLOW_IDS) {
            if (map.getLayer(id)) map.removeLayer(id);
        }
    }

    function syncGlowFilter(extraFilter) {
        const map = getMap();
        if (!map) return;
        const base = ['>', ['get', 'peoplePraying'], 0];
        const filter = extraFilter ? ['all', base, extraFilter] : base;
        for (const id of _GLOW_IDS) {
            if (map.getLayer(id)) {
                try { map.setFilter(id, filter); } catch (_) {}
            }
        }
    }

    function startPrayerGlow() {
        const map = getMap();
        if (!map) return;
        addPrayerGlowLayers();
        if (_glowActive) return;
        _glowActive = true;

        if (map.getLayer('language-family-pins')) {
            try {
                map.setLayoutProperty('language-family-pins', 'circle-sort-key', [
                    'case',
                    ['>=', ['get', 'peoplePraying'], FULL_PRAYER_THRESHOLD], 1,
                    ['>', ['get', 'peoplePraying'], 0], 1,
                    3
                ]);
            } catch (_) {}
        }

        let t0 = performance.now();
        function tick(now) {
            if (!_glowActive) return;
            _glowRafId = requestAnimationFrame(tick);
            const m = getMap();
            if (!m || !_GLOW_IDS.some(id => m.getLayer(id))) { _glowActive = false; return; }
            const elapsed = (now - t0) / 1000;

            for (let i = 0; i < RING_COUNT; i++) {
                const ringId = _RING_IDS[i];
                if (!m.getLayer(ringId)) continue;

                const delay = i * (CYCLE_SEC / RING_COUNT);
                const t = ((elapsed - delay) % CYCLE_SEC + CYCLE_SEC) % CYCLE_SEC;
                const phase = t / CYCLE_SEC;
                const radiusScale = MIN_SCALE + phase * (MAX_SCALE - MIN_SCALE);
                const opacity = 0.5 * (1.0 - phase);

                try {
                    m.setPaintProperty(ringId, 'circle-radius', _scaledRadius(_BASE_R, radiusScale));
                    m.setPaintProperty(ringId, 'circle-stroke-opacity', opacity);
                    m.setPaintProperty(ringId, 'circle-stroke-width', 2.5);
                    m.setPaintProperty(ringId, 'circle-blur', 0);
                } catch (_) {}
            }
        }
        _glowRafId = requestAnimationFrame(tick);
    }

    function stopPrayerGlow() {
        _glowActive = false;
        if (_glowRafId) { cancelAnimationFrame(_glowRafId); _glowRafId = null; }
        try {
            removePrayerGlowLayers();
            const map = getMap();
            if (map && map.getLayer('language-family-pins')) {
                map.setLayoutProperty('language-family-pins', 'circle-sort-key', undefined);
            }
        } catch (_) {}
    }

    return {
        // State
        layersAdded,
        regionIsoMap,

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

        // Prayer glow animation
        startPrayerGlow,
        stopPrayerGlow,
        syncGlowFilter,

        // Cleanup
        cleanup
    };
}

// ES Module export
