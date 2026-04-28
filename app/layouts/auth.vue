<script setup lang="ts">
import '~/assets/css/admin.css'

// Dev-only: Vite's dev server pins main.scss (and its @use partials) into
// the module graph as soon as you visit the public site, then injects link
// tags for them on every subsequent page in the session — even auth pages
// that don't import them. Strip them on mount so the auth shell isn't
// styled by the public-site SCSS. Production code-splits per-route, so this
// branch is dead-code-eliminated and has no effect on the prod bundle.
if (import.meta.dev) {
  onMounted(() => {
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      if ((link as HTMLLinkElement).href.includes('/assets/styles/')) {
        link.remove()
      }
    })
  })
}
</script>

<template>
  <UApp>
    <div class="min-h-screen flex flex-col bg-(--ui-bg)">
      <div class="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <div class="flex-1 flex items-center justify-center px-4 pb-12">
        <div class="w-full max-w-md">
          <slot />
        </div>
      </div>
    </div>
  </UApp>
</template>
