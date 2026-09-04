<script setup lang="ts">
// Per-country page body: a map that highlights the country and plots its
// people groups (plus surrounding ones, muted), alongside the people-group list
// locked to this country. The summary (name, code, count, region, map
// center/zoom) comes from /api/regions via the /regions/[slug] page.

import { buildUupgListTranslations } from '~/utils/uupgListTranslations'
import { regionSlug, type CountrySummary } from '~~/config/countries-meta'

const props = defineProps<{ country: CountrySummary }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const translations = computed(() => buildUupgListTranslations(t))

const regionLink = computed(() => localePath(`/regions/${regionSlug(props.country.region.value)}`))
const regionLabel = computed(() => props.country.region.label || t('Other'))

// Map note. Placeholders are substituted manually with %count%/%country%
// tokens rather than vue-i18n's {0}/{1} slots: vue-i18n empties brace slots
// when the key resolves with no args (the English source), and leaves them
// literal when the key is missing (untranslated locales fall back to the
// English source) — neither path interpolates correctly. Non-brace tokens are
// passed through untouched in every locale, so a single manual replace works
// for English now and for Weblate translations later (which keep the tokens).
const mapNote = computed(() =>
  t('There are %count% people groups in %country%. Check the map for the people groups on the border of this country as well.')
    .replace('%count%', String(props.country.count))
    .replace('%country%', props.country.name)
)
</script>

<template>
  <div class="container page-content uupgs-page stack stack--3xl">
    <div class="stack stack--xs text-center">
      <NuxtLink class="light-link" :to="localePath('/regions')">&larr; {{ t('All Regions') }}</NuxtLink>
      <h1 class="highlight" data-highlight-last>{{ country.name }}</h1>
      <p class="color-brand-lighter">
        {{ country.count }} {{ t('People Groups') }} &middot;
        <NuxtLink class="light-link" :to="regionLink">{{ regionLabel }}</NuxtLink>
      </p>
    </div>

    <div class="stack stack--sm">
      <p class="country-map-note | text-center color-primary font-weight-bold">
        {{ mapNote }}
      </p>
      <ClientOnly>
        <CountryMap
          :country-codes="[country.code]"
          :center="country.center"
          :zoom="country.zoom"
          :language-code="locale"
          :research-url="localePath('/research') + '/'"
          class="rounded-xlg"
        />
      </ClientOnly>
    </div>

    <UupgsList
      :language-code="locale"
      :research-url="localePath('/research') + '/'"
      :t="translations"
      :lock-country-code="country.code"
      hide-see-all-link
    />
  </div>
</template>
