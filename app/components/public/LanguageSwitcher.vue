<script setup lang="ts">
// Port of the Polylang language switcher. Renders the current language
// as a trigger, with a dropdown listing the remaining enabled languages.
// Uses `switchLocalePath()` so each link points at the same page in the
// target locale.

import { ENABLED_LANGUAGES, LANGUAGES } from '~~/config/languages'

const { locale } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const route = useRoute()

const current = computed(() => LANGUAGES.find(l => l.code === locale.value) ?? LANGUAGES[0])
const others = computed(() => ENABLED_LANGUAGES.filter(l => l.code !== locale.value))

const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)

function close() {
  isOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) close()
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))

// Close when route changes (so clicking a locale link closes the menu)
watch(() => route.fullPath, close)
</script>

<template>
  <li
    ref="rootRef"
    class="pll-parent-menu-item menu-item menu-item-has-children"
    :class="{ 'is-open': isOpen }"
    @mouseenter="isOpen = true"
    @mouseleave="isOpen = false"
  >
    <a
      href="#"
      role="button"
      :aria-expanded="isOpen"
      :aria-label="current?.name"
      @click.prevent="isOpen = !isOpen"
    >
      <span class="language-flag" :aria-hidden="true">{{ current?.flag }}</span>
      <span>{{ current?.nativeName }}</span>
    </a>
    <ul v-if="isOpen" class="sub-menu">
      <li v-for="lang in others" :key="lang.code" class="lang-item menu-item">
        <NuxtLink :to="switchLocalePath(lang.code as Parameters<typeof switchLocalePath>[0]) || '/'" :hreflang="lang.code">
          <span class="language-flag" :aria-hidden="true">{{ lang.flag }}</span>
          <span>{{ lang.nativeName }}</span>
        </NuxtLink>
      </li>
    </ul>
  </li>
</template>

<style scoped>
.language-flag {
  display: inline-block;
  font-size: 1.1em;
  margin-right: 0.35em;
  line-height: 1;
}

/* Ensure the flag sits on the opposite side in RTL layouts */
[dir="rtl"] .language-flag {
  margin-right: 0;
  margin-left: 0.35em;
}
</style>
