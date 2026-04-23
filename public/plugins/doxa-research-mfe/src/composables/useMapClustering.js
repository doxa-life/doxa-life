// useMapClustering.js — Map Clustering Composable
// Vue 3 Composition API — ES Module
//
// Three clustering modes:
//   1. 'mapbox'  — native Supercluster (cluster: true on the GeoJSON source)
//   2. 'mst'     — Kruskal Minimum Spanning Tree network lines (no orphans)
//   3. 'network' — Nearest-neighbor shard/gem effect (denser visual)
//
// PORT NOTES:
//   - Algorithm code (Kruskal, nearest-neighbor) ported from FARFAST3-ETHNOGRAPHIC.
//   - Pinia/inject wiring pattern adopted from doxa-simple-map-component, but
//     adapted to the Map-Framework convention which uses provide('mapStore', …)
//     in ProfileLoader.vue (NOT a `stores` umbrella). We `inject('mapStore')`
//     synchronously in setup so multi-instance Pinia stays isolated.
//   - The composable never imports stores directly — keeps each <doxa-map>
//     web-component embed isolated from sibling embeds on the same page.
//
// COMPANION DOCS:
//   - docs/mapbox/clustering.md      — three-mode convention reference
//   - docs/composables/map-clustering.md — composable contract

import { ref, computed, inject } from 'vue';

import MSTClusteringUtil from '../utils/MSTClusteringUtil.js';
import NetworkClusteringUtil from '../utils/NetworkClusteringUtil.js';
import {
    groupBy,
    DEFAULT_MAPBOX_CLUSTER_OPTIONS,
    DEFAULT_CLUSTER_COLOR_RAMP,
    DEFAULT_CLUSTER_RADIUS_RAMP
} from '../utils/ClusterHelpers.js';

/**
 * @typedef {'mapbox' | 'mst' | 'network'} ClusteringMode
 */

/**
 * @typedef {Object} UseMapClusteringOptions
 * @property {() => mapboxgl.Map|null} [getMap]               - Returns the live Mapbox map
 * @property {string}                  [mapId]                - Logging tag
 * @property {() => Array<Object>}     [getPeopleGroups]      - Returns the active dataset
 * @property {string}                  [pinSourceId]          - Source ID of the pins layer (default: 'language-families')
 * @property {string}                  [pinLayerId]           - Layer ID of the pins layer (default: 'language-family-pins')
 * @property {string}                  [groupKey]             - Property to group by for MST/network (default: 'languageFamily')
 * @property {(name: string) => string} [getGroupColor]       - Color resolver per group name
 * @property {Object}                  [mapboxClusterOptions] - Overrides for source clustering options
 */

/**
 * @typedef {Object} UseMapClusteringApi
 * @property {import('vue').ComputedRef<boolean>}        enabled
 * @property {import('vue').ComputedRef<ClusteringMode>} mode
 * @property {import('vue').Ref<Array<Object>>}          clusterLines
 * @property {(next: ClusteringMode) => void}            setMode
 * @property {(on: boolean) => void}                     setEnabled
 * @property {(handler: ((evt: Object) => void)|null) => void} onClusterClick
 * @property {() => void}                                applyClustering
 * @property {() => void}                                clearClustering
 * @property {() => void}                                cleanup
 * @property {MSTClusteringUtil}                         mstUtil
 * @property {NetworkClusteringUtil}                     networkUtil
 */

// Internal layer/source IDs owned by this composable. Kept distinct from the
// host pin layer so we can toggle without disturbing the underlying source.
const CLUSTER_LINES_SOURCE = 'cluster-lines-source';
const CLUSTER_LINES_LAYER  = 'cluster-lines';
const MAPBOX_CLUSTER_SOURCE = 'mapbox-clusters';
const MAPBOX_CLUSTER_CIRCLE = 'mapbox-clusters-circle';
const MAPBOX_CLUSTER_COUNT  = 'mapbox-clusters-count';

/**
 * Map clustering composable — supports three clustering modes with a single
 * unified API.
 *
 * @param {UseMapClusteringOptions} [options]
 * @returns {UseMapClusteringApi}
 */
