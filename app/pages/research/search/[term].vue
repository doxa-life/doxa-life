<script setup lang="ts">
// Port of the WP rewrite rule that maps `/research/search/{term}` to the
// research page with `uupg_search={term}` (see `custom_uupgs_rewrite_rules`
// in marketing-theme/functions.php). Reuses the same <UupgsList> setup
// as research/index.vue but pulls the initial search term from the URL
// path segment instead of the `?uupg_search=` query string.

import { buildUupgListTranslations } from '~/utils/uupgListTranslations'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const initialSearchTerm = computed(() => {
  const raw = Array.isArray(route.params.term) ? route.params.term[0] : route.params.term
  try {
    return decodeURIComponent(raw ?? '')
  } catch {
    return raw ?? ''
  }
})

const translations = computed(() => buildUupgListTranslations(t))

useTextHighlight()
</script>

<template>
  <div class="container page-content uupgs-page stack stack--3xl">
    <h1 class="text-center highlight" data-highlight-last>{{ t('Find a UUPG') }}</h1>
    <UupgsList
      :language-code="locale"
      :research-url="localePath('/research') + '/'"
      :t="translations"
      :initial-search-term="initialSearchTerm"
      hide-see-all-link
    />
  </div>
</template>
