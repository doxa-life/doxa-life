<script setup lang="ts">
interface Props {
  profileConfig: string
}

defineProps<Props>()
</script>

<template>
  <div class="feedback-widget-slot">
    <feedback-web-component :profile-config="profileConfig" />
  </div>
</template>

<style scoped>
.feedback-widget-slot {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 2147483647;
}
</style>
