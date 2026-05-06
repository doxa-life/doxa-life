// useSelectedPin.js - Selected Pin Highlight + Animated GO Marker
// When a people group is selected, turns the dot mandarin neon orange and
// floats an animated "GO" location pin above it with a pulsing light glow.
//
// Migrated from doxa-simple-map-component/src/composables/useSelectedPin.js

import { watch, inject } from 'vue';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const GO_ORANGE          = '#1a1a1a';   // Black indicator (was '#FF6600' — qa: 2026-05-06 user wants simple black/white pin)
const HIGHLIGHT_LAYER_ID = 'selected-pin-highlight';

/**
 * Create the custom HTML element for the "GO" map pin marker.
 * Self-contained inline <style> so it works inside Mapbox's marker DOM.
 */
function createGoMarkerElement() {
    const el = document.createElement("div");
    el.className = "doxa-go-pin-wrapper";

    el.innerHTML = `
<style>
/* Simple black pin: no glow halo, no shimmer animation, no "GO" text.
   Just a black teardrop with a white outline so it stays visible on any
   basemap (qa: 2026-05-06 — user wants a simple black/white indicator). */
.doxa-go-pin-wrapper {
  position: relative;
  width: 28px;
  height: 36px;
  pointer-events: none;
  overflow: visible;
}
.doxa-go-pin__svg {
  position: relative;
  width: 28px;
  height: 36px;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
}
</style>

<svg
  class="doxa-go-pin__svg"
  viewBox="0 0 28 36"
  xmlns="http://www.w3.org/2000/svg"
  aria-label="Selected people group"
>
  <path
    d="M14 1 C6.8 1 1 6.8 1 14 C1 24 14 35 14 35 C14 35 27 24 27 14 C27 6.8 21.2 1 14 1 Z"
    fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"
  />
  <path
    d="M14 1 C6.8 1 1 6.8 1 14 C1 24 14 35 14 35 C14 35 27 24 27 14 C27 6.8 21.2 1 14 1 Z"
    fill="${GO_ORANGE}"
  />
</svg>
`;

    return el;
}

/**
 * useSelectedPin composable
 *
 * @param {Object}   options
 * @param {Function} options.getMap  - Returns the mapboxgl.Map instance (or null)
 */
export function useSelectedPin(options = {}) {
    const { getMap = () => null } = options;
    const uiStore = inject('uiStore');

    let _markerEl  = null;
    let _marker    = null;

    function _addHighlightLayer() {
        const map = getMap();
        if (!map) return;
        if (map.getLayer(HIGHLIGHT_LAYER_ID)) return;
        if (!map.getSource('language-families')) return;

        map.addLayer({
            id: HIGHLIGHT_LAYER_ID,
            type: 'circle',
            source: 'language-families',
            paint: {
                'circle-radius': [
                    'interpolate', ['linear'], ['zoom'],
                    0, 3, 2, 3.5, 4, 4, 5, 5, 6, 6.5, 7, 8, 8, 10, 10, 14, 12, 18, 14, 22
                ],
                'circle-color'         : GO_ORANGE,
                'circle-opacity'       : 1,
                'circle-stroke-width'  : 2,
                'circle-stroke-color'  : '#FFFFFF',
                'circle-stroke-opacity': 1
            },
            filter: ['==', ['get', 'uniqueId'], '__none__']
        });

    }

    function _ensureMarkerEl() {
        if (!_markerEl) {
            _markerEl = createGoMarkerElement();
        }
    }

    function _showMarker(lng, lat) {
        const map = getMap();
        if (!map) return;

        _ensureMarkerEl();

        if (_marker) {
            _marker.remove();
        }

        // anchor:'bottom' pins the marker's bottom edge to the lat/lng.
        // After the wrapper resize to match the SVG (43px), the bottom edge
        // IS the pin's tip — no offset compensation needed.
        _marker = new mapboxgl.Marker({
            element : _markerEl,
            anchor  : 'bottom',
            offset  : [0, 0]
        })
            .setLngLat([lng, lat])
            .addTo(map);
    }

    function _hideMarker() {
        if (_marker) {
            _marker.remove();
            _marker = null;
        }
    }

    function updateSelectedPin(feature) {
        const map = getMap();
        if (!map) return;

        _addHighlightLayer();

        if (!feature) {
            if (map.getLayer(HIGHLIGHT_LAYER_ID)) {
                map.setFilter(HIGHLIGHT_LAYER_ID, ['==', ['get', 'uniqueId'], '__none__']);
            }
            _hideMarker();
            return;
        }

        const uniqueId = feature.properties?.uniqueId || '__none__';
        const coords   = feature.geometry?.coordinates;

        if (!coords) {
            return;
        }

        if (map.getLayer(HIGHLIGHT_LAYER_ID)) {
            map.setFilter(HIGHLIGHT_LAYER_ID, ['==', ['get', 'uniqueId'], uniqueId]);
        }

        const [lng, lat] = coords;
        _showMarker(lng, lat);

    }

    watch(
        () => uiStore.selectedPeopleGroup,
        (newFeature) => {
            updateSelectedPin(newFeature);
        }
    );

    function initialize() {
        _addHighlightLayer();
    }

    function cleanup() {
        _hideMarker();
        _markerEl = null;
    }

    return { initialize, cleanup, updateSelectedPin };
}
