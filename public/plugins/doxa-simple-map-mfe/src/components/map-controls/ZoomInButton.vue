<!--
  ZoomInButton.vue — Increments the map zoom level by one step.

  Props:
    map    — the live mapboxgl.Map instance (Object, required)
    isDark — theme flag forwarded from parent
-->
<script setup>
import { useI18n } from 'vue-i18n'
import MapControlButton from './MapControlButton.vue'

const { t } = useI18n()

const props = defineProps({
  map:    { type: Object, default: null },
  isDark: { type: Boolean, default: false }
})

function zoomIn() {
  props.map?.zoomIn()
}
</script>

<template>
  <MapControlButton :is-dark="isDark" :title="t('buttons.zoomIn')" @click="zoomIn">
    <span style="font-size:20px;line-height:1;font-weight:600;">+</span>
  </MapControlButton>
</template>
