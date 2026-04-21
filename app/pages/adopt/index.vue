<script setup lang="ts">
// Port of marketing-theme/page-adopt.php.

import { buildUupgListTranslations } from '~/utils/uupgListTranslations'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const translations = computed(() => ({
  ...buildUupgListTranslations(t),
  select: t('Adopt')
}))

const adoptBase = computed(() => {
  const p = localePath('/adopt')
  return p.endsWith('/') ? p : `${p}/`
})

const { stats, adoptedPercent, reload } = usePrayerStatistics()
onMounted(() => reload())

useTextHighlight()
</script>

<template>
  <div class="adopt-page bg-secondary">
    <section>
      <div class="container stack stack--2xl">
        <div class="stack stack-md">
          <h1 class="h2 highlight" data-highlight-index="1">{{ t('Adopt an unengaged people group') }}</h1>
          <p class="subtext">{{ t('A church-led commitment to pray, give, and send so that gospel access begins') }}</p>
        </div>
        <div class="three-part-switcher">
          <div class="card-two-tone | text-center grow-1">
            <div class="stack stack--lg">
              <h2 class="h3">{{ t('Adoption Goal') }}</h2>
              <p class="subtext font-size-md">{{ t('Every unengaged people group adopted by a church committed to prayer, giving, and sending') }}</p>
            </div>
            <div>
              <h2 class="h3">{{ t('Current Status') }}</h2>
              <span class="font-size-4xl font-weight-bold font-button">
                <span id="adopted-current-status">{{ stats.total_adopted }}</span> / 2085
              </span>
              <div class="stack stack--3xs">
                <p class="subtext font-size-md">{{ t('people groups adopted') }}</p>
                <div class="progress-bar" data-size="md">
                  <div
                    id="adopted-current-status-percentage"
                    class="progress-bar__slider"
                    :style="{ width: `${adoptedPercent}%` }"
                  />
                </div>
              </div>
            </div>
          </div>
          <div
            class="grow-2 bg-image rounded-md"
            style="background-image: url('/assets/images/adopt-01-africa-4women.jpg');"
          />
        </div>
      </div>
    </section>

    <section class="surface-brand-light">
      <div class="container stack stack--3xl">
        <h2>{{ t('How Adoption Works') }}</h2>
        <div class="switcher | gap-md">
          <div class="step-card">
            <div class="step-card__number">1</div>
            <div class="step-card__content" data-no-action>
              <h2 class="step-card__title overflow-wrap-anywhere">{{ t('Choose') }}</h2>
              <p>{{ t('Prayerfully select an unengaged people group to adopt.') }}</p>
            </div>
          </div>
          <div class="step-card">
            <div class="step-card__number">2</div>
            <div class="step-card__content" data-no-action>
              <h2 class="step-card__title overflow-wrap-anywhere">{{ t('Mobilize') }}</h2>
              <p>{{ t('Raise up 144+ daily intercessors to pray 10 minutes a day.') }}</p>
            </div>
          </div>
          <div class="step-card">
            <div class="step-card__number">3</div>
            <div class="step-card__content" data-no-action>
              <h2 class="step-card__title overflow-wrap-anywhere">{{ t('Partner') }}</h2>
              <p>{{ t('Partner through prayer, giving, and sending so that gospel access begins.') }}</p>
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
              <h2 class="highlight" data-highlight-index="1">{{ t('Adoption Guide & Resources') }}</h2>
              <ul class="stack stack--sm" data-list-color="primary">
                <li>{{ t('Step-by-step guidance for churches adopting a people group') }}</li>
                <li>{{ t('Tools to mobilize prayer and participation across your congregation') }}</li>
                <li>{{ t('Printable and digital resources to promote awareness and engagement') }}</li>
                <li>{{ t('Helpful tips for sustaining long-term commitment') }}</li>
              </ul>
            </div>
          </div>
          <div>
            <img class="center" src="/assets/images/adopt-02-ipad-mockup.png" :alt="t('Your daily prayer guide')">
          </div>
        </div>
      </div>
    </section>

    <section class="surface-white">
      <div class="container">
        <div class="stack stack--lg">
          <h2>{{ t('Why adoption matters') }}</h2>
          <div class="switcher | gap-md" data-width="xl">
            <div class="switcher-item center grow-none">
              <img src="/assets/images/Adopt-03-DurbetInMongolia.jpg" :alt="t('Adopt an unengaged people group')">
            </div>
            <div class="stack stack--lg | text-card | surface-brand-lightest justify-center">
              <h4 class="font-heading font-size-2xl">{{ t('They have no gospel access') }}</h4>
              <p>{{ t('Unengaged people groups have no missionaries, no churches, and often no known believers. Adoption helps ensure they are finally seen, prayed for, and intentionally pursued with the gospel.') }}</p>
            </div>
          </div>
          <div class="switcher | gap-md" data-width="xl">
            <div class="switcher-item center grow-none">
              <img src="/assets/images/Adopt-04-Maha-Brahmin-in-India.jpg" :alt="t('Adopt an unengaged people group')">
            </div>
            <div class="stack stack--lg | text-card | surface-brand-lightest justify-center">
              <h4 class="font-heading font-size-2xl overflow-wrap-anywhere">{{ t('Prayer opens the door for engagement') }}</h4>
              <p>{{ t('Adoption mobilizes 144+ daily intercessors, creating 24 hours of prayer that prepares the soil, breaks spiritual barriers, and supports workers who go. Every gospel movement begins with prayer.') }}</p>
            </div>
          </div>
          <div class="switcher | gap-md" data-width="xl">
            <div class="switcher-item center grow-none">
              <img src="/assets/images/Adopt-05-KamaraInGhana.jpg" :alt="t('Adopt an unengaged people group')">
            </div>
            <div class="stack stack--lg | text-card | surface-brand-lightest justify-center">
              <h4 class="font-heading font-size-2xl">{{ t("Churches become active partners in God's mission") }}</h4>
              <p>{{ t('Adoption invites the local church into meaningful participation - praying, giving, and sending – so that a people group moves from unengaged to engaged, and ultimately becomes a worshipping community for Jesus.') }}</p>
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
          :selectUrl="adoptBase"
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
          <blockquote class="overflow-wrap-anywhere">{{ t('I was a stranger and you invited me in.') }}</blockquote>
          <figcaption>- {{ t('Jesus') }}</figcaption>
        </figure>
        <div>
          <img src="/assets/images/adopt-bottom-banner.jpg" :alt="t('Jesus')">
        </div>
      </div>
    </section>
  </div>
</template>
