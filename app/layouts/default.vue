<script setup lang="ts">
// Public layout. Loads the ported theme SCSS (no Tailwind, no Nuxt UI here)
// and renders the shared header/footer chrome around the page slot.
// Font stylesheets are loaded via useHead() so they only apply to public
// routes — admin pages declare their own typography in admin.css.

const { locale, locales } = useI18n()

const config = useRuntimeConfig()
const siteFeedbackConfig = JSON.stringify({
  profile: 'chat-bubble',
  apiBase: 'https://support.gospelambition.org',
  enabled: true,
  instanceId: 'fb-site',
  projectId: '3c0e8534-f593-4222-8315-31dda4514760'
})

// Direction attribute per locale (Arabic = rtl)
const currentLocale = computed(() =>
  locales.value.find(l => typeof l === 'object' && 'code' in l && l.code === locale.value)
)
const dir = computed(() => {
  const loc = currentLocale.value
  return (typeof loc === 'object' && loc && 'dir' in loc && loc.dir) ? loc.dir : 'ltr'
})

useHead(() => ({
  htmlAttrs: {
    lang: locale.value,
    dir: dir.value
  },
  link: [
    { rel: 'stylesheet', href: '/assets/fonts/BebasNeue/stylesheet.css' },
    { rel: 'stylesheet', href: '/assets/fonts/Brandon_Grotesque/stylesheet.css' },
    { rel: 'stylesheet', href: '/assets/fonts/Poppins/stylesheet.css' }
  ]
}))

// Layout-level behaviours shared across all public pages
useSmoothScroll()
</script>

<template>
  <div class="page">
    <TheHeader />
    <main class="site-main">
      <slot />
    </main>
    <TheFooter />
    <ClientOnly>
      <div class="site-feedback-widget">
        <feedback-web-component :profile-config="siteFeedbackConfig" />
      </div>
    </ClientOnly>
  </div>
</template>

<style lang="scss" src="~/assets/styles/main.scss"></style>

<style scoped>
.site-feedback-widget {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483647;
}
</style>
