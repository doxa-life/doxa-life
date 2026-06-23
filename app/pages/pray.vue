<script setup lang="ts">
// Port of marketing-theme/page-pray.php.

import { buildUupgListTranslations } from '~/utils/uupgListTranslations'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()

const prayBaseUrl = config.public.prayBaseUrl as string
const selectUrl = computed(() =>
  locale.value !== 'en' ? `${prayBaseUrl}/${locale.value}/` : `${prayBaseUrl}/`
)

const translations = computed(() => buildUupgListTranslations(t))

const {
  stats,
  totalPeopleGroups,
  totalPeopleGroupsFormatted,
  reload,
  ensureLoaded
} = usePrayerStatistics()
await ensureLoaded()
onMounted(() => reload())

const mapboxToken = config.public.mapboxToken as string

const prayMapConfig = JSON.stringify({
  profile: 'doxa-simple-map',
  dataSource: 'pray-tools',
  tk: mapboxToken,
  tabs: [{ id: 'prayer', colorStrategy: 'prayer', legend: 'prayer', popup: 'prayer' }]
})

const prayFeedbackConfig = JSON.stringify({
  profile: 'chat-bubble',
  apiBase: 'https://support.gospelambition.org',
  enabled: true,
  showByDefault: false,
  instanceId: 'fb-pray-map',
  projectId: '809ee16b-46e2-4bcd-a93d-b7ea0879d93d'
})

const DEMO_PRAYER_COVERAGE = {
  enabled: false,
  complete: 100,
  partial: 1300
}

const noPrayerCount = computed(() => {
  if (DEMO_PRAYER_COVERAGE.enabled) {
    return Math.max(0, totalPeopleGroups.value - DEMO_PRAYER_COVERAGE.partial - DEMO_PRAYER_COVERAGE.complete)
  }
  return Math.max(0, totalPeopleGroups.value - stats.value.total_with_prayer)
})
const partialPrayerCount = computed(() =>
  DEMO_PRAYER_COVERAGE.enabled
    ? DEMO_PRAYER_COVERAGE.partial
    : Math.max(0, stats.value.total_with_prayer - stats.value.total_with_full_prayer)
)
const fullPrayerCount = computed(() =>
  DEMO_PRAYER_COVERAGE.enabled ? DEMO_PRAYER_COVERAGE.complete : stats.value.total_with_full_prayer
)

function getCoveragePercent(count: number) {
  return `${Math.min(100, (count / totalPeopleGroups.value) * 100)}%`
}

useTextHighlight()
</script>

