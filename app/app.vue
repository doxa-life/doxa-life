<script setup lang="ts">
// Site-wide feedback widget. It lives here (outside NuxtLayout) so it renders
// on every layout — public, admin and auth. It stays opted out by default and
// surfaces only when the visitor opts in: via ?feedback=true or by logging in.
// Both set the component's `show-feedback-widget` localStorage flag (login is
// wired in useAuth). This is the only feedback widget on the site.
// Destination comes from NUXT_PUBLIC_FEEDBACK_API_BASE / _PROJECT_ID. With no
// project id there is nowhere to post, so the widget and its bundle are skipped.
const { public: pub } = useRuntimeConfig()
const feedbackEnabled = Boolean(pub.feedbackProjectId)

if (feedbackEnabled) useFeedbackScript()

const siteFeedbackConfig = JSON.stringify({
  profile: 'chat-bubble',
  apiBase: pub.feedbackApiBase,
  enabled: true,
  showByDefault: false,
  instanceId: 'fb-site',
  projectId: pub.feedbackProjectId
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <div
      v-if="feedbackEnabled"
      class="site-feedback-widget"
    >
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
