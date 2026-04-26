// useSelectedPin.js - Selected Pin Highlight + Animated GO Marker
// When a people group is selected, turns the dot mandarin neon orange and
// floats an animated "GO" location pin above it with a pulsing light glow.
//
// Migrated from doxa-simple-map-component/src/composables/useSelectedPin.js

import { watch, inject } from 'vue';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const GO_ORANGE          = '#FF6600';   // Mandarin neon orange
const HIGHLIGHT_LAYER_ID = 'selected-pin-highlight';

/**
 * Create the custom HTML element for the "GO" map pin marker.
 * Self-contained inline <style> so it works inside Mapbox's marker DOM.
 */
function createGoMarkerElement() {
    const el = document.createElement('div');
    el.className = 'doxa-go-pin-wrapper';

    el.innerHTML = `
<style>
/* Wrapper is sized to match the visible SVG pin exactly (34 x 43).
   Previously the wrapper was 60px tall with flex bottom-alignment, which
   caused Mapbox's anchor:'bottom' to anchor 17px below the pin tip —
   making the marker render slightly off-center from the selected lat/lng
   when zoomed in. Sizing wrapper=pin eliminates the anchor mismatch. */
.doxa-go-pin-wrapper {
  position: relative;
  width: 34px;
  height: 43px;
  pointer-events: none;
  overflow: visible;
}
.doxa-go-pin__glow-ambient {
  position: absolute;
  /* Center the ambient glow on the pin's visual base (bottom 1/3). */
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 102, 0, 0.22) 0%,
    rgba(255, 102, 0, 0.07) 55%,
    rgba(255, 102, 0, 0.00) 75%
  );
  animation: goHaze 2.6s ease-in-out infinite;
  pointer-events: none;
}
.doxa-go-pin__svg {
  position: relative;
  z-index: 2;
  width: 34px;
  height: 43px;
  filter: drop-shadow(0 0 3px rgba(255, 102, 0, 0.55));
  animation: goPinShimmer 2.6s ease-in-out infinite;
}
@keyframes goHaze {
  0%, 100% { opacity: 0.50; transform: translateX(-50%) scale(1.00); }
  50%       { opacity: 0.90; transform: translateX(-50%) scale(1.12); }
}
@keyframes goPinShimmer {
  0%, 100% { filter: drop-shadow(0 0 2px rgba(255, 102, 0, 0.45)); }
  50%       { filter: drop-shadow(0 0 6px rgba(255, 120, 0, 0.80)); }
}
</style>

<div class="doxa-go-pin__glow-ambient"></div>

<svg
  class="doxa-go-pin__svg"
  viewBox="0 0 28 36"
  xmlns="http://www.w3.org/2000/svg"
  aria-label="GO - Unreached People Group"
>
  <path
    d="M14 1 C6.8 1 1 6.8 1 14 C1 24 14 35 14 35 C14 35 27 24 27 14 C27 6.8 21.2 1 14 1 Z"
    fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"
  />
  <path
    d="M14 1 C6.8 1 1 6.8 1 14 C1 24 14 35 14 35 C14 35 27 24 27 14 C27 6.8 21.2 1 14 1 Z"
    fill="${GO_ORANGE}"
  />
  <circle cx="14" cy="14" r="8" fill="rgba(0,0,0,0.15)" />
  <text
    x="14" y="18"
    font-family="Arial Black, Arial, sans-serif"
    font-size="8" font-weight="900"
    text-anchor="middle" fill="white" letter-spacing="0.8"
  >GO</text>
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
