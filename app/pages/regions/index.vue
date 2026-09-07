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

    <div class="stack stack--lg">
      <div
        v-for="region in regions"
        :key="region.slug"
        class="region-card"
      >
        <div class="region-card__header">
          <h2 class="region-card__title">
            <NuxtLink
              :to="localePath(`/regions/${region.slug}`)"
              class="region-card__link | with-icon"
            >
              {{ region.label || t('Other') }}
              <svg
                class="icon | rotate-90 right"
                aria-hidden="true"
              >
                <use href="/assets/icons/arrow-chevron.svg#chevron-up" />
              </svg>
            </NuxtLink>
          </h2>
          <p class="region-card__summary">
            {{ summaryLine(region) }}
          </p>
        </div>
        <div class="region-card__body">
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
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Card with a brand-coloured header band (region name + count) above the
   white country list, following the site's two-tone card pattern. Plain divs
   rather than <section>, which carries the page-level section padding. */
.region-card {
  border-radius: var(--border-radius-xlg);
  overflow: hidden;
  background-color: var(--color-surface-white);
}

.region-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2xs) var(--spacing-lg);
  padding: var(--spacing-md) clamp(var(--spacing-md), 4vw, var(--spacing-2xl));
  background-color: var(--color-surface-brand);
  color: var(--color-text-on-brand);
}

.region-card__title {
  font-size: clamp(var(--font-size-xl), 4vw, var(--font-size-3xl));
}

.region-card__link {
  color: inherit;
  text-decoration: none;
}

.region-card__link:hover {
  color: var(--color-brand-primary);
}

.region-card__summary {
  font-size: var(--font-size-md);
  opacity: 0.85;
}

.region-card__body {
  padding: var(--spacing-lg) clamp(var(--spacing-md), 4vw, var(--spacing-2xl)) var(--spacing-xl);
}

/* Keeps the site's list bullets (global ul padding + ::before dot) and lays
   the countries out in responsive columns. */
.countries-grid {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--spacing-xs) var(--spacing-xl);
}

.countries-grid a {
  text-decoration: none;
}

.countries-grid a:hover {
  text-decoration: underline;
}
</style>
