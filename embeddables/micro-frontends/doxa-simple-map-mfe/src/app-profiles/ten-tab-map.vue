<script setup>
/**
 * ten-tab-map.vue — 10 tabs × 10 maps per tab.
 *
 * Default tabs + cities live in ./ten-tab-map.regions.js.
 * Override via child prop by passing a `tabs` array in profile-config:
 *
 *   <doxa-map profile-config='{
 *     "profile": "ten-tab-map",
 *     "tk": "...",
 *     "tabs": [{
 *       "id":    "my-tab",
 *       "label": "My Tab",
 *       "maps":  [{ "label": "City", "center": [lng, lat], "zoom": 10, "mapStyle": "..." }, ... up to 10]
 *     }]
 *   }'></doxa-map>
 *
 * Per-map fields (all optional except `center`):
 *   label, center [lng, lat] (required), zoom (default 10), mapStyle
 *
 * Each tab switch unmounts all 10 MapPanels (TabLayout uses v-if) so the
 * previous GL contexts release before 10 new ones start. Chromium caps
 * concurrent WebGL contexts near 16 — stuck "Loading…" panels mean a
 * context was silently dropped.
 */

import { markRaw, h, inject, computed } from 'vue'
import TabLayout from '../components/TabLayout.vue'
import MapPanel  from '../components/MapPanel.vue'
import { useShadowStyles } from '../composables/useShadowStyles.js'
import { DEFAULT_TABS, DEFAULT_STYLES } from './ten-tab-map.regions.js'

// ─── Shadow-root CSS (async profile styles don't auto-propagate) ──────────
useShadowStyles(`
  .mmg-root {
    position: absolute; inset: 0;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: 2px; background: #0b0f14;
  }
  .mmg-cell { position: relative; overflow: hidden; min-width: 0; min-height: 0; }
  .mmg-label {
    position: absolute; top: 4px; left: 4px; z-index: 5;
    background: rgba(0,0,0,.6); color: #e5e7eb;
    font: 10px ui-monospace, SFMono-Regular, Menlo, monospace;
    padding: 2px 6px; border-radius: 2px; letter-spacing: .02em;
    pointer-events: none;
  }
  @media (max-width: 900px) {
    .mmg-root { grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(5, 1fr); }
  }
`, 'ten-tab-map-grid')

// ─── Grid wrapper: renders an array of map configs in a 5×2 grid ──────────
const MultiMapGrid = markRaw({
  name: 'MultiMapGrid',
  props: { maps: { type: Array, required: true } },
  render() {
    return h('div', { class: 'mmg-root' }, this.maps.map((m, i) =>
      h('div', { key: i, class: 'mmg-cell' }, [
        h('span', { class: 'mmg-label' }, m.label || `#${i + 1}`),
        h(MapPanel, {
          mapStyle: m.mapStyle || DEFAULT_STYLES[i % DEFAULT_STYLES.length],
          center:   m.center,
          zoom:     m.zoom ?? 10
        })
      ])
    ))
  }
})

// ─── Tabs: child-prop override if present, otherwise the built-in regions ─
const profileConfig = inject('profileConfig', null)

const tabs = computed(() => {
  const override = profileConfig?.value?.tabs
  const source = Array.isArray(override) && override[0]?.maps ? override : DEFAULT_TABS
  return source.map(t => ({
    id:        t.id,
    label:     t.label,
    component: MultiMapGrid,
    mapProps:  { maps: t.maps }
  }))
})
</script>

<template>
  <TabLayout :tabs="tabs" />
</template>
