<!--
  FullscreenButton.vue — Toggles browser fullscreen for the map host element.

  The fullscreen request targets the Custom Element's host node so the entire
  widget goes fullscreen (not just the inner div). Falls back to
  document.documentElement if the shadow root host isn't available.

  Listens to the native `fullscreenchange` event to keep `isFullscreen` in sync
  when the user presses Escape to exit.

  Props:
    mapContainer — ref to the map canvas div (used to walk up to shadow host)
    isDark       — theme flag forwarded from parent

  Emits:
    change(isFullscreen: Boolean) — fires whenever fullscreen state changes
-->
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import MapControlButton from './MapControlButton.vue'

const { t } = useI18n()

const props = defineProps({
  mapContainer: { type: Object,  default: null },  // template ref (el)
  isDark:       { type: Boolean, default: false }
})

const emit = defineEmits(['change'])

const isFullscreen = ref(false)

function toggle() {
  if (!document.fullscreenElement) {
    const host = props.mapContainer?.getRootNode()?.host ?? document.documentElement
    ;(host.requestFullscreen?.() ?? Promise.resolve())
      .then(() => { isFullscreen.value = true; emit('change', true) })
      .catch(() => {
        document.documentElement.requestFullscreen?.()
        isFullscreen.value = true
        emit('change', true)
      })
  } else {
    document.exitFullscreen?.().then(() => {
      isFullscreen.value = false
      emit('change', false)
    })
  }
}

function onFsChange() {
  isFullscreen.value = !!document.fullscreenElement
  emit('change', isFullscreen.value)
}

onMounted(()        => document.addEventListener('fullscreenchange', onFsChange))
onBeforeUnmount(()  => document.removeEventListener('fullscreenchange', onFsChange))
</script>

<template>
  <MapControlButton :is-dark="isDark" :active="isFullscreen" :title="t('buttons.toggleFullscreen')" @click="toggle">
    <!-- Expand SVG when not fullscreen; compress SVG when fullscreen -->
    <svg v-if="!isFullscreen" xmlns="http://www.w3.org/2000/svg"
         width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
    </svg>
    <svg v-else xmlns="http://www.w3.org/2000/svg"
         width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
    </svg>
  </MapControlButton>
</template>
