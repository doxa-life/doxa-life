<template>
  <div class="feedback-widget-slot">
    <feedback-web-component :profile-config="profileConfig" />
  </div>
</template>

<script setup lang="ts">
const { public: pub } = useRuntimeConfig()

const profileConfig = JSON.stringify({
  profile: 'chat-bubble',
  apiBase: pub.feedbackApiBase,
  enabled: true,
  showByDefault: false,
  instanceId: 'fb-doxa-life-parent',
  projectId: pub.feedbackProjectId
})
</script>
