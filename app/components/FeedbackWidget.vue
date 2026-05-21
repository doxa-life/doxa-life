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

// The feedback widget is a ~95 KB third-party script that is not needed for
// first paint. Load it once the browser is idle so it stays off the initial
// load critical path. The <feedback-web-component> below upgrades in place
// when the definition arrives.
const FEEDBACK_SCRIPT = 'https://support.gospelambition.org/js/feedback-web-component.iife.js'

function loadFeedbackScript() {
  if (document.querySelector(`script[src="${FEEDBACK_SCRIPT}"]`)) return
  const script = document.createElement('script')
  script.src = FEEDBACK_SCRIPT
  script.async = true
  document.head.appendChild(script)
}

onMounted(() => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadFeedbackScript, { timeout: 3000 })
  } else {
    setTimeout(loadFeedbackScript, 2000)
  }
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
