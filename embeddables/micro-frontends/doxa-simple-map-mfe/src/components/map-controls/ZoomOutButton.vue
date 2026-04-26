<!--
  ZoomOutButton.vue — Decrements the map zoom level by one step.

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

function zoomOut() {
  props.map?.zoomOut()
}
</script>

<template>
  <MapControlButton :is-dark="isDark" :title="t('buttons.zoomOut')" @click="zoomOut">
    <span style="font-size:22px;line-height:1;font-weight:600;">−</span>
  </MapControlButton>
</template>
