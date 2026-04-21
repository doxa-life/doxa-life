<script setup lang="ts">
definePageMeta({
  layout: false
})

const { isLoggedIn } = useAuth()
</script>

<template>
  <div class="min-h-screen bg-(--ui-bg)">
    <div class="flex justify-end p-4">
      <ThemeToggle />
    </div>
    <div class="text-center py-16 px-4">
      <h1 class="text-4xl font-bold text-(--ui-text) mb-4">Welcome</h1>
      <p class="text-(--ui-text-muted) mb-8 max-w-lg mx-auto">
        Get started by customizing this page.
      </p>
      <div v-if="!isLoggedIn" class="flex items-center justify-center gap-3">
        <UButton to="/login" size="lg">
          Sign in
        </UButton>
        <UButton to="/register" size="lg" variant="outline">
          Create an account
        </UButton>
      </div>
      <div v-else>
        <UButton to="/dashboard" size="lg">
          Go to dashboard
        </UButton>
      </div>
    </div>
  </div>
</template>
