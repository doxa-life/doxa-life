<script setup lang="ts">
// Port of marketing-theme/front-page.php.
// Each <section> mirrors the PHP source in the same order with the same
// CUBE classes, data attributes, asset paths, and strings. Dynamic bits
// (reel, stats counters, video modal) are delegated to the corresponding
// Phase 2 components.

import { getVideoUrl } from '~/utils/videoUrls'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()

const videoModalRef = ref<{ open: () => void; close: () => void } | null>(null)
const videoUrl = computed(() => getVideoUrl(locale.value))

function openVideo() {
  videoModalRef.value?.open()
}

const mapboxToken = config.public.mapboxToken as string

const homeMapConfig = JSON.stringify({
  profile: 'doxa-simple-map',
  dataSource: 'pray-tools',
  tk: mapboxToken,
  tabs: [{ id: 'engagement', colorStrategy: 'engagement', legend: 'engagement', popup: 'engagement' }]
})

const homeFeedbackConfig = JSON.stringify({
  profile: 'chat-bubble',
  apiBase: 'https://support.gospelambition.org',
  enabled: true,
  instanceId: 'fb-home-map',
  projectId: '7bb8f5ba-eb45-4933-89de-bc93fcda09b2'
})

useDoxaMap()

useTextHighlight()
</script>

