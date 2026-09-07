<script setup lang="ts">
// One route serves both the region dashboards (/regions/africa) and the
// per-country pages (/regions/india): the slug is matched against region slugs
// first, then country slugs. Both summaries come from /api/regions, which
// derives them from the prayer API — see config/countries-meta.ts.

import type { CountrySummary, RegionSummary } from '~~/config/countries-meta'

const route = useRoute()
const { t, locale } = useI18n()

const slug = computed(() => String(route.params.slug || ''))

const { data, refresh } = await useAsyncData(
  `region-page-${slug.value}-${locale.value}`,
  async () => {
    const res = await $fetch<{ regions: RegionSummary[] }>('/api/regions', {
      query: { lang: locale.value }
    })
    const region = res.regions.find(r => r.slug === slug.value) ?? null
    const country: CountrySummary | null = region
      ? null
      : res.regions.flatMap(r => r.countries).find(c => c.slug === slug.value) ?? null
    return { region, country }
  },
  { watch: [slug, locale] }
)

if (!data.value?.region && !data.value?.country) {
  throw createError({ statusCode: 404, statusMessage: t('Page Not Found') })
}

// Prerendered dashboards carry build-time figures; refetch on the client so
// the progress shown is current.
onMounted(() => {
  if (data.value?.region) refresh()
})

const title = computed(() => {
  const region = data.value?.region
  if (region) return region.label || t('Other')
  return data.value?.country?.name ?? ''
})
const count = computed(() => data.value?.region?.count ?? data.value?.country?.count ?? 0)

useSeoMeta({
  title: () => `${title.value} — Doxa`,
  description: () => `${title.value}: ${count.value} ${t('People Groups')}`,
  ogTitle: () => `${title.value} — Doxa`,
  ogDescription: () => `${title.value}: ${count.value} ${t('People Groups')}`
})

useTextHighlight()
</script>

<template>
  <RegionDetail
    v-if="data?.region"
    :region="data.region"
  />
  <CountryDetail
    v-else-if="data?.country"
    :country="data.country"
  />
</template>
