<script setup lang="ts">
// Region dashboard body: headline figures, a map of the region's countries
// with its people groups coloured by prayer coverage, progress toward the DOXA
// goals — prayer coverage, adoption, engagement — and a per-country breakdown
// linking to each country page. The summary comes from /api/regions via the
// /regions/[slug] page.

import type { RegionSummary } from '~~/config/countries-meta'

const props = defineProps<{ region: RegionSummary }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

// Locale grouping separators with Latin digits, matching the rest of the site.
const formatNumber = (n: number) => n.toLocaleString(`${locale.value}-u-nu-latn`)

const label = computed(() => props.region.label || t('Other'))
const countryCodes = computed(() => props.region.countries.map(c => c.code))

// Prayer coverage split, mirroring the pray page: fully covered (100+
// committed), partially covered (1+), and no one committed yet.
const partialPrayerCount = computed(() => Math.max(0, props.region.withPrayer - props.region.withFullPrayer))
const noPrayerCount = computed(() => Math.max(0, props.region.count - props.region.withPrayer))

function percentOfRegion(count: number): number {
  return props.region.count ? Math.min(100, (count / props.region.count) * 100) : 0
}

// Placeholders are %tokens% substituted manually (see the map note on the
// country page for why vue-i18n's {0} slots aren't used here).
const summaryLine = computed(() =>
  t('%count% people groups in %countries% countries')
    .replace('%count%', formatNumber(props.region.count))
    .replace('%countries%', formatNumber(props.region.countryCount))
)
const mapNote = computed(() =>
  t('%region% has %count% people groups across %countries% countries. Each pin is coloured by how many people are praying for that people group.')
    .replace('%region%', label.value)
    .replace('%count%', formatNumber(props.region.count))
    .replace('%countries%', formatNumber(props.region.countryCount))
)
</script>