<template>
  <div class="front-page">
    <section class="stack stack--md container">
      <div>
        <h2 class="color-brand">{{ t('Our gift to Jesus') }}:</h2>
        <h1
          class="color-brand-light highlight"
          data-highlight-index="1"
          data-highlight-last
          data-highlight-color="primary"
        >{{ t('Engage every people by 2033') }}</h1>
      </div>
      <div class="video-modal-button" @click="openVideo">
        <svg class="icon">
          <use href="/assets/icons/play-button.svg#play-button" />
        </svg>
        <img
          class="rounded-xlg"
          src="/assets/images/home-01-hero.jpg"
          :alt="t('Engage every people by 2033')"
        >
      </div>
      <p class="text-center color-primary uppercase font-button font-weight-medium">
        {{ t('The DOXA Vision: Click image to watch the video') }}
      </p>
    </section>

    <section class="stack stack--md container">
      <div>
        <h2 class="color-brand">{{ t('Where are they?') }}</h2>
        <h1
          class="color-brand-light highlight"
          data-highlight-index="1"
          data-highlight-last
          data-highlight-color="primary"
        >{{ t('Unengaged peoples around the world') }}</h1>
      </div>
      <div class="doxa-map-slot rounded-xlg">
        <doxa-map id="home-map" :profile-config="homeMapConfig" />
        <div class="feedback-widget-slot feedback-widget-slot--home">
          <feedback-widget :profile-config="homeFeedbackConfig" />
        </div>
      </div>
    </section>

    <section class="stack stack--md | surface-brand-light">
      <div class="container stack stack--4xl">
        <div class="stack stack--2xl">
          <h2 class="highlight" data-highlight-index="1">
            {{ t('{0} unengaged people groups', ['2,085']) }}
          </h2>
          <p class="subtext">
            {{ t('Our hope is to see each of them covered in 24-hour prayer, and your church can be part of it.') }}
          </p>
        </div>
        <PeopleGroupReel
          :research-url="localePath('/research') + '/'"
          :language-code="locale"
        />
        <div class="stack stack--2xl">
          <h2 class="highlight" data-highlight-last>{{ t('A simple path to faithful obedience') }}</h2>
          <div class="switcher | gap-md">
            <div class="step-card">
              <div class="step-card__number">1</div>
              <div class="step-card__content">
                <h2 class="step-card__title">{{ t('Pray') }}</h2>
                <p>{{ t('Receive daily prayer points and join believers worldwide in prayer for the unengaged peoples.') }}</p>
              </div>
              <NuxtLink :to="localePath('/pray')" class="button | compact">{{ t('Join') }}</NuxtLink>
            </div>
            <div class="step-card">
              <div class="step-card__number">2</div>
              <div class="step-card__content">
                <h2 class="step-card__title">{{ t('Adopt') }}</h2>
                <p>{{ t('Churches and networks take ownership – praying, giving, and preparing the way for gospel workers.') }}</p>
              </div>
              <NuxtLink :to="localePath('/adopt')" class="button | compact">{{ t('Commit') }}</NuxtLink>
            </div>
            <div class="step-card">
              <div class="step-card__number">3</div>
              <div class="step-card__content">
                <h2 class="step-card__title">{{ t('Engage') }}</h2>
                <p>{{ t('God raises up men and women to go, serve, and proclaim Christ among the nations.') }}</p>
              </div>
              <a href="#" class="button | compact invisible-placeholder">{{ t('Commit') }}</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      class="bg-image"
      style="background-image: url('/assets/images/home-02-WhoAreTheUnreached-new.jpg');"
    >
      <h2 class="text-center banner-title invisible-placeholder">{{ t('Who are the unengaged?') }}</h2>
    </section>

    <section class="overflow-hidden progress-section">
      <div class="container stack stack--xl">
        <h2 class="color-white text-center progress-section__title">{{ t('Who are the unengaged?') }}</h2>
        <div class="concentric-circles | gap-md">
          <div class="switcher-item">
            <div class="info-card color-brand-dark justify-center">
              <div class="stack stack--lg | info-card__content">
                <h3 class="color-brand-lighter">{{ t('Unreached') }}</h3>
                <span>{{ t('{0} Billion', ['3.9']) }}</span>
                <span class="color-brand-lighter">{{ t('{0} People Groups', ['6,602']) }}</span>
              </div>
            </div>
          </div>
          <div class="switcher-item">
            <div class="info-card color-secondary-very-light justify-center">
              <div class="stack stack--lg | info-card__content">
                <h3>{{ t('Under-Engaged') }}</h3>
                <span class="color-secondary-light">{{ t('{0} Billion', ['3.3']) }}</span>
                <span>{{ t('{0} People Groups', ['5,119']) }}</span>
              </div>
            </div>
          </div>
          <div class="switcher-item">
            <div class="info-card color-secondary-very-light justify-center">
              <div class="stack stack--lg | info-card__content">
                <h3>{{ t('Frontier People') }}</h3>
                <span class="color-secondary-light">{{ t('{0} Billion', ['2']) }}</span>
                <span>{{ t('{0} People Groups', ['4,788']) }}</span>
              </div>
            </div>
          </div>
          <div class="switcher-item">
            <div class="info-card surface-brand-dark justify-center">
              <div class="stack stack--lg | info-card__content">
                <h3>{{ t('Unengaged') }}</h3>
                <span>{{ t('{0} Million', ['202']) }}</span>
                <span>{{ t('{0} People Groups', ['2,085']) }}</span>
              </div>
            </div>
          </div>
        </div>
        <NuxtLink :to="localePath('/about/definitions')" class="with-icon | light-link mx-auto">
          {{ t('Learn More') }}
          <svg class="icon | rotate-90">
            <use href="/assets/icons/arrow-chevron.svg#chevron-up" />
          </svg>
        </NuxtLink>
      </div>
    </section>

    <section class="surface-white">
      <div class="container stack stack--xl">
        <h2>{{ t('Vision 2033') }}</h2>
        <div class="">
          <div class="switcher" data-width="xl">
            <div class="switcher-item center grow-none">
              <img
                class="center"
                src="/assets/images/home-03-Vision-2033.jpg"
                :alt="t('Vision 2033')"
                style="width: clamp(150px, 25vw, 350px);"
              >
            </div>
            <div class="switcher-item align-center justify-center">
              <div class="stack stack--xl">
                <h3 class="subtext">{{ t('In partnership with the global church, our vision is for...') }}</h3>
                <ul class="stack stack--md" data-list-color="primary">
                  <li>{{ t('Daily 24-hour prayer coverage for all 2,085 unengaged peoples') }}</li>
                  <li>{{ t('No unengaged people groups by 2033') }}</li>
                  <li>{{ t('Mobilization of 20,000+ DOXA partnership missionaries') }}</li>
                  <li>{{ t('Fruitful engagement among frontier peoples and the under-engaged') }}</li>
                  <li>{{ t('Church planting movements among every unreached people on earth') }}</li>
                </ul>
                <NuxtLink :to="localePath('/about/vision')" class="with-icon | color-primary-darker ms-auto">
                  {{ t('More') }}
                  <svg class="icon | rotate-90">
                    <use href="/assets/icons/arrow-chevron.svg#chevron-up" />
                  </svg>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="surface-brand-light">
      <div class="container stack stack--3xl">
        <h2 class="highlight" data-highlight-last>{{ t('Engagement starts with prayer') }}</h2>
        <div class="switcher | align-center">
          <div class="switcher-item center grow-none">
            <img
              src="/assets/images/home-04-EngagementStartsWithPrayer.jpg"
              :alt="t('Engagement starts with prayer')"
            >
          </div>
          <div>
            <div class="stack stack--3xl | align-center">
              <p class="text-center max-width-md font-size-lg">{{ t('Every movement of the gospel begins with intercession. Cover an unengaged people group in daily prayer and help prepare the way.') }}</p>
              <NuxtLink :to="localePath('/pray')" class="button | compact">{{ t('Pray') }}</NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section>
      <div class="switcher container | gap-md" data-width="xl">
        <div
          class="switcher-item card | padding-clamp-2xl bg-image align-center"
          style="background-image: url('/assets/images/home-doxa-background.jpg');"
        >
          <div class="stack stack--md | text-center text-secondary">
            <h2>{{ t('What does "DOXA" mean?') }}</h2>
            <p class="subtext">{{ t('DOXA is the Greek word for "GLORY".') }}</p>
            <p>{{ t('We chose this name because Jesus is worthy of glory from every tribe, tongue, people, and nation. DOXA reminds us that we partner with the whole Church to take the whole gospel to the whole world – until people from every nation are worshipping Jesus and He alone receives all the glory.') }}</p>
          </div>
        </div>
        <div class="switcher-item center grow-none">
          <img
            class="rounded-xlg"
            src="/assets/images/home-05-WhatDoesDoxaMean.jpg"
            :alt="t('Engagement starts with prayer')"
          >
        </div>
      </div>
    </section>

    <VideoModal
      ref="videoModalRef"
      :src="videoUrl"
      :title="t('Engage every people by 2033')"
      :close-label="t('Close video')"
    />
  </div>
</template>
