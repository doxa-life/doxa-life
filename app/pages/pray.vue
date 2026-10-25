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

// THE MAP comes from this site's own copy of the dx-maps output (public/dx-maps/) and is loaded here,
// not through DoxaMapSlot, which loads the older bundle in public/js/. Mapbox with the site's token, as
// before; the keyless MapLibre when there is none. Its styles and boundaries live in the same tree, and
// the site's language is the map's.
const prayMapConfig = computed(() => JSON.stringify({
  profile: 'doxa-simple-map',
  dataSource: 'pray-tools',
  tabs: [{ id: 'prayer', colorStrategy: 'prayer', legend: 'prayer', popup: 'prayer' }],
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
onMounted(() => { if (prayMapHost.value) unlockHeight = lockPhoneHeight(prayMapHost.value) })
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
  return !!prayMap && walk(prayMap.shadowRoot || prayMap)
}
const onPanelOpen = () => { openPanels++; padOff.value = true }
const onPanelClose = () => { openPanels = Math.max(0, openPanels - 1); padOff.value = openPanels > 0 }
const onAnyTap = () => {
  if (padOff.value) setTimeout(() => { if (!mapPanelOpen()) { openPanels = 0; padOff.value = false } }, 50)
}
onMounted(() => {
  prayMapHost.value?.addEventListener('dxmaps:panel-open', onPanelOpen)
  prayMapHost.value?.addEventListener('dxmaps:panel-close', onPanelClose)
  document.addEventListener('click', onAnyTap, true)
})
onBeforeUnmount(() => {
  prayMapHost.value?.removeEventListener('dxmaps:panel-open', onPanelOpen)
  prayMapHost.value?.removeEventListener('dxmaps:panel-close', onPanelClose)
  document.removeEventListener('click', onAnyTap, true)
})
// The prayer API the map reads is set before its script runs; the element is created once the bundle is in.
const prayMapHost = ref<HTMLElement | null>(null)
let prayMap: HTMLElement | null = null
onMounted(async () => {
  if (config.public.prayBaseUrl) window.MAP_APP_API_URL = config.public.prayBaseUrl as string
  try {
    await loadMapBundle()
  } catch (err) {
    console.error('[pray map]', err)
    return
  }
  if (!prayMapHost.value) return
  prayMap = document.createElement(MAP_TAG)
  prayMap.id = 'pray-map'
  prayMap.setAttribute('profile-config', prayMapConfig.value)
  prayMapHost.value.prepend(prayMap)
})
watch(prayMapConfig, (value) => { prayMap?.setAttribute('profile-config', value) })
onBeforeUnmount(() => {
  prayMap?.remove()
  prayMap = null
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
        <div ref="prayMapHost" class="doxa-map-slot rounded-md">
          <div class="doxa-map-scroll-pad doxa-map-scroll-pad--top" :class="{ 'is-off': padOff }" />
        </div>
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

    <MobileAppSection />

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
