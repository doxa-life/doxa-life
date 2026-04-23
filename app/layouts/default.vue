<script setup lang="ts">
// Public layout. Loads the ported theme SCSS (no Tailwind, no Nuxt UI here)
// and renders the shared header/footer chrome around the page slot.
// Font stylesheets are loaded via useHead() so they only apply to public
// routes — admin pages declare their own typography in admin.css.

const { locale, locales } = useI18n()

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

// Dim the main content while navigating so clicking a sidebar link has
// visible feedback immediately (the top progress bar alone still leaves
// the body looking frozen because Nuxt blocks the transition until the
// new page's useAsyncData resolves).
const { isLoading } = useLoadingIndicator()
</script>

<template>
  <div class="page">
    <!-- Browser-style top-of-page progress bar during route changes.
         Nuxt's default useAsyncData blocks navigation until the new
         page's data resolves, so without this the UI appears frozen
         between click and content swap. White so it shows against the
         dark header; the component sits at z-index ≫ page content. -->
    <NuxtLoadingIndicator color="#ffffff" :height="4" />
    <TheHeader />
    <main class="site-main" :class="{ 'site-main--loading': isLoading }">
      <slot />
    </main>
    <TheFooter />
  </div>
</template>

<style lang="scss" src="~/assets/styles/main.scss"></style>

<style scoped>
.site-main {
  transition: opacity 150ms ease-out;
}
.site-main--loading {
  opacity: 0.45;
  pointer-events: none;
}
</style>
