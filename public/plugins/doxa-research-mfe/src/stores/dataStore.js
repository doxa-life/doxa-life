/**
 * dataStore.js — Centralized data cache
 *
 * All data fetching goes through here — no direct fetch() inside components.
 * markRaw() is REQUIRED on all large datasets to prevent Vue proxy wrapping.
 */

import { defineStore } from 'pinia'
import { markRaw } from 'vue'

export const useDataStore = defineStore('data', {
  state: () => ({
    /**
     * Cached data per source.
     * Key: sourceId (string)
     * Value: { features, rawData, timestamp }
     */
    sources: {},

    /**
     * Loading state per source.
     * Key: sourceId
     * Value: { isLoading, error }
     */
    loadingStates: {}
  }),

  actions: {
    /**
     * Load data for a sourceId.
     * fetchFn: async () => data — caller provides the fetch logic.
     * Data is marked raw to avoid Vue proxy overhead on large arrays.
     */
    async load(sourceId, fetchFn) {
      if (this.sources[sourceId]) return  // already cached

      this.loadingStates[sourceId] = { isLoading: true, error: null }

      try {
        const data = await fetchFn()
        // markRaw: large datasets (GeoJSON features, CSV rows) must NOT be reactive
        this.sources[sourceId] = markRaw({
          features: data,
          timestamp: Date.now()
        })
        this.loadingStates[sourceId] = { isLoading: false, error: null }
      } catch (err) {
        console.error(`[dataStore] Failed to load source "${sourceId}":`, err)
        this.loadingStates[sourceId] = { isLoading: false, error: err }
      }
    },

    clearSource(sourceId) {
      delete this.sources[sourceId]
      delete this.loadingStates[sourceId]
    }
  },

  getters: {
    getData:    (state) => (sourceId) => state.sources[sourceId]?.features ?? null,
    isLoading:  (state) => (sourceId) => state.loadingStates[sourceId]?.isLoading ?? false,
    getError:   (state) => (sourceId) => state.loadingStates[sourceId]?.error ?? null
  }
})