export function useMapClustering(options = {}) {
    const {
        getMap = () => null,
        mapId = 'unknown',
        getPeopleGroups = () => [],
        pinSourceId = 'language-families',
        pinLayerId = 'language-family-pins',
        groupKey = 'languageFamily',
        getGroupColor = null,
        mapboxClusterOptions = {}
    } = options;

    // ── Inject Pinia store synchronously — DO NOT import directly ──────────
    // ProfileLoader.vue uses provide('mapStore', useMapStore()) so each
    // <doxa-map> instance gets its own store. Direct `useMapStore()` here
    // would resolve to the wrong (or undefined) Pinia when this composable
    // is invoked outside the active app instance.
    const mapStore = inject('mapStore', null);

    // Algorithm utilities — instantiated once per composable.
    const mstUtil = new MSTClusteringUtil({ maxConnectionDistance: Infinity });
    const networkUtil = new NetworkClusteringUtil({
        maxDistance: 15,
        maxNeighbors: 15,
        sortKey: 'longitude'
    });

    // Local fallback state for environments without a mapStore.
    const _enabledLocal = ref(false);
    const _modeLocal = /** @type {import('vue').Ref<ClusteringMode>} */ (ref('mapbox'));

    /**
     * Whether clustering is currently enabled. Reads from `mapStore.clusteringEnabled`
     * if present, else falls back to local ref.
     */
    const enabled = computed(() => {
        if (mapStore && 'clusteringEnabled' in mapStore) return !!mapStore.clusteringEnabled;
        return _enabledLocal.value;
    });

    /**
     * Active clustering mode. Reads from `mapStore.clusteringMode` if present,
     * else falls back to local ref. Defaults to `'mapbox'`.
     */
    const mode = computed(() => {
        if (mapStore && mapStore.clusteringMode) return /** @type {ClusteringMode} */ (mapStore.clusteringMode);
        return _modeLocal.value;
    });

    /** Last computed cluster lines (MST or network). Empty for 'mapbox' mode. */
    const clusterLines = ref([]);

    /** Click handler registered via `onClusterClick`. */
    let _clusterClickHandler = null;
    let _attachedClusterLayerId = null;

    // ─────────────────────────────────────────────────────────────────────────
    // Mode + enabled setters — wire through to mapStore when available.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Set the active clustering mode. Updates mapStore and re-applies the
     * current clustering pass if enabled.
     *
     * @param {ClusteringMode} next
     */
    function setMode(next) {
        const allowed = ['mapbox', 'mst', 'network'];
        if (!allowed.includes(next)) {
            console.warn(`[${mapId}] useMapClustering.setMode: unknown mode "${next}". Allowed: ${allowed.join(', ')}`);
            return;
        }

        if (mapStore && typeof mapStore.setClusteringMode === 'function') {
            mapStore.setClusteringMode(next);
        } else if (mapStore && 'clusteringMode' in mapStore) {
            mapStore.clusteringMode = next;
        } else {
            _modeLocal.value = next;
        }

        if (enabled.value) {
            // Tear down old mode before applying new — prevents pin double-render
            // and orphan layers from previous mode lingering.
            clearClustering();
            applyClustering();
        }
    }

    /**
     * Toggle clustering on/off. Updates mapStore and applies/clears layers.
     *
     * @param {boolean} on
     */
    function setEnabled(on) {
        const next = !!on;

        if (mapStore && typeof mapStore.setClusteringEnabled === 'function') {
            mapStore.setClusteringEnabled(next);
        } else if (mapStore && 'clusteringEnabled' in mapStore) {
            mapStore.clusteringEnabled = next;
        } else {
            _enabledLocal.value = next;
        }

        if (next) applyClustering();
        else clearClustering();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Click handler registration
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Register a handler invoked when a cluster (mapbox-mode bubble) is
     * clicked. Pass `null` to detach.
     *
     * The default handler — when `null` is passed and clusters become active —
     * zooms the map to `cluster_expansion_zoom`. To override this behavior,
     * register your own handler.
     *
     * @param {((evt: { clusterId: number, coordinates: [number, number], pointCount: number, originalEvent: Object }) => void)|null} handler
     */
    function onClusterClick(handler) {
        _clusterClickHandler = handler;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Apply / clear pipeline
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Apply the currently selected clustering mode to the map. Idempotent
     * within a mode — safe to call multiple times.
     */
    function applyClustering() {
        const map = getMap();
        if (!map) return;

        // Always tear down whichever mode was active before re-applying. This
        // is the fix for the "pin double-rendering on toggle" pitfall — leaving
        // the cluster source attached while switching modes leaves stale layers.
        clearClustering();

        switch (mode.value) {
            case 'mapbox':
                _applyMapboxClustering(map);
                break;
            case 'mst':
                _applyLineClustering(map, 'mst');
                break;
            case 'network':
                _applyLineClustering(map, 'network');
                break;
            default:
                console.warn(`[${mapId}] Unknown clustering mode: ${mode.value}`);
        }

        // Dim base pins when clustering is active so the cluster takes visual
        // precedence. The host can override this paint property if it wants
        // a different dimming rule.
        _setPinDimming(map, true);
    }

    /**
     * Remove all clustering layers/sources and reset pin opacity. Idempotent.
     */
    function clearClustering() {
        const map = getMap();
        if (!map) return;

        // Mapbox-native cluster artefacts
        if (map.getLayer(MAPBOX_CLUSTER_COUNT)) map.removeLayer(MAPBOX_CLUSTER_COUNT);
        if (map.getLayer(MAPBOX_CLUSTER_CIRCLE)) map.removeLayer(MAPBOX_CLUSTER_CIRCLE);
        if (map.getSource(MAPBOX_CLUSTER_SOURCE)) map.removeSource(MAPBOX_CLUSTER_SOURCE);

        // MST/network line artefacts
        if (map.getLayer(CLUSTER_LINES_LAYER)) map.removeLayer(CLUSTER_LINES_LAYER);
        if (map.getSource(CLUSTER_LINES_SOURCE)) map.removeSource(CLUSTER_LINES_SOURCE);

        clusterLines.value = [];

        // Detach mapbox-mode click handler if present
        _detachClusterClickHandler(map);

        // Restore pin opacity
        _setPinDimming(map, false);
    }

    /**
     * Cleanup hook — call this from the host's `onBeforeUnmount`.
     */
    function cleanup() {
        clearClustering();
        _clusterClickHandler = null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mode implementations
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Native Mapbox clustering — adds a parallel clustered source and three
     * layers (cluster circles, cluster counts, individual pins handled by
     * the host pin layer being dimmed but still rendered).
     *
     * Why a parallel source? The host pin source is shared with other layers
     * that don't want clustering. Adding a second source with `cluster: true`
     * keeps responsibilities separated.
     *
     * @param {Object} map
     * @private
     */
    function _applyMapboxClustering(map) {
        const peopleGroups = getPeopleGroups();
        if (!peopleGroups.length) return;

        const features = peopleGroups
            .map(pg => {
                const lng = parseFloat(pg.longitude ?? pg.lng);
                const lat = parseFloat(pg.latitude ?? pg.lat);
                if (isNaN(lng) || isNaN(lat)) return null;
                return {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [lng, lat] },
                    properties: { ...(pg.properties || pg) }
                };
            })
            .filter(Boolean);

        const sourceConfig = {
            type: 'geojson',
            data: { type: 'FeatureCollection', features },
            ...DEFAULT_MAPBOX_CLUSTER_OPTIONS,
            ...mapboxClusterOptions
        };

        map.addSource(MAPBOX_CLUSTER_SOURCE, sourceConfig);

        map.addLayer({
            id: MAPBOX_CLUSTER_CIRCLE,
            type: 'circle',
            source: MAPBOX_CLUSTER_SOURCE,
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': DEFAULT_CLUSTER_COLOR_RAMP,
                'circle-radius': DEFAULT_CLUSTER_RADIUS_RAMP,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.85
            }
        });

        map.addLayer({
            id: MAPBOX_CLUSTER_COUNT,
            type: 'symbol',
            source: MAPBOX_CLUSTER_SOURCE,
            filter: ['has', 'point_count'],
            layout: {
                'text-field': ['get', 'point_count_abbreviated'],
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12
            },
            paint: { 'text-color': '#000000' }
        });

        _attachClusterClickHandler(map);
        console.log(`[${mapId}] Clustering: mapbox-native applied (${features.length} features)`);
    }

    /**
     * MST or network line clustering — adds a single GeoJSON line source +
     * line layer below the host pins.
     *
     * @param {Object} map
     * @param {'mst'|'network'} algorithm
     * @private
     */
    function _applyLineClustering(map, algorithm) {
        const peopleGroups = getPeopleGroups();
        if (!peopleGroups.length) return;

        const groups = groupBy(
            peopleGroups,
            pg => pg[groupKey] ?? pg._normalized?.[groupKey] ?? 'Unknown'
        );

        const colorFunc = typeof getGroupColor === 'function'
            ? getGroupColor
            : (() => '#666666');

        let lines = [];
        let stats = null;

        if (algorithm === 'mst') {
            lines = mstUtil.generateAllMSTLines(groups, colorFunc);
            stats = mstUtil.getMSTStats(groups);
        } else {
            lines = networkUtil.generateAllNetworkLines(groups, colorFunc);
            stats = networkUtil.getClusteringStats(groups);
        }

        clusterLines.value = lines;
        if (lines.length === 0) return;

        map.addSource(CLUSTER_LINES_SOURCE, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: lines }
        });

        const layerConfig = {
            id: CLUSTER_LINES_LAYER,
            type: 'line',
            source: CLUSTER_LINES_SOURCE,
            paint: {
                'line-color': ['coalesce', ['get', 'color'], '#666666'],
                'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    0, 0.5, 4, 0.75, 8, 1, 12, 1.5
                ],
                'line-opacity': 0.5
            },
            layout: {
                'line-cap': 'round',
                'line-join': 'round'
            }
        };

        // Insert below the host pin layer so pins stay clickable on top.
        if (map.getLayer(pinLayerId)) {
            map.addLayer(layerConfig, pinLayerId);
        } else {
            map.addLayer(layerConfig);
        }

        console.log(
            `[${mapId}] Clustering: ${algorithm} applied — ` +
            `${lines.length} lines across ${stats?.totalGroups ?? 0} groups`
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Mapbox-native cluster click — zoom to expansion zoom by default
    // ─────────────────────────────────────────────────────────────────────────

    function _attachClusterClickHandler(map) {
        if (!map.getLayer(MAPBOX_CLUSTER_CIRCLE)) return;

        map.on('click', MAPBOX_CLUSTER_CIRCLE, _handleClusterClick);
        map.on('mouseenter', MAPBOX_CLUSTER_CIRCLE, _setCursorPointer);
        map.on('mouseleave', MAPBOX_CLUSTER_CIRCLE, _setCursorDefault);
        _attachedClusterLayerId = MAPBOX_CLUSTER_CIRCLE;
    }

    function _detachClusterClickHandler(map) {
        if (!_attachedClusterLayerId) return;
        const layerId = _attachedClusterLayerId;
        try {
            map.off('click', layerId, _handleClusterClick);
            map.off('mouseenter', layerId, _setCursorPointer);
            map.off('mouseleave', layerId, _setCursorDefault);
        } catch (_e) {
            // Safe to swallow — Mapbox throws if the layer is already gone
        }
        _attachedClusterLayerId = null;
    }

    function _handleClusterClick(e) {
        const map = getMap();
        if (!map) return;

        const features = map.queryRenderedFeatures(e.point, { layers: [MAPBOX_CLUSTER_CIRCLE] });
        if (!features.length) return;

        const feature = features[0];
        const clusterId = feature.properties.cluster_id;
        const coordinates = feature.geometry.coordinates;
        const pointCount = feature.properties.point_count;

        // Custom handler takes precedence — let the host decide what to do.
        if (typeof _clusterClickHandler === 'function') {
            _clusterClickHandler({
                clusterId,
                coordinates,
                pointCount,
                originalEvent: e
            });
            return;
        }

        // Default behavior — zoom to cluster expansion zoom.
        const source = map.getSource(MAPBOX_CLUSTER_SOURCE);
        if (!source || typeof source.getClusterExpansionZoom !== 'function') return;

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.easeTo({ center: coordinates, zoom });
        });
    }

    function _setCursorPointer() {
        const map = getMap();
        if (map) map.getCanvas().style.cursor = 'pointer';
    }

    function _setCursorDefault() {
        const map = getMap();
        if (map) map.getCanvas().style.cursor = '';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Pin opacity dimming
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Dim the host pin layer when clustering is active so clusters take
     * visual precedence. Restores opacity 0.9 when clustering is off.
     *
     * Safe no-op when the host pin layer hasn't been added yet.
     *
     * @param {Object}  map
     * @param {boolean} dim
     * @private
     */
    function _setPinDimming(map, dim) {
        if (!map.getLayer(pinLayerId)) return;
        try {
            map.setPaintProperty(pinLayerId, 'circle-opacity', dim ? 0.25 : 0.9);
        } catch (_e) {
            // Layer may have been removed mid-toggle — safe to swallow
        }
    }

    return {
        // State
        enabled,
        mode,
        clusterLines,

        // Setters
        setMode,
        setEnabled,

        // Click handler registration
        onClusterClick,

        // Lifecycle
        applyClustering,
        clearClustering,
        cleanup,

        // Algorithm utilities (exposed for testing / advanced use)
        mstUtil,
        networkUtil
    };
}

export default useMapClustering;
