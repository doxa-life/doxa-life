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

const {
  stats,
  adoptedPercent,
  totalPeopleGroups,
  reload,
  ensureLoaded
} = usePrayerStatistics()
await ensureLoaded()
onMounted(() => reload())

const config = useRuntimeConfig()
const mapboxToken = config.public.mapboxToken as string

// THE MAP comes from this site's own copy of the dx-maps output (public/dx-maps/) and is loaded here,
// not through DoxaMapSlot, which loads the older bundle in public/js/. Mapbox with the site's token, as
// before; the keyless MapLibre when there is none. Its styles and boundaries live in the same tree, and
// the site's language is the map's.
const adoptMapConfig = computed(() => JSON.stringify({
  profile: 'doxa-simple-map',
  dataSource: 'pray-tools',
  tabs: [{ id: 'adoption', colorStrategy: 'adoption', legend: 'adoption', popup: 'adoption' }],
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
onMounted(() => { if (adoptMapHost.value) unlockHeight = lockPhoneHeight(adoptMapHost.value) })
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
  return !!adoptMap && walk(adoptMap.shadowRoot || adoptMap)
}
const onPanelOpen = () => { openPanels++; padOff.value = true }
const onPanelClose = () => { openPanels = Math.max(0, openPanels - 1); padOff.value = openPanels > 0 }
const onAnyTap = () => {
  if (padOff.value) setTimeout(() => { if (!mapPanelOpen()) { openPanels = 0; padOff.value = false } }, 50)
}
onMounted(() => {
  adoptMapHost.value?.addEventListener('dxmaps:panel-open', onPanelOpen)
  adoptMapHost.value?.addEventListener('dxmaps:panel-close', onPanelClose)
  document.addEventListener('click', onAnyTap, true)
})
onBeforeUnmount(() => {
  adoptMapHost.value?.removeEventListener('dxmaps:panel-open', onPanelOpen)
  adoptMapHost.value?.removeEventListener('dxmaps:panel-close', onPanelClose)
  document.removeEventListener('click', onAnyTap, true)
})
// The prayer API the map reads is set before its script runs; the element is created once the bundle is in.
const adoptMapHost = ref<HTMLElement | null>(null)
let adoptMap: HTMLElement | null = null
onMounted(async () => {
  if (config.public.prayBaseUrl) window.MAP_APP_API_URL = config.public.prayBaseUrl as string
  try {
    await loadMapBundle()
  } catch (err) {
    console.error('[adopt map]', err)
    return
  }
  if (!adoptMapHost.value) return
  adoptMap = document.createElement(MAP_TAG)
  adoptMap.id = 'adopt-map'
  adoptMap.setAttribute('profile-config', adoptMapConfig.value)
  adoptMapHost.value.prepend(adoptMap)
})
watch(adoptMapConfig, (value) => { adoptMap?.setAttribute('profile-config', value) })
onBeforeUnmount(() => {
  adoptMap?.remove()
  adoptMap = null
})

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
                <span id="adopted-current-status">{{ stats.total_adopted }}</span> / {{ totalPeopleGroups }}
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
            style="background-image: url('/assets/images/adopt-01-africa-4women.jpg'); background-image: image-set(url('/assets/images/adopt-01-africa-4women.avif') type('image/avif'), url('/assets/images/adopt-01-africa-4women.webp') type('image/webp'), url('/assets/images/adopt-01-africa-4women.jpg') type('image/jpeg'));"
          />
        </div>
      </div>
    </section>

    <section class="stack stack--md container">
      <div>
        <h1
          class="color-brand-light highlight"
          data-highlight-index="1"
          data-highlight-last
          data-highlight-color="primary"
        >{{ t('Adoption Progress') }}</h1>
      </div>
      <div ref="adoptMapHost" class="doxa-map-slot rounded-md">
        <div class="doxa-map-scroll-pad doxa-map-scroll-pad--top" :class="{ 'is-off': padOff }" />
      </div>
      <NuxtLink
        :to="localePath('/research')"
        class="research-map-link"
      >
        Explore our research maps →
      </NuxtLink>
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
              <p>{{ t('Raise up 100+ daily intercessors to pray for this people group.') }}</p>
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
            <picture>
              <source
                srcset="/assets/images/adopt-02-ipad-mockup.avif"
                type="image/avif"
              >
              <source
                srcset="/assets/images/adopt-02-ipad-mockup.webp"
                type="image/webp"
              >
              <img
                class="center"
                src="/assets/images/adopt-02-ipad-mockup.png"
                :alt="t('Your daily prayer guide')"
                width="500"
                height="672"
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
          <h2>{{ t('Why adoption matters') }}</h2>
          <div class="switcher | gap-md" data-width="xl">
            <div class="switcher-item center grow-none">
              <picture>
                <source
                  srcset="/assets/images/Adopt-03-DurbetInMongolia.avif"
                  type="image/avif"
                >
                <source
                  srcset="/assets/images/Adopt-03-DurbetInMongolia.webp"
                  type="image/webp"
                >
                <img
                  src="/assets/images/Adopt-03-DurbetInMongolia.jpg"
                  :alt="t('Adopt an unengaged people group')"
                  width="150"
                  height="188"
                  loading="lazy"
                >
              </picture>
            </div>
            <div class="stack stack--lg | text-card | surface-brand-lightest justify-center">
              <h4 class="font-heading font-size-2xl">{{ t('They have no gospel access') }}</h4>
              <p>{{ t('Unengaged people groups have no missionaries, no churches, and often no known believers. Adoption helps ensure they are finally seen, prayed for, and intentionally pursued with the gospel.') }}</p>
            </div>
          </div>
          <div class="switcher | gap-md" data-width="xl">
            <div class="switcher-item center grow-none">
              <picture>
                <source
                  srcset="/assets/images/Adopt-04-Maha-Brahmin-in-India.avif"
                  type="image/avif"
                >
                <source
                  srcset="/assets/images/Adopt-04-Maha-Brahmin-in-India.webp"
                  type="image/webp"
                >
                <img
                  src="/assets/images/Adopt-04-Maha-Brahmin-in-India.jpg"
                  :alt="t('Adopt an unengaged people group')"
                  width="150"
                  height="188"
                  loading="lazy"
                >
              </picture>
            </div>
            <div class="stack stack--lg | text-card | surface-brand-lightest justify-center">
              <h4 class="font-heading font-size-2xl overflow-wrap-anywhere">{{ t('Prayer opens the door for engagement') }}</h4>
              <p>{{ t('Adoption mobilizes 100+ daily intercessors whose prayer prepares the soil, breaks spiritual barriers, and supports workers who go. Every gospel movement begins with prayer.') }}</p>
            </div>
          </div>
          <div class="switcher | gap-md" data-width="xl">
            <div class="switcher-item center grow-none">
              <picture>
                <source
                  srcset="/assets/images/Adopt-05-KamaraInGhana.avif"
                  type="image/avif"
                >
                <source
                  srcset="/assets/images/Adopt-05-KamaraInGhana.webp"
                  type="image/webp"
                >
                <img
                  src="/assets/images/Adopt-05-KamaraInGhana.jpg"
                  :alt="t('Adopt an unengaged people group')"
                  width="150"
                  height="188"
                  loading="lazy"
                >
              </picture>
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
          <picture>
            <source
              srcset="/assets/images/adopt-bottom-banner.avif"
              type="image/avif"
            >
            <source
              srcset="/assets/images/adopt-bottom-banner.webp"
              type="image/webp"
            >
            <img
              src="/assets/images/adopt-bottom-banner.jpg"
              :alt="t('Jesus')"
              width="1200"
              height="341"
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
