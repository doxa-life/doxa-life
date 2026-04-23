/**
 * uiStore.js — UI state
 *
 * Owns: active tab, sidebar/legend open state, loading overlays, toast notifications.
 * Suite components read from here instead of managing their own open/close state.
 */

import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', {
  state: () => ({
    /** Currently active tab ID (for tab layout suites) */
    activeTab: null,

    /** Legend/sidebar collapsed */
    legendOpen: true,

    /** Global loading overlay */
    isLoading: false,
    loadingMessage: '',

    /** Toast notification queue */
    toasts: []
  }),

  actions: {
    setActiveTab(tabId) {
      this.activeTab = tabId
    },

    toggleLegend() {
      this.legendOpen = !this.legendOpen
    },

    setLoading(isLoading, message = '') {
      this.isLoading   = isLoading
      this.loadingMessage = message
    },

    toast(message, type = 'info', durationMs = 3000) {
      const id = Date.now()
      this.toasts.push({ id, message, type })
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id)
      }, durationMs)
    }
  }
})
