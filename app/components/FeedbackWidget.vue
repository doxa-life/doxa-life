<template>
  <div class="feedback-widget-slot">
    <feedback-web-component :key="String(isLoggedIn)" :profile-config="profileConfig" />
  </div>
</template>

<script setup lang="ts">
const { public: pub } = useRuntimeConfig()
const { isLoggedIn } = useAuth()

const profileConfig = computed(() => JSON.stringify({
  profile: 'chat-bubble',
  apiBase: pub.feedbackApiBase,
  enabled: true,
  showByDefault: isLoggedIn.value,
  instanceId: 'fb-doxa-life-parent',
  projectId: pub.feedbackProjectId
}))
</script>
