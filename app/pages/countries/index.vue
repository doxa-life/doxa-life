<script setup lang="ts">
// Index of every country that has people groups, grouped by WAGF region.
// Data comes from /api/countries (derived from the prayer API).

import type { CountrySummary } from '~~/config/countries-meta'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data: countries } = await useAsyncData(
  `countries-index-${locale.value}`,
  async () => {
    const res = await $fetch<{ countries: CountrySummary[] }>('/api/countries', {
      query: { lang: locale.value }
    })
    return res.countries
  },
  { watch: [locale], default: () => [] as CountrySummary[] }
)

// Group by WAGF region; regions sorted by label, countries already name-sorted
// by the API.
const regions = computed(() => {
  const byRegion = new Map<string, { label: string, items: CountrySummary[] }>()
  for (const c of countries.value ?? []) {
    const key = c.region?.value || 'other'
    const label = c.region?.label || t('Other')
    if (!byRegion.has(key)) byRegion.set(key, { label, items: [] })
    byRegion.get(key)!.items.push(c)
  }
  return Array.from(byRegion.values()).sort((a, b) => a.label.localeCompare(b.label))
})

useSeoMeta({
  title: () => `${t('Countries')} — Doxa`,
  description: () => t('Find unreached people groups by country.')
})

useTextHighlight()
</script>

<template>
  <div class="container page-content stack stack--3xl">
    <div class="stack stack--xs text-center">
      <h1 class="highlight" data-highlight-last>{{ t('Countries') }}</h1>
      <p class="color-brand-lighter">{{ t('Find unreached people groups by country.') }}</p>
    </div>

    <section v-for="region in regions" :key="region.label" class="stack stack--sm">
      <h2>{{ region.label }}</h2>
      <ul class="countries-grid">
        <li v-for="c in region.items" :key="c.slug">
          <NuxtLink :to="localePath(`/countries/${c.slug}`)">
            {{ c.name }} <span class="color-brand-lighter">({{ c.count }})</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.countries-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.5rem 1.5rem;
}

.countries-grid a {
  text-decoration: none;
}

.countries-grid a:hover {
  text-decoration: underline;
}
</style>
