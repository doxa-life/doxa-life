<script setup>
/*
  MapControlsComponent.vue — Legacy single-component toolbar.

  Composes a flat list of buttons via a `buttons` prop array. Each entry
  has shape { action: string, title: string, icon?: string }. Icons for
  'location' and 'fullscreen' are rendered as SVGs; everything else falls
  back to the `icon` text (used by zoom +/-).

  Newer code should prefer the modular `map-controls/MapToolbar.vue`
  composition, where each button is its own component bound to a specific
  map instance. This wrapper is retained for backwards compatibility.
*/
import { useShadowStyles } from '../composables/useShadowStyles.js'

useShadowStyles(`
/* ── Light mode buttons ── */
.map-controls{position:absolute;top:10px;right:10px;z-index:1000;display:flex;flex-direction:column;gap:8px;}
.map-control-btn{width:40px;height:40px;background:#fff;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.14),0 2px 8px rgba(0,0,0,0.10);transition:background-color 0.2s,box-shadow 0.2s,transform 0.1s;color:#333;}
.map-control-btn:hover{background:#f0f0f0;box-shadow:0 2px 8px rgba(0,0,0,0.18),0 4px 16px rgba(0,0,0,0.12);}
.map-control-btn:active{transform:scale(0.93);}
.location-icon,.fullscreen-icon{display:flex;align-items:center;justify-content:center;}
.zoom-label{font-size:18px;font-weight:700;line-height:1;user-select:none;}
/* ── Dark mode buttons ── */
.map-controls.dark .map-control-btn{background:#1e1e2e;color:#fff;border:1px solid rgba(255,255,255,0.14);box-shadow:0 1px 4px rgba(0,0,0,0.4);}
.map-controls.dark .map-control-btn:hover{background:#2a2a3e;box-shadow:0 2px 8px rgba(0,0,0,0.5);}
@media(max-width:767px){.map-controls{top:10px;right:10px;}.map-control-btn{width:36px;height:36px;}}
`, 'map-controls')

const props = defineProps({
  buttons: { type: Array, default: () => [] },
  isFullscreen: { type: Boolean, default: false },
  isDark: { type: Boolean, default: false }
})

const emit = defineEmits(['button-click'])
</script>

<template>
  <div v-if="buttons.length > 0" class="map-controls" :class="{ dark: isDark }">
    <button
      v-for="(button, index) in buttons"
      :key="index"
      class="map-control-btn"
      :title="button.title"
      @click="emit('button-click', button.action)"
    >
      <span v-if="button.action === 'location'" class="location-icon">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2C7.24 2 5 4.24 5 7c0 3.25 5 11 5 11s5-7.75 5-11c0-2.76-2.24-5-5-5Z" fill="currentColor"/>
          <circle cx="10" cy="7" r="2" fill="white"/>
        </svg>
      </span>
      <span v-else-if="button.action === 'fullscreen'" class="fullscreen-icon">
        <svg v-if="!isFullscreen" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
        </svg>
      </span>
      <span v-else class="zoom-label">{{ button.icon }}</span>
    </button>
  </div>
</template>
