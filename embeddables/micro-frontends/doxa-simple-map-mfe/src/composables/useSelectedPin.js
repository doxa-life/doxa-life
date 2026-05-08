// useSelectedPin.js - Selected Pin Highlight + Animated GO Marker
// When a people group is selected, turns the dot mandarin neon orange and
// floats an animated "GO" location pin above it with a pulsing light glow.
//
// Migrated from doxa-simple-map-component/src/composables/useSelectedPin.js

import { watch, inject } from 'vue';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
// Simple black pin replaces the previous orange "GO" marker per user
// feedback (qa: 2026-05-04 — "just want a simple black indicator pen
// for which people group you have selected"). Constant name kept for
// minimal diff against the rest of the file's references.
const GO_ORANGE          = '#1a1a1a';   // Black indicator (was '#FF6600')
const HIGHLIGHT_LAYER_ID = 'selected-pin-highlight';

/**
 * Create the custom HTML element for the "GO" map pin marker.
 * Self-contained inline <style> so it works inside Mapbox's marker DOM.
 */
function createGoMarkerElement(color = GO_ORANGE) {
    const el = document.createElement('div');
    el.className = 'doxa-go-pin-wrapper';
    const gradId = `pinGrad-${Math.random().toString(36).slice(2, 8)}`;

    el.innerHTML = `
<style>
/* Angled, brush-style pin (qa: 2026-05-06 user feedback — wanted a more
   hand-drawn / painterly feel like the reference image they shared).
   Slight tilt + diagonal gradient + a stronger drop-shadow gives the pin
   a "set down on the map" look without rendering raster art. */
.doxa-go-pin-wrapper {
  position: relative;
  width: 32px;
  height: 40px;
  pointer-events: none;
  overflow: visible;
}
.doxa-go-pin__svg {
  position: relative;
  width: 32px;
  height: 40px;
  filter: drop-shadow(2px 4px 3px rgba(0,0,0,0.4));
}
</style>

<svg
  class="doxa-go-pin__svg"
  viewBox="-2 -2 32 40"
  xmlns="http://www.w3.org/2000/svg"
  aria-label="Selected people group"
>
  <defs>
    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="${color}" stop-opacity="0.92"/>
      <stop offset="55%"  stop-color="${color}" stop-opacity="1"/>
      <stop offset="100%" stop-color="#000"     stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <g transform="rotate(-5 14 35)">
    <path
      d="M14 1 C6.8 1 1 6.8 1 14 C1 24 14 35 14 35 C14 35 27 24 27 14 C27 6.8 21.2 1 14 1 Z"
      fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"
    />
    <path
      d="M14 1 C6.8 1 1 6.8 1 14 C1 24 14 35 14 35 C14 35 27 24 27 14 C27 6.8 21.2 1 14 1 Z"
      fill="url(#${gradId})"
    />
  </g>
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

    // Dynamic pin color (qa: 2026-05-06 — pin matches the active tab's
    // dot color so a click on a green dot shows a green pin, red shows red,
    // etc.). Falls back to the literal GO_ORANGE constant if the parent
    // profile didn't provide a resolver.
    const getActivePinColor = inject("getActivePinColor", null);
    let _currentColor = GO_ORANGE;
    let _builtForColor = null;

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
                'circle-color'         : _currentColor,
                'circle-opacity'       : 1,
                'circle-stroke-width'  : 2,
                'circle-stroke-color'  : '#FFFFFF',
                'circle-stroke-opacity': 1
            },
            filter: ['==', ['get', 'uniqueId'], '__none__']
        });

    }

    function _ensureMarkerEl() {
        if (!_markerEl || _builtForColor !== _currentColor) {
            _markerEl = createGoMarkerElement(_currentColor);
            _builtForColor = _currentColor;
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

        // Resolve the pin color from the active tab strategy each call.
        // When the user switches tabs and re-selects, color follows the dot.
        const newColor = getActivePinColor?.(feature?.properties) ?? GO_ORANGE;
        if (newColor !== _currentColor) {
            _currentColor = newColor;
            if (map.getLayer(HIGHLIGHT_LAYER_ID)) {
                map.setPaintProperty(HIGHLIGHT_LAYER_ID, "circle-color", _currentColor);
            }
        }
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
