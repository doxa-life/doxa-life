<script setup lang="ts">
// Index of every WAGF region with the countries that have people groups in it.
// A region heading opens that region's dashboard (/regions/<region>); a country
// opens its own page (/regions/<country>). Data comes from /api/regions
// (derived from the prayer API).

import type { RegionSummary } from '~~/config/countries-meta'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data: regions } = await useAsyncData(
  `regions-index-${locale.value}`,
  async () => {
    const res = await $fetch<{ regions: RegionSummary[] }>('/api/regions', {
      query: { lang: locale.value }
    })
    return res.regions
  },
  { watch: [locale], default: () => [] as RegionSummary[] }
)

// Locale grouping separators with Latin digits, matching the rest of the site.
const formatNumber = (n: number) => n.toLocaleString(`${locale.value}-u-nu-latn`)

// Placeholders are %tokens% substituted manually (see the map note on the
// country page for why vue-i18n's {0} slots aren't used here).
function summaryLine(region: RegionSummary): string {
  return t('%count% people groups in %countries% countries')
    .replace('%count%', formatNumber(region.count))
    .replace('%countries%', formatNumber(region.countryCount))
}

useSeoMeta({
  title: () => `${t('Regions')} — Doxa`,
  description: () => t('Find unreached people groups by region and country.')
})

useTextHighlight()
</script>

<template>
  <div class="container page-content stack stack--3xl">
    <div class="stack stack--xs text-center">
      <h1
        class="highlight"
        data-highlight-last
      >
        {{ t('Regions') }}
      </h1>
      <p class="color-brand-lighter">
        {{ t('Find unreached people groups by region and country.') }}
      </p>
    </div>

    <section
      v-for="region in regions"
      :key="region.slug"
      class="stack stack--sm"
    >
      <div class="region-heading">
        <h2>
          <NuxtLink
            :to="localePath(`/regions/${region.slug}`)"
            class="region-heading__link"
          >
            {{ region.label || t('Other') }} <span aria-hidden="true">&rarr;</span>
          </NuxtLink>
        </h2>
        <p class="color-brand-lighter">
          {{ summaryLine(region) }}
        </p>
      </div>
      <ul class="countries-grid">
        <li
          v-for="c in region.countries"
          :key="c.slug"
        >
          <NuxtLink :to="localePath(`/regions/${c.slug}`)">
            {{ c.name }} <span class="color-brand-lighter">({{ c.count }})</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.region-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 1rem;
}

.region-heading__link {
  text-decoration: none;
}

.region-heading__link:hover {
  text-decoration: underline;
}

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
