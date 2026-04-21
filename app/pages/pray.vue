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

const { stats, prayerCoveragePercent } = usePrayerStatistics()
const { reload } = usePrayerStatistics()
onMounted(() => reload())

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
              <p class="subtext font-size-md">{{ t('24-Hour Prayer Coverage') }}</p>
              <p class="subtext font-size-md">{{ t('Mobilize 144+ people praying 10 minutes a day for all 2,085 people groups') }}</p>
            </div>
            <div>
              <h2 class="h3">{{ t('Current Status') }}</h2>
              <span class="font-size-4xl font-weight-bold font-button">
                <span id="prayer-current-status">{{ stats.total_with_full_prayer }}</span> / 2085
              </span>
              <div class="stack stack--3xs">
                <p class="subtext font-size-md">{{ t('People groups with committed 24-hour prayer coverage') }}</p>
                <div class="progress-bar" data-size="md">
                  <div
                    id="prayer-current-status-percentage"
                    class="progress-bar__slider"
                    :style="{ width: `${prayerCoveragePercent}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
          <div
            class="grow-2 bg-image rounded-md"
            style="background-image: url('/assets/images/pray-01-hero.jpg');"
          />
        </div>
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
              <p>{{ t('Pray for 10 minutes a day and help provide 24-hour prayer coverage.') }}</p>
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
            <img
              class="center"
              src="/assets/images/pray-02-PrayerFUEL-Phone-graphic-2.png"
              :alt="t('Your daily prayer guide')"
            >
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
              <img src="/assets/images/Pray-04-Doxa.jpg" :alt="t('Adopt an unengaged people group')">
            </div>
            <div class="stack stack--lg | text-card | surface-brand-lightest justify-center">
              <h4 class="font-heading font-size-2xl">{{ t('They have no one praying for them') }}</h4>
              <p>{{ t('Many unengaged people groups have no churches, no missionaries, and often no believers, meaning little to no consistent prayer is being offered on their behalf.') }}</p>
            </div>
          </div>
          <div class="switcher | gap-md" data-width="xl">
            <div class="switcher-item center grow-none">
              <img src="/assets/images/Pray-05-Doxa.jpg" :alt="t('Adopt an unengaged people group')">
            </div>
            <div class="stack stack--lg | text-card | surface-brand-lightest justify-center">
              <h4 class="font-heading font-size-2xl">{{ t('Prayer prepares the way for the gospel') }}</h4>
              <p>{{ t('Prayer softens hearts, opens doors, and invites the work of the Holy Spirit long before workers arrive or the gospel is proclaimed.') }}</p>
            </div>
          </div>
          <div class="switcher | gap-md" data-width="xl">
            <div class="switcher-item center grow-none">
              <img src="/assets/images/Pray-06-Doxa.jpg" :alt="t('Adopt an unengaged people group')">
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
      <div class="container stack stack--lg">
        <h2>{{ t('Prayer Progress') }}</h2>
        <PrayerMap
          :research-url="localePath('/research') + '/'"
          :language-code="locale"
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
          <img src="/assets/images/pray-03-bottom-unsplash.jpg" :alt="t('Jesus')">
        </div>
      </div>
    </section>
  </div>
</template>
