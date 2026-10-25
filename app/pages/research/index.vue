<script setup lang="ts">
// Port of marketing-theme/page-uupgs.php.
// Matches the PHP markup verbatim: container page-content uupgs-page stack
// stack--3xl + a highlighted h1 + the <UupgsList> component. The
// `initialSearchTerm` is taken from the `uupg_search` query parameter
// (PHP equivalent: `get_query_var('uupg_search')`).
//
// Below the UupgsList we embed the 5-tab `research-map` IIFE built from
// the upstream DOXA-MAPS module — exposes Engagement / Prayer
// / Adoption (clones of doxa-simple-map) plus Language Families. The
// 1040-maps build now publishes /js/doxa-research-map.js (canonical name).
// via the publishToDoxaLife() plugin.

import { buildUupgListTranslations } from '~/utils/uupgListTranslations'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const initialSearchTerm = computed(() =>
  (Array.isArray(route.query.uupg_search) ? route.query.uupg_search[0] : route.query.uupg_search) ?? ''
)

const translations = computed(() => buildUupgListTranslations(t))

// THE MAP comes from this site's own copy of the dx-maps output (public/dx-maps/) and is loaded here,
// not through DoxaMapSlot, which loads the older bundle in public/js/. Mapbox with the site's token, as
// before; the keyless MapLibre when there is none. Its styles and boundaries live in the same tree, and
// the site's language is the map's.
const runtimeConfig = useRuntimeConfig()
const mapboxToken = (runtimeConfig.public as { mapboxToken?: string }).mapboxToken || ''
const researchProfileConfig = computed(() => JSON.stringify({
  profile:    'research-map',
  dataSource: 'pray-tools',
  instanceId: 'research-page',
  provider:   mapboxToken ? 'mapbox' : 'maplibre',
  ...(mapboxToken ? { tk: mapboxToken } : {}),
  assetsBase: '/dx-maps/assets',
  locale:     locale.value
}))
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
const researchMapSlot = ref<HTMLElement | null>(null)
let unlockHeight: (() => void) | null = null
onMounted(() => { if (researchMapSlot.value) unlockHeight = lockPhoneHeight(researchMapSlot.value) })
onBeforeUnmount(() => unlockHeight?.())
// FRESH, NOT STALE: a returning reader's browser may keep /dx-maps/ files for hours (no cache rule is sent for them), so
// the script is asked for once with cache 'no-cache' before it is added (a 304 when unchanged; a changed file replaces the
// stale copy), then added at its PLAIN address, so DX Maps' gallery still recognises it and never runs it twice.
function revalidate(src: string): Promise<void> {
  return fetch(src, { cache: 'no-cache', credentials: 'same-origin' })
    .then((r) => { if (r.status === 200 && r.body) r.body.cancel() })
    .catch(() => {})
}
// The prayer API the map reads is set before its script runs, and the script is added once per visit.
onMounted(async () => {
  if (runtimeConfig.public.prayBaseUrl) window.MAP_APP_API_URL = runtimeConfig.public.prayBaseUrl as string
  const src = '/dx-maps/doxa-research-map/doxa-research-map.js'
  if (customElements.get('doxa-research-map') || document.querySelector(`script[src="${src}"]`)) return
  await revalidate(src)
  if (!document.querySelector(`script[src="${src}"]`)) {
    const script = document.createElement('script')
    script.src = src
    document.head.appendChild(script)
  }
})

// The line under the map, in every language the site has (English for any other); the site's shared
// translation files stay as they are.
const DEEP_RESEARCH_LINE: Record<string, { ask: string, link: string }> = {
  en: { ask: "Want Deeper Research?", link: "Deep Research app" },
  ar: { ask: "هل تريد بحثًا أعمق؟", link: "تطبيق Deep Research" },
  de: { ask: "Möchten Sie tiefer recherchieren?", link: "Deep-Research-App" },
  es: { ask: "¿Quiere investigar más a fondo?", link: "App Deep Research" },
  fr: { ask: "Vous voulez aller plus loin dans vos recherches ?", link: "Application Deep Research" },
  hi: { ask: "क्या आप और गहन शोध चाहते हैं?", link: "Deep Research ऐप" },
  it: { ask: "Vuoi approfondire la ricerca?", link: "App Deep Research" },
  pt: { ask: "Quer uma pesquisa mais aprofundada?", link: "App Deep Research" },
  ro: { ask: "Vrei o cercetare mai aprofundată?", link: "Aplicația Deep Research" },
  ru: { ask: "Хотите исследовать глубже?", link: "Приложение Deep Research" },
  zh: { ask: "想进行更深入的研究？", link: "Deep Research 应用" },
}
const deepResearchLine = computed(() => DEEP_RESEARCH_LINE[locale.value] || DEEP_RESEARCH_LINE.en)

useTextHighlight()
</script>

<template>
  <div class="container page-content uupgs-page stack stack--3xl">
    <div class="stack stack--xs text-center">
      <h1 class="highlight" data-highlight-last>{{ t('Find a UUPG') }}</h1>
      <p><NuxtLink class="light-link" :to="localePath('/regions')">{{ t('By Region') }} &rarr;</NuxtLink></p>
    </div>

    <!-- Research map embed — sits directly under the H1, above the UUPG
         search bar. Loads /dx-maps/doxa-research-map/doxa-research-map.js. -->
    <div class="stack stack--xs">
      <div ref="researchMapSlot" class="doxa-map-slot rounded-xlg">
        <doxa-research-map id="research-page-map" :profile-config="researchProfileConfig" />
      </div>
      <!-- Under the map: the way to the full set of research maps, the hidden Deep Research page.
           Small, like the homepage's "Explore our research maps" line under its map. -->
      <p class="text-center deep-research-line">
        {{ deepResearchLine.ask }}
        <!-- A full page load: the app starts in a page of its own, with nothing of this site's maps in it. -->
        <a
          class="light-link"
          :href="localePath('/deep-research')"
        >{{ deepResearchLine.link }} &rarr;</a>
      </p>
    </div>

    <UupgsList
      :language-code="locale"
      :research-url="localePath('/research') + '/'"
      :t="translations"
      :initial-search-term="initialSearchTerm"
      hide-see-all-link
    />
  </div>
</template>

<style scoped>
/* The same size as the homepage's link under its map (.research-map-link in pages/index.vue). */
.deep-research-line {
  font-size: 1.2rem;
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
/* The card's corners are concentric with the map's tab row, which starts 16px in, so no tab is cut. */
.doxa-map-slot.rounded-xlg {
  border-radius: 16px;
}
.doxa-map-slot doxa-research-map {
  display: block;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
  contain: paint;
}
.doxa-map-slot doxa-research-map:fullscreen,
.doxa-map-slot doxa-research-map:-webkit-full-screen {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
}
</style>
