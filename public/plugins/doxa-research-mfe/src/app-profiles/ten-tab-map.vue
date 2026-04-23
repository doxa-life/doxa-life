<script setup>
/**
 * ten-tab-map.vue — Suite: 10-Tab Map
 *
 * 10 tabs, each tab loads one map with a distinct region and style.
 * Uses lazy-init (v-if via TabLayout) — only 1 GL context active at a time.
 *
 * WordPress usage:
 *   <doxa-map suite-config='{"suite":"ten-tab-map","tk":"pk.eyJ..."}'></doxa-map>
 */

import TabLayout from '../components/archive/TabLayout.vue'
import MapPanel  from '../components/archive/MapPanel.vue'
import { markRaw } from 'vue'

// markRaw: component references must not be made reactive
const MAP = markRaw(MapPanel)

const tabs = [
  {
    id:    'africa',
    label: '🌍 Africa',
    component: MAP,
    mapProps: {
      mapStyle: 'mapbox://styles/mapbox/light-v11',
      center: [20, 5],
      zoom:   2.8
    }
  },
  {
    id:    'middle-east',
    label: '🕌 Middle East',
    component: MAP,
    mapProps: {
      mapStyle: 'mapbox://styles/mapbox/light-v11',
      center: [45, 25],
      zoom:   3.5
    }
  },
  {
    id:    'south-asia',
    label: '🇮🇳 South Asia',
    component: MAP,
    mapProps: {
      mapStyle: 'mapbox://styles/mapbox/light-v11',
      center: [78, 22],
      zoom:   3.5
    }
  },
  {
    id:    'east-asia',
    label: '🐉 East Asia',
    component: MAP,
    mapProps: {
      mapStyle: 'mapbox://styles/mapbox/dark-v11',
      center: [110, 35],
      zoom:   3.2
    }
  },
  {
    id:    'southeast-asia',
    label: '🌴 SE Asia',
    component: MAP,
    mapProps: {
      mapStyle: 'mapbox://styles/mapbox/dark-v11',
      center: [110, 5],
      zoom:   3.5
    }
  },
  {
    id:    'central-asia',
    label: '🏔️ Central Asia',
    component: MAP,
    mapProps: {
      mapStyle: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [65, 42],
      zoom:   3.2
    }
  },
  {
    id:    'europe',
    label: '🇪🇺 Europe',
    component: MAP,
    mapProps: {
      mapStyle: 'mapbox://styles/mapbox/streets-v12',
      center: [15, 50],
      zoom:   3.5
    }
  },
  {
    id:    'americas',
    label: '🌎 Americas',
    component: MAP,
    mapProps: {
      mapStyle: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-75, 5],
      zoom:   2.5
    }
  },
  {
    id:    'north-africa',
    label: '🏜️ N. Africa',
    component: MAP,
    mapProps: {
      mapStyle: 'mapbox://styles/mapbox/satellite-v9',
      center: [20, 25],
      zoom:   3.5
    }
  },
  {
    id:    'global',
    label: '🌐 Global',
    component: MAP,
    mapProps: {
      mapStyle: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [20, 10],
      zoom:   1.5
    }
  }
]
</script>

<template>
  <TabLayout :tabs="tabs" />
</template>
