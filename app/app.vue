<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <div class="feedback-widget-slot">
    <feedback-widget :profile-config="feedbackConfig" />
  </div>
</template>

<script setup lang="ts">
useFeedbackWidget()

const feedbackConfig = JSON.stringify({
  profile: 'chat-bubble',
  apiBase: 'https://support.gospelambition.org',
  enabled: true,
  instanceId: 'fb-doxa-life-parent',
  projectId: '3c0e8534-f593-4222-8315-31dda4514760'
})
</script>
