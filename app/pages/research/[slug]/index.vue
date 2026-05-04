<script setup lang="ts">
// Port of marketing-theme/template-uupg-detail.php.
// Fetches the people group by slug from
// `{prayBaseUrl}/api/people-groups/detail/{slug}?lang={locale}` and renders
// the detail page. Matches the PHP markup verbatim (classes, structure,
// copy, and icons).

import type { Uupg, ValueLabel } from '~/types/uupg'

interface PictureCredit {
  link: string | null
  text: string
}

interface UupgDetail extends Omit<Uupg, 'picture_credit'> {
  picture_credit?: PictureCredit[] | null
  engagement_status: ValueLabel
  adopted_by_names?: string[]
  people_committed: number
  latitude?: string | number | null
  longitude?: string | number | null
  primary_language?: ValueLabel
  imb_alternate_name?: string
  imb_people_description?: string | null
  imb_bible_available?: boolean
  imb_bible_stories_available?: boolean
  imb_jesus_film_available?: boolean
  imb_radio_broadcast_available?: boolean
  imb_gospel_recordings_available?: boolean
  imb_audio_scripture_available?: boolean
  workers_long_term?: boolean | null
  work_in_local_language?: boolean | null
  disciple_and_church_multiplication?: boolean | null
  error?: string
}

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const config = useRuntimeConfig()

const slug = computed(() => String(route.params.slug || ''))

useTextHighlight()

const { data: uupg, error: uupgError } = await useAsyncData<UupgDetail | null>(
  `uupg-detail-${slug.value}-${locale.value}`,
  async () => {
    if (!slug.value) return null
    const url = `${config.public.prayBaseUrl}/api/people-groups/detail/${encodeURIComponent(slug.value)}?lang=${locale.value}`
    try {
      return await $fetch<UupgDetail>(url)
    } catch {
      return { error: 'not_found' } as UupgDetail
    }
  }
)

const notFound = computed(() => !uupg.value || 'error' in (uupg.value as UupgDetail))

// Mirror the PHP template: build the pray URL with locale prefix and
// ?source=doxalife tracker.
const prayUrl = computed(() => {
  const base = config.public.prayBaseUrl
  const s = slug.value
  const path = locale.value !== 'en' ? `/${locale.value}/${s}` : `/${s}`
  return `${base}${path}?source=doxalife`
})

// Adoption URL: /adopt/{slug} via translationUrl
const adoptUrl = computed(() => {
  const base = localePath('/adopt')
  return `${base.endsWith('/') ? base : base + '/'}${slug.value}`
})

const infoOpen = ref(false)

const statusItems = computed(() => {
  const u = uupg.value as UupgDetail
  return [
    { label: t('Prayer Status'), done: (u.people_committed ?? 0) > 0 },
    { label: t('Adoption Status'), done: (u.adopted_by_churches ?? 0) > 0 },
    { label: t('Cross-cultural workers present'), done: !!u.workers_long_term },
    { label: t('Work in local language & culture'), done: !!u.work_in_local_language },
    { label: t('Disciple & church multiplication'), done: !!u.disciple_and_church_multiplication }
  ]
})

const progressItems = computed(() => {
  const u = uupg.value as UupgDetail
  return [
    { label: t('Bible Translation'), done: !!u.imb_bible_available },
    { label: t('Bible Stories'), done: !!u.imb_bible_stories_available },
    { label: t('Jesus Film'), done: !!u.imb_jesus_film_available },
    { label: t('Radio Broadcasts'), done: !!u.imb_radio_broadcast_available },
    { label: t('Gospel Recordings'), done: !!u.imb_gospel_recordings_available },
    { label: t('Audio Scripture'), done: !!u.imb_audio_scripture_available }
  ]
})

const prayerCoveragePercent = computed(() => {
  const committed = (uupg.value as UupgDetail)?.people_committed ?? 0
  return Math.min(100, (Number(committed) / 144) * 100)
})

