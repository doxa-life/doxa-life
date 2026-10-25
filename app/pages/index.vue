<script setup lang="ts">
// Port of marketing-theme/front-page.php.
// Each <section> mirrors the PHP source in the same order with the same
// CUBE classes, data attributes, asset paths, and strings. Dynamic bits
// (reel, stats counters, video modal) are delegated to the corresponding
// Phase 2 components.

import { getVideoUrl } from '~/utils/videoUrls'
import { usesLatinHeadings } from '~~/config/languages'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const config = useRuntimeConfig()

const videoModalRef = ref<{ open: () => void; close: () => void } | null>(null)
const videoUrl = computed(() => getVideoUrl(locale.value))

function openVideo() {
  videoModalRef.value?.open()
}

const { unengagedPeopleGroupsFormatted, totalPeopleGroupsFormatted, unengagedPopulation, ensureLoaded, reload } = usePrayerStatistics()
await ensureLoaded()
// This page is prerendered, so its payload carries build-time counts; refetch
// on the client so the figures track the live API between deploys.
onMounted(() => reload())

// Locale separators with Latin digits, matching usePrayerStatistics — for the
// bullseye's static figures (e.g. 3.9 → "3,9" and 6602 → "6.602" in pt).
const formatNumber = (n: number) => n.toLocaleString(`${locale.value}-u-nu-latn`)
// Population magnitudes in the locale's own grouping (3.9 billion, 39亿, 20.2 करोड़).
// Three significant digits so 201.6M stays 2.02亿 rather than collapsing to 2亿.
const formatPopulation = (n: number) => new Intl.NumberFormat(`${locale.value}-u-nu-latn`, {
  notation: 'compact',
  compactDisplay: 'long',
  maximumSignificantDigits: 3
}).format(n)

const mapboxToken = config.public.mapboxToken as string

// Preload the heading font (Bebas Neue) for the homepage hero h1 (the LCP text)
// so it renders without a swap flash. Scoped to this page rather than the shared
// layout because map-heavy pages (e.g. /research) don't paint Bebas in the
// critical window and would log an "unused preload" warning. Skipped for
// non-Latin scripts (config: latinHeadings: false), where the hero falls back to
// a different font and Bebas wouldn't be used.
const heroUsesBebas = usesLatinHeadings(locale.value)
useHead({
  link: heroUsesBebas
    ? [{ rel: 'preload', as: 'font', type: 'font/woff2', href: '/assets/fonts/BebasNeue/BebasNeue-Regular.woff2', crossorigin: '' }]
    : []
})

