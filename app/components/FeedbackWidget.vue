<script setup lang="ts">
const { public: pub } = useRuntimeConfig()

const profileConfig = JSON.stringify({
  profile: 'chat-bubble',
  apiBase: pub.feedbackApiBase,
  enabled: true,
  instanceId: 'fb-doxa-life-parent',
  projectId: pub.feedbackProjectId
})
</script>

<template>
  <div class="feedback-widget-slot">
    <feedback-web-component :profile-config="profileConfig" />
  </div>
</template>

<style scoped>
.feedback-widget-slot {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2147483000;
}
</style>
