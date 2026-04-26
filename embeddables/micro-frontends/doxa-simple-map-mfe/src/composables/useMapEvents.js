// useMapEvents.js - Map Event Handlers Composable
// Handles click handlers, popups, cursor changes, and hover effects
// Vue 3 Composition API - ES Module with NPM packages
// 
// QA Reference: Round 1 Q4 - Composable decomposition (Task 3.9)
// Design Flaw Fix: Extracts event handling from MapComponent (~200 lines)
//
// REFACTORED: Now uses NPM Vue package instead of vendored libs

// Import Vue functions from NPM package
import { ref, inject } from 'vue';

/**
 * useMapEvents composable - manages Mapbox layer event handlers
 * 
 * Extracted from MapComponent.js:
 * - Click handlers for language-family-pins, regions-fill, clusters
 * - Popup creation for pins and regions
 * - Cursor change on mouseenter/mouseleave
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.getMap - Function that returns the map instance
 * @param {string} options.mapId - Unique map identifier for logging
 * @param {Function} options.getLanguageFamilyColor - Color lookup function for language families
 * 
 * @returns {Object} Event management functions
 */
export function useMapEvents(options = {}) {
    const {
        getMap = () => null,
        mapId = 'unknown',
        getLanguageFamilyColor = () => '#999999'
    } = options;
    
    // ── CRITICAL: capture store reference NOW, during Vue setup context ──────
    // inject('uiStore') resolves to THIS <doxa-map> instance's Pinia store,
    // provided by ProfileLoader.vue which runs inside the correct Vue app.
    // Using inject() here (synchronously during setup) guarantees isolation
    // when multiple <doxa-map> elements share a page.
    const uiStore = inject('uiStore');
    
    // Track registered event handlers for cleanup
    const registeredHandlers = ref([]);
    
    /**
     * Generate popup content for a people group pin
     * @param {Object} properties - Feature properties
     * @returns {string} HTML content
     */
    function generatePinPopupContent(properties) {
        const familyColor = getLanguageFamilyColor(properties.languageFamily);
        
        // Get image URL - use imageUrl from data, fallback to placeholder
        // NOTE: joshuaproject.net photo URLs 404 — use peoplegroups.org placeholder instead
        const placeholderImage = "https://www.peoplegroups.org/images/pgphotosearch/NoImageAvailable_search.jpg";
        let imageUrl = properties.imageUrl;
        if (!imageUrl || imageUrl.includes('NoImageAvailable')) {
            imageUrl = placeholderImage;
        }
        
        // Generate avatar based on first letter
        const firstLetter = (properties.name || 'U')[0].toUpperCase();
        const avatarColors = [
            '#e74c3c', '#3498db', '#2ecc71', '#f39c12', 
            '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
        ];
        const colorIndex = firstLetter.charCodeAt(0) % avatarColors.length;
        const avatarColor = avatarColors[colorIndex];
        
        return `
            <div style="
                width: 300px;
                background: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            ">
                <!-- Header with Avatar and Name -->
                <div style="
                    display: flex;
                    align-items: center;
                    padding: 12px;
                    border-bottom: 1px solid #efefef;
                ">
                    <!-- Avatar -->
                    <div style="
                        width: 32px;
                        height: 32px;
                        border-radius: 4px;
                        background-color: ${avatarColor};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: 700;
                        font-size: 16px;
                        margin-right: 10px;
                        flex-shrink: 0;
                    ">
                        ${firstLetter}
                    </div>
                    
                    <!-- Name and Status -->
                    <div style="flex: 1; min-width: 0;">
                        <h3 style="
                            margin: 0;
                            font-size: 14px;
                            font-weight: 600;
                            color: #262626;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        ">${properties.name}</h3>
                        <p style="
                            margin: 2px 0 0 0;
                            font-size: 12px;
                            color: #8e8e8e;
                        ">${properties.country || 'Unknown'} • ${properties.status || 'Unknown Status'}</p>
                    </div>
                </div>
                
                <!-- Image -->
                <div style="
                    width: 100%;
                    height: 200px;
                    background-color: #fafafa;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                ">
                    <img 
                        src="${imageUrl}" 
                        alt="${properties.name}"
                        style="
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        "
                        onerror="this.onerror=null; this.src='${placeholderImage}'"
                    />
                </div>
                
                <!-- Info Section -->
                <div style="padding: 12px;">
                    <p style="margin: 0 0 6px 0; font-size: 13px;">
                        <strong>Language:</strong> ${properties.language || 'Unknown'}
                    </p>
                    <p style="margin: 0 0 6px 0; font-size: 13px;">
                        <strong>Family:</strong> 
                        <span style="background: ${familyColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                            ${properties.languageFamily || 'Unknown'}
                        </span>
                    </p>
                    ${properties.population ? `<p style="margin: 0 0 6px 0; font-size: 13px;"><strong>Population:</strong> ${properties.population}</p>` : ''}
                    ${properties.description ? `<p style="margin: 8px 0; font-size: 13px; color: #262626; line-height: 1.4;">${properties.description}</p>` : ''}
                    <a 
                        href="https://uupg.doxa.life/people-groups/${properties.rop3 || ''}" 
                        target="_blank"
                        style="
                            display: inline-block;
                            font-size: 13px;
                            color: #0095f6;
                            text-decoration: none;
                            font-weight: 600;
                            margin-top: 8px;
                        "
                    >Learn more →</a>
                </div>
            </div>
        `;
    }
    
    /**
     * Generate popup content for a region/country
     * @param {Object} properties - Feature properties
     * @returns {string} HTML content
     */
    function generateRegionPopupContent(properties) {
        return `
            <div style="padding: 8px; min-width: 220px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #333;">
                    ${properties.name}
                </h3>
                <p style="margin: 4px 0; font-size: 14px;">
                    <strong>Region:</strong> ${properties.region}
                </p>
                <p style="margin: 4px 0; font-size: 14px;">
                    <strong>Sub-Region:</strong> ${properties.subRegion}
                </p>
                <p style="margin: 4px 0; font-size: 14px;">
                    <strong>UUPG Count:</strong> ${properties.uupgCount || 0}
                </p>
                ${properties.hasWAGFMember ? 
                    '<p style="margin: 4px 0; font-size: 12px; color: #2ecc71;">✓ Has WAGF Member</p>' : 
                    ''
                }
            </div>
        `;
    }
    
    /**
     * Attach click handler for language family pins
     * Shows popup with people group details
     */
    function attachPinClickHandler() {
        const map = getMap();
        if (!map) return;
        
        const layerId = 'language-family-pins';
        if (!map.getLayer(layerId)) {
            return;
        }
        
        const handler = (e) => {
          try {
            const feature = e.features[0];
            const properties = feature.properties;
            const coordinates = feature.geometry.coordinates.slice();
            
            // Ensure popup appears even if wrapped coordinates
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }
            
            // Route pin click to legend (prayer mode) — show people group detail in side panel
            // uiStore was captured at setup time — safe to use inside this callback
            if (uiStore.legendMode !== undefined) {
                // Select people group → switches legend to detail mode on both mobile and desktop
                uiStore.selectPeopleGroup(feature);
                // On mobile: expand legend to 40% if currently collapsed
                if (uiStore.isMobile && uiStore.legendState === 'collapsed') {
                    uiStore.setLegendState('open');
                }
                // On desktop: if legend is collapsed, open it
                if (!uiStore.isMobile) {
                    // isCollapsed is local Vue ref in LegendComponent — signal via store instead
                    // We dispatch a custom event the desktop legend can listen to
                    window.dispatchEvent(new CustomEvent('doxa:openDesktopLegend', { detail: { mapId } }));
                }
                return; // Don't show popup — info is in the legend panel
            }
            
            // Fallback: show popup (for non-prayer legend types)
            new mapboxgl.Popup({
                maxWidth: '320px',
                className: 'people-group-popup'
            })
                .setLngLat(coordinates)
                .setHTML(generatePinPopupContent(properties))
                .addTo(map);
          } catch (err) {
            console.error(` [${mapId}] Pin click handler error:`, err);
          }
        };
        
        map.on('click', layerId, handler);
        registeredHandlers.value.push({ event: 'click', layer: layerId, handler });
    }
    
    /**
     * Attach click handler for regions layer
     * Shows popup with country/region details
     */
    function attachRegionClickHandler() {
        const map = getMap();
        if (!map) return;
        
        const layerId = 'regions-fill';
        if (!map.getLayer(layerId)) {
            return;
        }
        
        const handler = (e) => {
            // Check if we clicked on a people group pin - if so, don't show country popup
            const pinLayers = ['language-family-pins', 'people-groups-pins'];
            for (const pinLayer of pinLayers) {
                if (map.getLayer(pinLayer)) {
                    const pinFeatures = map.queryRenderedFeatures(e.point, { layers: [pinLayer] });
                    if (pinFeatures && pinFeatures.length > 0) {
                        // There's a pin at this location, don't show country popup
                        return;
                    }
                }
            }
            
            if (e.features && e.features.length > 0) {
                const properties = e.features[0].properties;
                
                new mapboxgl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(generateRegionPopupContent(properties))
                    .addTo(map);
            }
        };
        
        map.on('click', layerId, handler);
        registeredHandlers.value.push({ event: 'click', layer: layerId, handler });
    }
    
    /**
     * Attach click handler for cluster expansion
     */
    function attachClusterClickHandler() {
        const map = getMap();
        if (!map) return;
        
        const layerId = 'clusters';
        if (!map.getLayer(layerId)) {
            // Clusters layer may not exist - that's ok
            return;
        }
        
        const handler = (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
            if (!features.length) return;
            
            const clusterId = features[0].properties.cluster_id;
            const sourceId = features[0].source;
            
            map.getSource(sourceId).getClusterExpansionZoom(
                clusterId,
                (err, zoom) => {
                    if (err) return;
                    map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom: zoom
                    });
                }
            );
        };
        
        map.on('click', layerId, handler);
        registeredHandlers.value.push({ event: 'click', layer: layerId, handler });
    }
    
    /**
     * Attach cursor change handlers for a layer
     * @param {string} layerId - Layer ID
     */
    function attachCursorHandlers(layerId) {
        const map = getMap();
        if (!map || !map.getLayer(layerId)) return;
        
        const enterHandler = () => {
            map.getCanvas().style.cursor = 'pointer';
        };
        
        const leaveHandler = () => {
            map.getCanvas().style.cursor = '';
        };
        
        map.on('mouseenter', layerId, enterHandler);
        map.on('mouseleave', layerId, leaveHandler);
        
        registeredHandlers.value.push({ event: 'mouseenter', layer: layerId, handler: enterHandler });
        registeredHandlers.value.push({ event: 'mouseleave', layer: layerId, handler: leaveHandler });
    }
    
    /**
     * Attach all event handlers for language family layer
     * - Click for popup
     * - Cursor change on hover
     */
    function attachLanguageFamilyEvents() {
        attachPinClickHandler();
        attachCursorHandlers('language-family-pins');
        attachClusterClickHandler();
        attachCursorHandlers('clusters');
    }
    
    /**
     * Attach all event handlers for regions layer
     * - Click for popup
     * - Cursor change on hover
     */
    function attachRegionEvents() {
        attachRegionClickHandler();
        attachCursorHandlers('regions-fill');
    }
    
    /**
     * Attach all standard event handlers
     * Call this after layers are added
     */
    function attachAllEventHandlers() {
        const map = getMap();
        if (!map) {
            return;
        }
        
        // Language family pins (Tab 3 - Language Family map)
        if (map.getLayer('language-family-pins')) {
            attachLanguageFamilyEvents();
        }
        
        // Regions (Tab 1 - DOXA Regions map)
        if (map.getLayer('regions-fill')) {
            attachRegionEvents();
        }
        
        // People groups pins (Tab 2 - Affinity Blocs map - if different layer name)
        if (map.getLayer('people-groups-pins')) {
            attachPinClickHandler(); // Reuse same popup logic
            attachCursorHandlers('people-groups-pins');
        }
        
    }
    
    /**
     * Remove all registered event handlers
     * Call this on component unmount or when re-adding layers
     */
    function detachAllEventHandlers() {
        const map = getMap();
        if (!map) return;
        
        for (const { event, layer, handler } of registeredHandlers.value) {
            try {
                map.off(event, layer, handler);
            } catch (err) {
                // Layer might have been removed already
            }
        }
        
        registeredHandlers.value = [];
    }
    
    return {
        // Event attachment
        attachAllEventHandlers,
        attachLanguageFamilyEvents,
        attachRegionEvents,
        attachPinClickHandler,
        attachRegionClickHandler,
        attachClusterClickHandler,
        attachCursorHandlers,
        
        // Cleanup
        detachAllEventHandlers,
        
        // Popup content generators (for customization)
        generatePinPopupContent,
        generateRegionPopupContent,
        
        // State
        registeredHandlers
    };
}

// ES Module export