// THE MAP comes from this site's own copy of the dx-maps output (public/dx-maps/) and is loaded here,
// not through DoxaMapSlot, which loads the older bundle in public/js/. Mapbox with the site's token, as
// before; the keyless MapLibre when there is none. Its styles and boundaries live in the same tree, and
// the site's language is the map's.
const homeMapConfig = computed(() => JSON.stringify({
  profile: 'doxa-simple-map',
  dataSource: 'pray-tools',
  tabs: [{ id: 'engagement', colorStrategy: 'engagement', legend: 'engagement', popup: 'engagement' }],
  provider: mapboxToken ? 'mapbox' : 'maplibre',
  ...(mapboxToken ? { tk: mapboxToken } : {}),
  assetsBase: '/dx-maps/assets',
  locale: locale.value
}))
// THE MAP'S ELEMENT, <dxm-simple-map>: DX Maps' own name for it, so it never meets the older <doxa-map> elements
// elsewhere on the site, in whatever order the pages are visited. Its bundle comes from this site's own copy of
// the dx-maps output and is added once per visit. A load in progress is shared, and a failed load takes its tag
// away again, so a later page tries afresh; the page then shows without the map.
const MAP_TAG = 'dxm-simple-map'
const MAP_SCRIPT = '/dx-maps/doxa-simple-map/doxa-simple-map.js'
// FRESH, NOT STALE: a returning reader's browser may keep /dx-maps/ files for hours (no cache rule is sent for them), so
// the script is asked for once with cache 'no-cache' before it is added (a 304 when unchanged; a changed file replaces the
// stale copy), then added at its PLAIN address, so DX Maps' gallery still recognises it and never runs it twice.
function revalidate(src: string): Promise<void> {
  return fetch(src, { cache: 'no-cache', credentials: 'same-origin' })
    .then((r) => { if (r.status === 200 && r.body) r.body.cancel() })
    .catch(() => {})
}
function loadMapBundle(): Promise<void> {
  if (customElements.get(MAP_TAG)) return Promise.resolve()
  return revalidate(MAP_SCRIPT).then(() => addMapBundle())
}
function addMapBundle(): Promise<void> {
  if (customElements.get(MAP_TAG)) return Promise.resolve()
  const pending = document.querySelector<HTMLScriptElement>('script[data-dxl-map="' + MAP_TAG + '"]')
  if (pending) {
    return new Promise((resolve, reject) => {
      pending.addEventListener('load', () => customElements.get(MAP_TAG) ? resolve() : reject(new Error('the map bundle did not register')), { once: true })
      pending.addEventListener('error', () => reject(new Error('the map bundle failed to load')), { once: true })
    })
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const fail = (message: string) => {
      script.remove()
      reject(new Error(message))
    }
    script.src = MAP_SCRIPT
    script.dataset.dxlMap = MAP_TAG
    script.onload = () => customElements.get(MAP_TAG) ? resolve() : fail('the map bundle did not register')
    script.onerror = () => fail('the map bundle failed to load')
    document.head.appendChild(script)
  })
}
// THE PHONE HEIGHT, LOCKED IN PX: 80% of the window's height when the page opens (never under 320px), so the map
// box does not grow and shrink while the browser's address bar collapses and expands during a scroll, which also
// broke a drag on the map. It is measured again only when the WIDTH changes (a rotation), never on a height-only
// resize. Wider screens keep the stylesheet's height; 80svh there is the fallback until this runs.
// A phone: a narrow screen, or a touch screen held sideways (the same test as the stylesheet's phone rules).
const PHONE_QUERY = '(max-width: 768px), (pointer: coarse) and (max-height: 600px)'
function lockPhoneHeight(slot: HTMLElement): () => void {
  const PHONE = window.matchMedia(PHONE_QUERY)
  let width = -1
  const lock = () => {
    if (window.innerWidth === width) return
    width = window.innerWidth
    slot.style.height = PHONE.matches ? `${Math.max(320, Math.round(window.innerHeight * 0.8))}px` : ''
  }
  lock()
  window.addEventListener('resize', lock)
  return () => window.removeEventListener('resize', lock)
}
let unlockHeight: (() => void) | null = null
onMounted(() => { if (homeMapHost.value) unlockHeight = lockPhoneHeight(homeMapHost.value) })
onBeforeUnmount(() => unlockHeight?.())
// THE SCROLL BAND STEPS ASIDE FOR THE MAP'S PANELS. A panel the map's controls open (Share, and every other menu)
// sits at the map's top, under the band, so its ✕ could not be tapped. DX Maps says when a panel opens (the composed
// 'dxmaps:panel-open') and when it closes ('dxmaps:panel-close'). The band counts them (another panel can still be open
// when one closes) and stays off while the count is above 0; for builds without the close event, it also comes back
// after any tap once no panel is open in the map any more.
const padOff = ref(false)
let openPanels = 0
function mapPanelOpen(): boolean {
  const walk = (node: Element | ShadowRoot): boolean => {
    for (const n of node.querySelectorAll('*')) {
      if (n.classList.contains('mcm')) return true
      if (n.shadowRoot && walk(n.shadowRoot)) return true
    }
    return false
  }
  return !!homeMap && walk(homeMap.shadowRoot || homeMap)
}
const onPanelOpen = () => { openPanels++; padOff.value = true }
const onPanelClose = () => { openPanels = Math.max(0, openPanels - 1); padOff.value = openPanels > 0 }
const onAnyTap = () => {
  if (padOff.value) setTimeout(() => { if (!mapPanelOpen()) { openPanels = 0; padOff.value = false } }, 50)
}
onMounted(() => {
  homeMapHost.value?.addEventListener('dxmaps:panel-open', onPanelOpen)
  homeMapHost.value?.addEventListener('dxmaps:panel-close', onPanelClose)
  document.addEventListener('click', onAnyTap, true)
})
onBeforeUnmount(() => {
  homeMapHost.value?.removeEventListener('dxmaps:panel-open', onPanelOpen)
  homeMapHost.value?.removeEventListener('dxmaps:panel-close', onPanelClose)
  document.removeEventListener('click', onAnyTap, true)
})
// The prayer API the map reads is set before its script runs; the element is created once the bundle is in.
const homeMapHost = ref<HTMLElement | null>(null)
let homeMap: HTMLElement | null = null
onMounted(async () => {
  if (config.public.prayBaseUrl) window.MAP_APP_API_URL = config.public.prayBaseUrl as string
  try {
    await loadMapBundle()
  } catch (err) {
    console.error('[home map]', err)
    return
  }
  if (!homeMapHost.value) return
  homeMap = document.createElement(MAP_TAG)
  homeMap.id = 'home-map'
  homeMap.setAttribute('profile-config', homeMapConfig.value)
  homeMapHost.value.prepend(homeMap)
})
watch(homeMapConfig, (value) => { homeMap?.setAttribute('profile-config', value) })
onBeforeUnmount(() => {
  homeMap?.remove()
  homeMap = null
})

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
        <picture>
          <source
            srcset="/assets/images/home-01-hero.avif"
            type="image/avif"
          >
          <source
            srcset="/assets/images/home-01-hero.webp"
            type="image/webp"
          >
          <img
            class="rounded-xlg"
            src="/assets/images/home-01-hero.jpg"
            :alt="t('Engage every people by 2033')"
            width="1200"
            height="723"
            fetchpriority="high"
          >
        </picture>
      </div>
      <p class="text-center color-primary uppercase font-button font-weight-medium">
        {{ t('The DOXA Vision: Click image to watch the video') }}
      </p>
      <NuxtLink :to="localePath('/pray')" class="button mx-auto">
        {{ t('Sign up to pray') }}
      </NuxtLink>
    </section>

    <section class="stack stack--md container">
      <div>
        <h2 class="color-brand">{{ t('Where are they?') }}</h2>
        <h1
          class="color-brand-light highlight"
          data-highlight-index="1"
          data-highlight-last
          data-highlight-color="primary"
        >{{ t('DOXA people groups around the world') }}</h1>
      </div>
      <div ref="homeMapHost" class="doxa-map-slot rounded-xlg">
        <div class="doxa-map-scroll-pad doxa-map-scroll-pad--top" :class="{ 'is-off': padOff }" />
      </div>
      <NuxtLink
        :to="localePath('/research')"
        class="research-map-link"
      >
        Explore our research maps →
      </NuxtLink>
    </section>

    <section class="stack stack--md | surface-brand-light">
      <div class="container stack stack--4xl">
        <div class="stack stack--2xl">
          <h2 class="highlight" data-highlight-index="1">
            {{ t('{0} unengaged people groups', [unengagedPeopleGroupsFormatted]) }}
          </h2>
          <p class="subtext">
            {{ t('Our hope is to cover each of them in extraordinary prayer. You and your church can be part of it.') }}
          </p>
        </div>
        <PeopleGroupReel
          :research-url="localePath('/research') + '/'"
          :language-code="locale"
        />
        <NuxtLink :to="localePath('/pray')" class="center | button | compact">{{ t('Join') }}</NuxtLink>
      </div>
    </section>

    <section
      class="bg-image"
      style="background-image: url('/assets/images/home-02-WhoAreTheUnreached-new.jpg'); background-image: image-set(url('/assets/images/home-02-WhoAreTheUnreached-new.avif') type('image/avif'), url('/assets/images/home-02-WhoAreTheUnreached-new.webp') type('image/webp'), url('/assets/images/home-02-WhoAreTheUnreached-new.jpg') type('image/jpeg'));"
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
                <span>{{ formatPopulation(3_900_000_000) }}</span>
                <span class="color-brand-lighter">{{ t('{0} People Groups', [formatNumber(6602)]) }}</span>
              </div>
            </div>
          </div>
          <div class="switcher-item">
            <div class="info-card color-secondary-very-light justify-center">
              <div class="stack stack--lg | info-card__content">
                <h3>{{ t('Under-Engaged') }}</h3>
                <span class="color-secondary-light">{{ formatPopulation(3_300_000_000) }}</span>
                <span>{{ t('{0} People Groups', [formatNumber(5119)]) }}</span>
              </div>
            </div>
          </div>
          <div class="switcher-item">
            <div class="info-card color-secondary-very-light justify-center">
              <div class="stack stack--lg | info-card__content">
                <h3>{{ t('Frontier People') }}</h3>
                <span class="color-secondary-light">{{ formatPopulation(2_000_000_000) }}</span>
                <span>{{ t('{0} People Groups', [formatNumber(4788)]) }}</span>
              </div>
            </div>
          </div>
          <div class="switcher-item">
            <div class="info-card surface-brand-dark justify-center">
              <div class="stack stack--lg | info-card__content">
                <h3>{{ t('Unengaged') }}</h3>
                <span>{{ formatPopulation(unengagedPopulation) }}</span>
                <span>{{ t('{0} People Groups', [unengagedPeopleGroupsFormatted]) }}</span>
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
              <picture>
                <source
                  srcset="/assets/images/home-03-Vision-2033.avif"
                  type="image/avif"
                >
                <source
                  srcset="/assets/images/home-03-Vision-2033.webp"
                  type="image/webp"
                >
                <img
                  class="center"
                  src="/assets/images/home-03-Vision-2033.jpg"
                  :alt="t('Vision 2033')"
                  width="366"
                  height="679"
                  loading="lazy"
                  style="width: clamp(150px, 25vw, 350px);"
                >
              </picture>
            </div>
            <div class="switcher-item align-center justify-center">
              <div class="stack stack--xl">
                <h3 class="subtext">{{ t('In partnership with the global church, our vision is for...') }}</h3>
                <ul class="stack stack--md" data-list-color="primary">
                  <li>{{ t('Daily prayer coverage for all {0} DOXA people groups', [totalPeopleGroupsFormatted]) }}</li>
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
            <picture>
              <source
                srcset="/assets/images/home-04-EngagementStartsWithPrayer.avif"
                type="image/avif"
              >
              <source
                srcset="/assets/images/home-04-EngagementStartsWithPrayer.webp"
                type="image/webp"
              >
              <img
                src="/assets/images/home-04-EngagementStartsWithPrayer.jpg"
                :alt="t('Engagement starts with prayer')"
                width="350"
                height="344"
                loading="lazy"
              >
            </picture>
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
          style="background-image: url('/assets/images/home-doxa-background.jpg'); background-image: image-set(url('/assets/images/home-doxa-background.avif') type('image/avif'), url('/assets/images/home-doxa-background.webp') type('image/webp'), url('/assets/images/home-doxa-background.jpg') type('image/jpeg'));"
        >
          <div class="stack stack--md | text-center text-secondary">
            <h2>{{ t('What does "DOXA" mean?') }}</h2>
            <p class="subtext">{{ t('DOXA is the Greek word for "GLORY".') }}</p>
            <p>{{ t('We chose this name because Jesus is worthy of glory from every tribe, tongue, people, and nation. DOXA reminds us that we partner with the whole Church to take the whole gospel to the whole world – until people from every nation are worshipping Jesus and He alone receives all the glory.') }}</p>
          </div>
        </div>
        <div class="switcher-item center grow-none">
          <picture>
            <source
              srcset="/assets/images/home-05-WhatDoesDoxaMean.avif"
              type="image/avif"
            >
            <source
              srcset="/assets/images/home-05-WhatDoesDoxaMean.webp"
              type="image/webp"
            >
            <img
              class="rounded-xlg"
              src="/assets/images/home-05-WhatDoesDoxaMean.jpg"
              :alt="t('Engagement starts with prayer')"
              width="300"
              height="520"
              loading="lazy"
            >
          </picture>
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

