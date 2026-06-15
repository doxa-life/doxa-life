<script setup lang="ts">
// Per-country page: a dedicated map that highlights the country and plots its
// people groups (plus surrounding ones, muted), alongside the people-group list
// locked to this country. The country summary (name, code, count, map
// center/zoom) comes from /api/countries, which derives it from the prayer API —
// see config/countries-meta.ts and server/api/countries.get.ts.

import { buildUupgListTranslations } from '~/utils/uupgListTranslations'
import type { CountrySummary } from '~~/config/countries-meta'

const route = useRoute()
const { t, locale } = useI18n()
const localePath = useLocalePath()

const slug = computed(() => String(route.params.country || ''))

const { data: country } = await useAsyncData(
  `country-${slug.value}-${locale.value}`,
  async () => {
    const res = await $fetch<{ countries: CountrySummary[] }>('/api/countries', {
      query: { lang: locale.value }
    })
    return res.countries.find(c => c.slug === slug.value) ?? null
  },
  { watch: [slug, locale] }
)

if (!country.value) {
  throw createError({ statusCode: 404, statusMessage: t('Country Not Found') })
}

const translations = computed(() => buildUupgListTranslations(t))

// Map note. Placeholders are substituted manually with %count%/%country%
// tokens rather than vue-i18n's {0}/{1} slots: vue-i18n empties brace slots
// when the key resolves with no args (the English source), and leaves them
// literal when the key is missing (untranslated locales fall back to the
// English source) — neither path interpolates correctly. Non-brace tokens are
// passed through untouched in every locale, so a single manual replace works
// for English now and for Weblate translations later (which keep the tokens).
const mapNote = computed(() =>
  t('There are %count% people groups in %country%. Check the map for the people groups on the border of this country as well.')
    .replace('%count%', String(country.value?.count ?? 0))
    .replace('%country%', country.value?.name ?? '')
)

useSeoMeta({
  title: () => `${country.value?.name} — Doxa`,
  description: () => `${country.value?.name}: ${country.value?.count} ${t('People Groups')}`,
  ogTitle: () => `${country.value?.name} — Doxa`,
  ogDescription: () => `${country.value?.name}: ${country.value?.count} ${t('People Groups')}`
})

useTextHighlight()
</script>

<template>
  <div class="container page-content uupgs-page stack stack--3xl">
    <div class="stack stack--xs text-center">
      <NuxtLink class="light-link" :to="localePath('/countries')">&larr; {{ t('All Countries') }}</NuxtLink>
      <h1 class="highlight" data-highlight-last>{{ country?.name }}</h1>
      <p class="color-brand-lighter">{{ country?.count }} {{ t('People Groups') }}</p>
    </div>

    <div class="stack stack--sm">
      <p v-if="country" class="country-map-note | text-center color-primary font-weight-bold">
        {{ mapNote }}
      </p>
      <ClientOnly>
        <CountryMap
          v-if="country"
          :country-code="country.code"
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
      :lock-country-code="country?.code"
      hide-see-all-link
    />
  </div>
</template>
