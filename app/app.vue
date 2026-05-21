<script setup lang="ts">
// Site-wide feedback widget. It lives here (outside NuxtLayout) so it renders
// on every layout — public, admin and auth. It stays opted out by default and
// surfaces only when the visitor opts in: via ?feedback=true or by logging in.
// Both set the component's `show-feedback-widget` localStorage flag (login is
// wired in useAuth). The per-page map widgets are separate (FeedbackWidgetSlot,
// anchored inside each map).
useFeedbackScript()
const siteFeedbackConfig = JSON.stringify({
  profile: 'chat-bubble',
  apiBase: 'https://support.gospelambition.org',
  enabled: true,
  showByDefault: false,
  instanceId: 'fb-site',
  projectId: '3c0e8534-f593-4222-8315-31dda4514760'
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <div class="site-feedback-widget">
      <feedback-web-component :profile-config="siteFeedbackConfig" />
    </div>
  </ClientOnly>
</template>

<style scoped>
.site-feedback-widget {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483647;
}
</style>
