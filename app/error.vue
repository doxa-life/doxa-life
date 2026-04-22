<script setup lang="ts">
// Port of marketing-theme/404.php. Nuxt's `error.vue` replaces the root
// app when an error is thrown (including nuxt's built-in 404). Wraps the
// message in the public default layout so header/footer still render.

import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <NuxtLayout>
    <div class="container page-content">
      <div class="stack stack--lg">
        <h1 class="page-title">{{ t('Page Not Found') }}</h1>
        <p>{{ t('It looks like nothing was found at this location. Perhaps one of the links below can help.') }}</p>
        <div class="error-404-content">
          <div class="stack stack--md">
            <h3>{{ t('Popular Pages:') }}</h3>
            <ul>
              <li><NuxtLink :to="localePath('/')">{{ t('Home') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/pray')">{{ t('Pray') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/adopt')">{{ t('Adopt') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/research')">{{ t('Research') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/about')">{{ t('About') }}</NuxtLink></li>
              <li><NuxtLink :to="localePath('/contact')">{{ t('Contact') }}</NuxtLink></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