const mapSrc = computed(() => {
  const u = uupg.value as UupgDetail
  if (!u?.latitude || !u?.longitude) return ''
  const lat = Number(u.latitude)
  const lng = Number(u.longitude)
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 10},${lat - 10},${lng + 10},${lat + 10}&layer=mapnik&marker=${lat},${lng}`
})
</script>

<template>
  <div v-if="notFound || uupgError" class="container page-content uupg-detail-page">
    <div class="stack stack--lg">
      <h1>{{ t('People Group Not Found') }}</h1>
      <p>{{ t('The people group you are looking for could not be found. Please try again.') }}</p>
      <NuxtLink :to="localePath('/research')" class="button font-size-lg">
        <span class="sr-only">{{ t('Back') }}</span>
        <svg class="icon | rotate-270" viewBox="0 0 489.67 289.877">
          <path d="M439.017,211.678L263.258,35.919c-3.9-3.9-8.635-6.454-13.63-7.665-9.539-2.376-20.051.161-27.509,7.619L46.361,211.632c-11.311,11.311-11.311,29.65,0,40.961h0c11.311,11.311,29.65,11.311,40.961,0L242.667,97.248l155.39,155.39c11.311,11.311,29.65,11.311,40.961,0h0c11.311-11.311,11.311-29.65,0-40.961Z" />
        </svg>
        {{ t('Back') }}
      </NuxtLink>
    </div>
  </div>

  <div v-else-if="uupg" class="container page-content uupg-detail-page">
    <div class="stack stack--lg">
      <div class="stack stack--2xl">
        <div class="card switcher" padding-small>
          <div class="center | grow-none">
            <div class="position-relative">
              <img class="uupg__image" data-size="medium" :src="uupg.image_url" :alt="uupg.name || 'People Group Photo'">

              <template v-if="Array.isArray(uupg.picture_credit) && uupg.picture_credit.length">
                <button
                  id="info-button"
                  class="info__button"
                  type="button"
                  aria-haspopup="dialog"
                  :aria-expanded="infoOpen ? 'true' : 'false'"
                  :data-state="infoOpen ? 'open' : 'closed'"
                  aria-label="Photo credit"
                  @click="infoOpen = !infoOpen"
                >
                  <span class="info__icon" aria-hidden="true" />
                  <div class="info__content">
                    <template v-for="(credit, i) in uupg.picture_credit" :key="i">
                      <a
                        v-if="credit.link"
                        class="light-link"
                        :href="credit.link"
                        target="_blank"
                      >{{ credit.text }}</a>
                      <span v-else>{{ credit.text }}</span>
                    </template>
                  </div>
                </button>
              </template>
            </div>
            <div
              class="engaged-stamp"
              :data-engaged="uupg.engagement_status?.value === 'engaged' ? 'true' : 'false'"
            >
              <span v-if="uupg.engagement_status?.value === 'engaged'">{{ t('Engaged') }}</span>
              <span v-else>{{ t('Not Engaged') }}</span>
            </div>
          </div>
          <div class="stack stack--xs | uupg__header">
            <h4 class="font-base font-weight-medium">{{ uupg.name }}</h4>
            <p class="font-weight-medium font-size-lg">
              {{ uupg.country_code?.label }} ({{ uupg.rop1?.label }})
            </p>
            <p>{{ uupg.imb_people_description ?? uupg.location_description }}</p>

            <a
              v-if="locale === 'en'"
              :href="`/research/${slug}/resources/`"
              class="button compact | resources-button"
            >{{ t('View Adoption Resources') }}</a>
          </div>
        </div>

        <div id="engagement-status" class="card stack stack--2xs" padding-small>
          <h2 class="text-center">{{ t('Engagement Status') }}</h2>
          <div class="cluster justify-center">
            <div class="cluster justify-center align-start" data-width="md">
              <div
                v-for="(item, i) in statusItems"
                :key="i"
                class="status-item"
              >
                <img
                  v-if="item.done"
                  src="/assets/icons/Check-GreenCircle.png"
                  :alt="t('Done')"
                >
                <img
                  v-else
                  src="/assets/icons/RedX-Circle.png"
                  :alt="t('Not Done')"
                >
                <p>{{ item.label }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="switcher" data-width="xl">
          <div class="stack stack--xl | card | text-center lh-0" data-variant="secondary">
            <h2>{{ t('Prayer Status') }}</h2>
            <p class="font-size-4xl font-weight-medium">{{ uupg.people_committed }}</p>
            <p class="font-size-lg">{{ t('People committed to praying') }}</p>
            <div class="stack stack--sm">
              <div class="progress-bar" data-size="md">
                <div class="progress-bar__slider" :style="{ width: `${prayerCoveragePercent}%` }" />
              </div>
              <p class="font-size-lg font-weight-medium">{{ t('24-Hour Prayer Coverage') }}</p>
            </div>
            <a
              class="button fit-content mx-auto stack-spacing-4xl clamp-padding"
              :href="prayUrl"
            >{{ t('Sign up to pray') }}</a>
          </div>
          <div class="stack stack--xl | card | text-center lh-0" data-variant="primary">
            <h2>{{ t('Adoption Status') }}</h2>
            <p class="font-size-4xl font-weight-medium">{{ uupg.adopted_by_churches || 0 }}</p>
            <p class="font-size-lg margin-bottom-md">{{ t('churches / individuals have adopted this people group') }}</p>
            <ul v-if="uupg.adopted_by_names && uupg.adopted_by_names.length">
              <li v-for="(name, i) in uupg.adopted_by_names" :key="i">{{ name }}</li>
            </ul>

            <NuxtLink
              class="button fit-content mx-auto mt-auto clamp-padding"
              :to="adoptUrl"
            >{{ t('Adopt people group') }}</NuxtLink>
          </div>
        </div>

        <div v-if="uupg.latitude && uupg.longitude" class="map-card">
          <iframe class="map" :src="mapSrc" loading="lazy" />
          <div class="overlay" />
        </div>

        <div class="switcher" data-width="xl">
          <div class="card" data-variant="primary">
            <div class="stack">
              <h2 class="color-primary">{{ t('Overview') }}</h2>
              <p><strong>{{ t('Country') }}:</strong> {{ uupg.country_code?.label }}</p>

              <p v-if="uupg.imb_alternate_name">
                <strong>{{ t('Alternate Names') }}:</strong> {{ uupg.imb_alternate_name }}
              </p>
              <p><strong>{{ t('Population') }}:</strong> ~{{ uupg.population }}</p>
              <p><strong>{{ t('Primary Language') }}:</strong> {{ uupg.primary_language?.label }}</p>
              <p><strong>{{ t('Primary Religion') }}:</strong> {{ uupg.religion?.label }}</p>
              <p><strong>{{ t('Religious Practices') }}:</strong> <br>{{ uupg.religion?.description }}</p>
            </div>
          </div>
          <div class="stack | card" data-variant="primary">
            <h2 class="color-primary">{{ t('Progress') }}</h2>
            <p v-for="(item, i) in progressItems" :key="i" class="progress-item">
              <img
                v-if="item.done"
                src="/assets/icons/Check-GreenCircle.png"
                :alt="t('Done')"
              >
              <img
                v-else
                src="/assets/icons/RedX-Circle.png"
                :alt="t('Not Done')"
              >
              <strong>{{ item.label }}:</strong> {{ item.done ? t('Yes') : t('No') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