<template>
  <div class="pray-page bg-secondary">
    <section>
      <div class="container stack stack--2xl">
        <div class="stack stack-md">
          <h1 class="h2 highlight" data-highlight-index="1">
            {{ t('Prayer for an unengaged people group') }}
          </h1>
          <p class="subtext">{{ t('Help prepare the way for gospel engagement through prayer') }}</p>
        </div>
        <div class="three-part-switcher">
          <div class="card-two-tone | text-center grow-1">
            <div class="stack stack--lg">
              <h2 class="h3">{{ t('Prayer Goal') }}</h2>
              <p class="subtext font-size-md">{{ t('Mobilize 100+ people praying daily for each DOXA people group') }}</p>
            </div>
            <div class="stack stack--lg">
              <h2 class="h3">{{ t('Current Status') }}</h2>
              <div class="stack stack--3xs">
                <p class="subtext font-size-md">{{ t('Out of {0} DOXA people groups:', [totalPeopleGroupsFormatted]) }}</p>
                <div
                  class="progress-bar prayer-coverage-segments"
                  data-size="md"
                  :aria-label="t('Prayer coverage progress')"
                >
                  <div
                    id="prayer-current-status-percentage"
                    class="prayer-coverage-segment prayer-coverage-segment--full"
                    :style="{ width: getCoveragePercent(fullPrayerCount) }"
                  />
                  <div
                    class="prayer-coverage-segment prayer-coverage-segment--partial"
                    :style="{ width: getCoveragePercent(partialPrayerCount) }"
                  />
                  <div
                    class="prayer-coverage-segment prayer-coverage-segment--none"
                    :style="{ width: getCoveragePercent(noPrayerCount) }"
                  />
                </div>
                <div class="prayer-coverage-legend">
                  <span><i class="prayer-coverage-key prayer-coverage-key--full" />{{ t('100+ People Praying') }}: {{ fullPrayerCount }}</span>
                  <span><i class="prayer-coverage-key prayer-coverage-key--partial" />{{ t('1+ People Praying') }}: {{ partialPrayerCount }}</span>
                  <span><i class="prayer-coverage-key prayer-coverage-key--none" />{{ t('No One Praying') }}: {{ noPrayerCount }}</span>
                </div>
              </div>
            </div>
          </div>
          <div
            class="grow-2 bg-image rounded-md"
            style="background-image: url('/assets/images/pray-01-hero.jpg'); background-image: image-set(url('/assets/images/pray-01-hero.avif') type('image/avif'), url('/assets/images/pray-01-hero.webp') type('image/webp'), url('/assets/images/pray-01-hero.jpg') type('image/jpeg'));"
          />
        </div>
      </div>
    </section>

    <section>
      <div class="container stack stack--lg">
        <h2>{{ t('Prayer Progress') }}</h2>
        <DoxaMapSlot map-id="pray-map" :profile-config="prayMapConfig" class="rounded-md">
          <FeedbackWidgetSlot :profile-config="prayFeedbackConfig" />
        </DoxaMapSlot>
      <NuxtLink
        :to="localePath('/research')"
        class="research-map-link"
      >
        Explore our research maps →
      </NuxtLink>
      </div>
    </section>

    <section class="surface-brand-light">
      <div class="container stack stack--3xl">
        <h2>{{ t('Where do I start?') }}</h2>
        <div class="switcher | gap-md">
          <div class="step-card">
            <div class="step-card__number">1</div>
            <div class="step-card__content" data-no-action>
              <h2 class="step-card__title overflow-wrap-anywhere">{{ t('Choose') }}</h2>
              <p>{{ t('Choose an unengaged people group you will commit to pray for daily.') }}</p>
            </div>
          </div>
          <div class="step-card">
            <div class="step-card__number">2</div>
            <div class="step-card__content" data-no-action>
              <h2 class="step-card__title overflow-wrap-anywhere">{{ t('Sign up') }}</h2>
              <p>{{ t('Sign up to receive daily prayer points and updates for this people group.') }}</p>
            </div>
          </div>
          <div class="step-card">
            <div class="step-card__number">3</div>
            <div class="step-card__content" data-no-action>
              <h2 class="step-card__title overflow-wrap-anywhere">{{ t('Pray') }}</h2>
              <p>{{ t('Pray daily and help provide complete prayer coverage for a people group.') }}</p>
            </div>
          </div>
        </div>
        <a href="#choose-people-group" class="button | compact mx-auto">{{ t('Get Started') }}</a>
      </div>
    </section>

    <section>
      <div class="container">
        <div class="switcher | align-center" data-width="xl">
          <div class="stack | grow-2 align-center">
            <div class="stack stack--2xl">
              <h2 class="highlight" data-highlight-index="2">{{ t('Your daily prayer guide') }}</h2>
              <ul class="stack stack--sm" data-list-color="primary">
                <li>{{ t('Scripture-centered prayer themes') }}</li>
                <li>{{ t('Spirit-led reflection and guidance') }}</li>
                <li>{{ t('Real prayer needs from the field') }}</li>
                <li>{{ t('Photos, stories and testimonies') }}</li>
                <li>{{ t('Key insights about the people group') }}</li>
              </ul>
            </div>
          </div>
          <div>
            <picture>
              <source
                srcset="/assets/images/pray-02-PrayerFUEL-Phone-graphic-2.avif"
                type="image/avif"
              >
              <source
                srcset="/assets/images/pray-02-PrayerFUEL-Phone-graphic-2.webp"
                type="image/webp"
              >
              <img
                class="center"
                src="/assets/images/pray-02-PrayerFUEL-Phone-graphic-2.png"
                :alt="t('Your daily prayer guide')"
                width="500"
                height="872"
                loading="lazy"
              >
            </picture>
          </div>
        </div>
      </div>
    </section>

    <section class="surface-white">
      <div class="container">
        <div class="stack stack--lg">
          <h2>{{ t('Why prayer matters') }}</h2>
          <div class="switcher | gap-md" data-width="xl">
            <div class="switcher-item center grow-none">
              <picture>
                <source
                  srcset="/assets/images/Pray-04-Doxa.avif"
                  type="image/avif"
                >
                <source
                  srcset="/assets/images/Pray-04-Doxa.webp"
                  type="image/webp"
                >
                <img
                  src="/assets/images/Pray-04-Doxa.jpg"
                  :alt="t('Adopt an unengaged people group')"
                  width="150"
                  height="179"
                  loading="lazy"
                >
              </picture>
            </div>
            <div class="stack stack--lg | text-card | surface-brand-lightest justify-center">
              <h4 class="font-heading font-size-2xl">{{ t('They have no one praying for them') }}</h4>
              <p>{{ t('Many unengaged people groups have no churches, no missionaries, and often no believers, meaning little to no consistent prayer is being offered on their behalf.') }}</p>
            </div>
          </div>
          <div class="switcher | gap-md" data-width="xl">
            <div class="switcher-item center grow-none">
              <picture>
                <source
                  srcset="/assets/images/Pray-05-Doxa.avif"
                  type="image/avif"
                >
                <source
                  srcset="/assets/images/Pray-05-Doxa.webp"
                  type="image/webp"
                >
                <img
                  src="/assets/images/Pray-05-Doxa.jpg"
                  :alt="t('Adopt an unengaged people group')"
                  width="150"
                  height="193"
                  loading="lazy"
                >
              </picture>
            </div>
            <div class="stack stack--lg | text-card | surface-brand-lightest justify-center">
              <h4 class="font-heading font-size-2xl">{{ t('Prayer prepares the way for the gospel') }}</h4>
              <p>{{ t('Prayer softens hearts, opens doors, and invites the work of the Holy Spirit long before workers arrive or the gospel is proclaimed.') }}</p>
            </div>
          </div>
          <div class="switcher | gap-md" data-width="xl">
            <div class="switcher-item center grow-none">
              <picture>
                <source
                  srcset="/assets/images/Pray-06-Doxa.avif"
                  type="image/avif"
                >
                <source
                  srcset="/assets/images/Pray-06-Doxa.webp"
                  type="image/webp"
                >
                <img
                  src="/assets/images/Pray-06-Doxa.jpg"
                  :alt="t('Adopt an unengaged people group')"
                  width="150"
                  height="191"
                  loading="lazy"
                >
              </picture>
            </div>
            <div class="stack stack--lg | text-card | surface-brand-lightest justify-center">
              <h4 class="font-heading font-size-2xl">{{ t('Prayer unites the global church') }}</h4>
              <p>{{ t("When we pray, we join believers around the world in God's mission, standing together for peoples still waiting to hear the name of Jesus.") }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="surface-brand-dark">
      <div class="container stack stack--3xl">
        <div class="stack stack--md">
          <h2 id="choose-people-group">{{ t('Choose a people group') }}</h2>
          <p class="subtext">{{ t('Select a highlighted unengaged people group, or search for a specific group or location below.') }}</p>
        </div>
        <UupgsList
          :languageCode="locale"
          :selectUrl="selectUrl"
          :researchUrl="localePath('/research') + '/'"
          :t="translations"
          :perPage="6"
          :morePerPage="12"
          dontShowListOnLoad
          useSelectCard
          useHighlightedUUPGs
        />
      </div>
    </section>

    <section>
      <div class="container stack stack--5xl">
        <figure class="text-center font-size-5xl font-heading">
          <blockquote class="overflow-wrap-anywhere">{{ t('Pray earnestly to the Lord of the harvest ...that He would send laborers to the [Unengaged].') }}</blockquote>
          <figcaption>- {{ t('Jesus') }}</figcaption>
        </figure>
        <div>
          <picture>
            <source
              srcset="/assets/images/pray-03-bottom-unsplash.avif"
              type="image/avif"
            >
            <source
              srcset="/assets/images/pray-03-bottom-unsplash.webp"
              type="image/webp"
            >
            <img
              src="/assets/images/pray-03-bottom-unsplash.jpg"
              :alt="t('Jesus')"
              width="1200"
              height="328"
              loading="lazy"
            >
          </picture>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.research-map-link {
  display: block;
  margin-top: 0.75rem;
  text-align: right;
  font-size: 1.2rem;
  color: var(--color-brand-primary, #3b463d);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.research-map-link:hover {
  color: var(--color-brand-primary-darker, #1f2328);
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
  gap: 0.55rem;
  margin-top: 0.85rem;
  font-size: clamp(1.2rem, 1.6vw, 1.45rem);
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
</style>