/* The map's frame, as DoxaMapSlot draws it. */
.doxa-map-slot {
  display: block;
  position: relative;
  width: 100%;
  min-height: 780px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}
@media (max-width: 768px), (pointer: coarse) and (max-height: 600px) {
  /* On a phone the map is 80% of the SMALL viewport height, a little shorter than the screen so the page
     stays in view (svh does not jump when the browser's address bar collapses), never under 320px. */
  .doxa-map-slot {
    min-height: 320px;
    aspect-ratio: auto;
    height: 80svh;
  }
}
/* The card's corners are concentric with the map's top control (a 32px round button 3px in: 3 + 16 = 19px), so the
   rounded corner no longer cuts across it. */
.doxa-map-slot.rounded-xlg {
  border-radius: 19px;
}
.doxa-map-slot :deep(dxm-simple-map) {
  display: block;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
  contain: paint;
}
.doxa-map-scroll-pad {
  display: none;
}
@media (max-width: 768px), (pointer: coarse) and (max-height: 600px) {
  .doxa-map-scroll-pad {
    display: block;
    position: absolute;
    /* stops short of the map's control column at the inline end (32px round buttons, 3px in), so the ＋ and
       the other controls stay tappable; the rest of the band still lets a finger scroll the page */
    inset-inline-start: 0;
    inset-inline-end: 44px;
    height: 48px;
    z-index: 1500;
    touch-action: pan-y;
    pointer-events: auto;
  }
  .doxa-map-scroll-pad--top { top: 0; }
  /* while a map panel is open, its ✕ and its contents get every tap */
  .doxa-map-scroll-pad.is-off { display: none; }
}
.doxa-map-slot :deep(dxm-simple-map:fullscreen),
.doxa-map-slot :deep(dxm-simple-map:-webkit-full-screen) {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
}
</style>
