<script setup lang="ts">
const { user } = useAuth()
const config = useRuntimeConfig()
</script>

<template>
  <div class="min-h-screen bg-(--ui-bg) text-(--ui-text)">
    <header class="bg-(--ui-bg-elevated) border-b border-(--ui-border) py-4 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <slot name="header-left">
            <NuxtLink to="/" class="text-xl font-semibold hover:text-(--ui-text-muted) transition-colors">
              {{ config.public.appName }}
            </NuxtLink>
          </slot>
        </div>
        <div class="flex items-center gap-3">
          <slot name="header-right">
            <span class="text-(--ui-text-muted) text-sm hidden sm:inline">
              {{ user?.display_name || user?.email }}
            </span>
            <UButton to="/profile" variant="ghost" size="sm">
              Profile
            </UButton>
            <ThemeToggle />
          </slot>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-8">
      <slot />
    </main>
  </div>
</template>
