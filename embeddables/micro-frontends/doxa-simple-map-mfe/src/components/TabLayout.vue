<script setup>
/**
 * TabLayout.vue — Tab layout container
 *
 * Renders a tab bar and a single map panel.
 * Uses v-if (lazy-init) on the map panel: only the ACTIVE tab holds a GL context.
 * When you switch tabs, the previous map is destroyed and the new one mounts.
 *
 * GL context rule: max 8–16 WebGL contexts per page (browser hard limit).
 * With v-if, this layout always uses exactly 1 GL context regardless of tab count.
 *
 * Props:
 *   tabs: [{ id, label, component, props }]  — tab definitions
 */

import { ref, shallowRef } from 'vue'
import { useShadowStyles } from '../composables/useShadowStyles.js'

// ─── Shadow DOM style injection ──────────────────────────────────────────────
useShadowStyles(`
  .tab-layout {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: #111827;
  }
  .tab-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    padding: 6px 8px 0;
    background: #1f2937;
    flex-shrink: 0;
    border-bottom: 2px solid #374151;
  }
  .tab-btn {
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: #9ca3af;
    background: transparent;
    border: none;
    border-radius: 4px 4px 0 0;
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
    white-space: nowrap;
  }
  .tab-btn:hover {
    color: #e5e7eb;
    background: #374151;
  }
  .tab-btn.active {
    color: #60a5fa;
    background: #111827;
    border-bottom: 2px solid #60a5fa;
    margin-bottom: -2px;
  }
  .tab-panel {
    flex: 1;
    min-height: 0;
    position: relative;
  }
  .tab-panel > * {
    position: absolute;
    inset: 0;
  }
`, 'tab-layout')

const props = defineProps({
  tabs: {
    type: Array,
    required: true
    // Shape: [{ id: string, label: string, component: Component, mapProps: object }]
  }
})

const activeTabId = ref(props.tabs[0]?.id ?? null)
const activeTab   = shallowRef(props.tabs[0] ?? null)

function selectTab(tab) {
  activeTabId.value = tab.id
  activeTab.value   = tab
}
</script>

<template>
  <div class="tab-layout">

    <!-- ── Tab Bar ── -->
    <div class="tab-bar" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: tab.id === activeTabId }"
        role="tab"
        :aria-selected="tab.id === activeTabId"
        @click="selectTab(tab)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ── Map Panel — v-if = lazy-init, 1 GL context at a time ── -->
    <div class="tab-panel">
      <!--
        v-if destroys the component (and its GL context) when a different tab is selected.
        This keeps the WebGL context count at exactly 1, no matter how many tabs exist.
        Trade-off: small reload delay on each tab switch (~300ms).
        If instant switching is needed: switch to v-show (keep-alive) but cap tab count to ≤4.
      -->
      <component
        :is="activeTab.component"
        v-if="activeTab"
        :key="activeTab.id"
        v-bind="activeTab.mapProps"
      />
    </div>

  </div>
</template>

<style scoped>
.tab-layout {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #111827;
}

/* ── Tab Bar ── */
.tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 6px 8px 0;
  background: #1f2937;
  flex-shrink: 0;
  border-bottom: 2px solid #374151;
}

.tab-btn {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #9ca3af;
  background: transparent;
  border: none;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  white-space: nowrap;
}

.tab-btn:hover {
  color: #e5e7eb;
  background: #374151;
}

.tab-btn.active {
  color: #60a5fa;
  background: #111827;
  border-bottom: 2px solid #60a5fa;
  margin-bottom: -2px;
}

/* ── Map Panel — fills remaining height ── */
.tab-panel {
  flex: 1;
  min-height: 0;
  position: relative;
}

.tab-panel > * {
  position: absolute;
  inset: 0;
}
</style>
