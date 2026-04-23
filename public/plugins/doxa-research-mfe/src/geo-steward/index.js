/**
 * geo-steward — barrel exports for the Vue 3 component library extracted
 * from dt-geo-steward / vue-geo-steward.
 *
 * Layout:
 *   components/  — Vue 3 components (script setup)
 *   composables/ — Vue 3 composables (no markup)
 *   classes/     — Plain ES6 classes (no Vue)
 *   config/      — Default config objects, override per-profile
 */

// Components
export { default as CardFlip            } from './components/CardFlip.vue';
export { default as CardStack           } from './components/CardStack.vue';
export { default as WorkflowHeader      } from './components/WorkflowHeader.vue';
export { default as WorkflowFooter      } from './components/WorkflowFooter.vue';
export { default as PolygonList         } from './components/PolygonList.vue';
export { default as TilesetStatus       } from './components/TilesetStatus.vue';
export { default as PrintDialog         } from './components/PrintDialog.vue';
export { default as ExportGeoJsonButton } from './components/ExportGeoJsonButton.vue';
export { default as ImportGeoJsonButton } from './components/ImportGeoJsonButton.vue';

// Components — newly ported from vue-geo-steward (2026-04-21)
export { default as AppShell            } from './components/AppShell.vue';
export { default as SideMenu            } from './components/SideMenu.vue';
export { default as SubMenuPanel        } from './components/SubMenuPanel.vue';
export { default as MapboxCanvas        } from './components/MapboxCanvas.vue';
export { default as MapToolbarButton    } from './components/MapToolbarButton.vue';
export { default as PolygonDrawButton   } from './components/PolygonDrawButton.vue';
export { default as RgbToggleButton     } from './components/RgbToggleButton.vue';
export { default as LayersMenuButton    } from './components/LayersMenuButton.vue';
export { default as MapGeocoder         } from './components/MapGeocoder.vue';
export { default as TilesetPopup        } from './components/TilesetPopup.vue';
export { default as LoadingOverlay      } from './components/LoadingOverlay.vue';
export { default as P2PDropdown         } from './components/P2PDropdown.vue';
export { default as ScanUploader        } from './components/ScanUploader.vue';
export { default as AcceptanceDialog    } from './components/AcceptanceDialog.vue';
export { default as SettingsPanel       } from './components/SettingsPanel.vue';

// Composables
export { useCardFlip         } from './composables/useCardFlip.js';
export { useWorkflow         } from './composables/useWorkflow.js';
export { useBatchRunner      } from './composables/useBatchRunner.js';
export { useMapCapture       } from './composables/useMapCapture.js';
export { usePolygonWorkflow  } from './composables/usePolygonWorkflow.js';
export { useGeoJsonIO        } from './composables/useGeoJsonIO.js';
export { useMapboxStylesAPI  } from './composables/useMapboxStylesAPI.js';
export { useTilesetManager   } from './composables/useTilesetManager.js';
export { usePrintDialog      } from './composables/usePrintDialog.js';

// Classes (re-export for convenience; consumers can also import directly)
export { default as SvgCanvas         } from './classes/SvgCanvas.js';
export { default as SvgShape          } from './classes/SvgShape.js';
export { default as SvgPolygon        } from './classes/SvgPolygon.js';
export { default as SvgCircle         } from './classes/SvgCircle.js';
export { default as SvgPath           } from './classes/SvgPath.js';
export { default as SvgText           } from './classes/SvgText.js';
export { default as SvgGroup          } from './classes/SvgGroup.js';
export { default as SvgExporter       } from './classes/SvgExporter.js';
export { default as SvgLabelPlacer    } from './classes/SvgLabelPlacer.js';
export { default as SvgLegendRenderer } from './classes/SvgLegendRenderer.js';

// Config
export { POLYGON_WORKFLOW_STEPS, TILESET_WORKFLOW_STEPS } from './config/workflow-steps.js';
export { PRINT_DEFAULTS  } from './config/print-defaults.js';
export { SVG_DEFAULTS    } from './config/svg-defaults.js';
export { EXPORT_FORMATS  } from './config/export-formats.js';