<template>
  <div class="container page-content uupgs-page stack stack--3xl">
    <div class="stack stack--xs text-center">
      <NuxtLink class="light-link" :to="localePath('/regions')">&larr; {{ t('All Regions') }}</NuxtLink>
      <h1 class="highlight" data-highlight-last>{{ label }}</h1>
      <p class="color-brand-lighter">{{ summaryLine }}</p>
    </div>

    <div class="region-stats">
      <div class="region-stat | card" padding-small>
        <p class="region-stat__value">{{ formatNumber(region.count) }}</p>
        <p class="region-stat__label">{{ t('People Groups') }}</p>
      </div>
      <div class="region-stat | card" padding-small>
        <p class="region-stat__value">{{ formatNumber(region.countryCount) }}</p>
        <p class="region-stat__label">{{ t('Countries') }}</p>
      </div>
      <div class="region-stat | card" padding-small>
        <p class="region-stat__value">{{ formatNumber(region.population) }}</p>
        <p class="region-stat__label">{{ t('Population') }}</p>
      </div>
      <div class="region-stat | card" padding-small>
        <p class="region-stat__value">{{ formatNumber(region.count - region.engaged) }}</p>
        <p class="region-stat__label">{{ t('Unengaged people groups') }}</p>
      </div>
    </div>

    <div class="stack stack--sm">
      <p class="text-center color-primary font-weight-bold">{{ mapNote }}</p>
      <ClientOnly>
        <CountryMap
          :country-codes="countryCodes"
          :center="region.center"
          :zoom="region.zoom"
          :bounds="region.bounds"
          :language-code="locale"
          :research-url="localePath('/research') + '/'"
          color-by-prayer
          class="rounded-xlg"
        />
      </ClientOnly>
    </div>

    <div class="switcher" data-width="xl">
      <div class="stack stack--lg | card | text-center" data-variant="secondary">
        <h2>{{ t('Prayer Coverage') }}</h2>
        <div>
          <p class="font-size-4xl font-weight-medium">{{ formatNumber(region.peopleCommitted) }}</p>
          <p class="font-size-lg">{{ t('People committed to praying') }}</p>
        </div>
        <div class="stack stack--xs">
          <div
            class="progress-bar prayer-coverage-segments"
            data-size="md"
            :aria-label="t('Prayer coverage progress')"
          >
            <div class="prayer-coverage-segment prayer-coverage-segment--full" :style="{ width: `${percentOfRegion(region.withFullPrayer)}%` }" />
            <div class="prayer-coverage-segment prayer-coverage-segment--partial" :style="{ width: `${percentOfRegion(partialPrayerCount)}%` }" />
            <div class="prayer-coverage-segment prayer-coverage-segment--none" :style="{ width: `${percentOfRegion(noPrayerCount)}%` }" />
          </div>
          <div class="prayer-coverage-legend">
            <span><i class="prayer-coverage-key prayer-coverage-key--full" />{{ t('100+ People Praying') }}: {{ formatNumber(region.withFullPrayer) }}</span>
            <span><i class="prayer-coverage-key prayer-coverage-key--partial" />{{ t('1+ People Praying') }}: {{ formatNumber(partialPrayerCount) }}</span>
            <span><i class="prayer-coverage-key prayer-coverage-key--none" />{{ t('No One Praying') }}: {{ formatNumber(noPrayerCount) }}</span>
          </div>
        </div>
        <p class="region-goal">
          <strong>{{ t('Goal') }}:</strong> {{ t('Mobilize 100+ people praying daily for each DOXA people group') }}
        </p>
      </div>

      <div class="stack stack--lg | card | text-center" data-variant="primary">
        <h2>{{ t('Adoption Progress') }}</h2>
        <div>
          <p class="font-size-4xl font-weight-medium">{{ formatNumber(region.adopted) }} / {{ formatNumber(region.count) }}</p>
          <p class="font-size-lg">{{ t('people groups adopted') }}</p>
        </div>
        <div class="progress-bar" data-size="md">
          <div class="progress-bar__slider" :style="{ width: `${percentOfRegion(region.adopted)}%` }" />
        </div>
        <p class="region-goal">
          <strong>{{ t('Goal') }}:</strong> {{ t('Every unengaged people group adopted by a church committed to prayer, giving, and sending') }}
        </p>
      </div>

      <div class="stack stack--lg | card | text-center" data-variant="primary">
        <h2>{{ t('Engagement Progress') }}</h2>
        <div>
          <p class="font-size-4xl font-weight-medium">{{ formatNumber(region.engaged) }} / {{ formatNumber(region.count) }}</p>
          <p class="font-size-lg">{{ t('people groups engaged') }}</p>
        </div>
        <div class="progress-bar" data-size="md">
          <div class="progress-bar__slider" :style="{ width: `${percentOfRegion(region.engaged)}%` }" />
        </div>
        <p class="region-goal">
          <strong>{{ t('Goal') }}:</strong> {{ t('No unengaged people groups by 2033') }}
        </p>
      </div>
    </div>

    <section class="stack stack--md">
      <h2>{{ t('Countries in this region') }}</h2>
      <div class="table-scroll">
        <table class="region-table">
          <thead>
            <tr>
              <th>{{ t('Country') }}</th>
              <th>{{ t('People Groups') }}</th>
              <th>{{ t('1+ People Praying') }}</th>
              <th>{{ t('Adopted') }}</th>
              <th>{{ t('Engaged') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in region.countries" :key="c.slug">
              <td><NuxtLink :to="localePath(`/regions/${c.slug}`)">{{ c.name }}</NuxtLink></td>
              <td>{{ formatNumber(c.count) }}</td>
              <td>{{ formatNumber(c.withPrayer) }}</td>
              <td>{{ formatNumber(c.adopted) }}</td>
              <td>{{ formatNumber(c.engaged) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.region-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-md);
}

.region-stat {
  text-align: center;
}

.region-stat__value {
  font-family: var(--font-family-heading);
  font-size: var(--font-size-3xl);
  line-height: 1;
}

.region-stat__label {
  margin-top: var(--spacing-2xs);
  font-size: var(--font-size-sm);
  color: var(--color-brand-lighter);
}

.region-goal {
  margin-top: auto;
  font-size: var(--font-size-sm);
}

.prayer-coverage-segments {
  display: flex;
  height: clamp(15px, 6vw, 25px);
  padding-top: 0 !important;
}

.prayer-coverage-segment {
  height: 100%;
  transition: width 1s ease-out;
}

.prayer-coverage-segment--none {
  background: var(--color-brand-light);
}

.prayer-coverage-segment--partial {
  background: #f0c64a;
}

.prayer-coverage-segment--full {
  background: var(--color-brand-primary);
}

.prayer-coverage-legend {
  display: grid;
  justify-content: center;
  gap: 0.35rem;
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-align: center;
}

.prayer-coverage-legend span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.prayer-coverage-key {
  display: inline-block;
  flex: 0 0 auto;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 100px;
}

.prayer-coverage-key--none {
  background: var(--color-brand-light);
}

.prayer-coverage-key--partial {
  background: #f0c64a;
}

.prayer-coverage-key--full {
  background: var(--color-brand-primary);
}

.table-scroll {
  overflow-x: auto;
}

.region-table {
  width: 100%;
  min-width: 560px;
}

.region-table th,
.region-table td {
  padding: var(--spacing-2xs) var(--spacing-sm);
  text-align: start;
}

.region-table th:not(:first-child),
.region-table td:not(:first-child) {
  text-align: end;
}

.region-table th {
  background-color: var(--color-surface-brand-lighter);
  color: var(--color-text-on-brand-lighter);
  font-weight: var(--font-weight-medium);
}
</style>
