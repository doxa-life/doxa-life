<script setup lang="ts">
// Port of marketing-theme/page-uupgs.php.
// Matches the PHP markup verbatim: container page-content uupgs-page stack
// stack--3xl + a highlighted h1 + the <UupgsList> component. The
// `initialSearchTerm` is taken from the `uupg_search` query parameter
// (PHP equivalent: `get_query_var('uupg_search')`).

import { buildUupgListTranslations } from '~/utils/uupgListTranslations'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const initialSearchTerm = computed(() =>
  (Array.isArray(route.query.uupg_search) ? route.query.uupg_search[0] : route.query.uupg_search) ?? ''
)

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
