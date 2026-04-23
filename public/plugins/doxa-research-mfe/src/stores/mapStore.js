/**
 * mapStore.js — Per-instance map state
 *
 * Keyed by mapId. Safe for multiple map instances on the same page.
 * Each <doxa-map> web component gets its own Pinia instance (created in entry.js),
 * so there is no cross-instance state bleed.
 */

import { defineStore } from 'pinia'
import { markRaw } from 'vue'

export const useMapStore = defineStore('map', {
  state: () => ({
    /**
     * Registry of active map instances.
     * Key: mapId (string)
     * Value: { instance, isReady, zoom, center }
     */
    maps: {},

    /** Currently focused map ID */
    activeMapId: null,

    /** Currently selected feature (any type) */
    selectedFeature: null
  }),

  actions: {
    /**
     * Register a new map instance.
     * Use markRaw() — the GL map object must NOT be made reactive.
     */
    registerMap(mapId, mapInstance) {
      this.maps[mapId] = {
        instance: markRaw(mapInstance),
        isReady: false,
        zoom: null,
        center: null
      }
    },

    setMapReady(mapId) {
      if (this.maps[mapId]) {
        this.maps[mapId].isReady = true
        this.activeMapId = mapId
      }
    },

    updateMapState(mapId, { zoom, center }) {
      if (this.maps[mapId]) {
        if (zoom !== undefined)   this.maps[mapId].zoom   = zoom
        if (center !== undefined) this.maps[mapId].center = center
      }
    },

    deregisterMap(mapId) {
      delete this.maps[mapId]
      if (this.activeMapId === mapId) this.activeMapId = null
    },

    selectFeature(feature) {
      this.selectedFeature = feature
    }
  },

  getters: {
    getMap: (state) => (mapId) => state.maps[mapId] ?? null,
    isReady: (state) => (mapId) => state.maps[mapId]?.isReady ?? false
  }
})
