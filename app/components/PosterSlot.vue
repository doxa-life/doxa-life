<script lang="ts">
// The posters' script is shared by every PosterSlot on the page: it loads once, on the first opening anywhere.
const POSTERS_TAG = 'dxm-poster-section'
const POSTERS_SCRIPT = '/dx-maps/country-posters/country-posters.js'
// FRESH, NOT STALE: a returning reader's browser may keep /dx-maps/ files for hours (no cache rule is sent for them), so
// the script is asked for once with cache 'no-cache' before it is added (a 304 when unchanged; a changed file replaces the
// stale copy), then added at its PLAIN address, so DX Maps' gallery still recognises it and never runs it twice.
function revalidate(src: string): Promise<void> {
  return fetch(src, { cache: 'no-cache', credentials: 'same-origin' })
    .then((r) => { if (r.status === 200 && r.body) r.body.cancel() })
    .catch(() => {})
}
let postersLoad: Promise<void> | null = null
function loadPosters(prayBaseUrl: string): Promise<void> {
  if (customElements.get(POSTERS_TAG)) return Promise.resolve()
  postersLoad ??= revalidate(POSTERS_SCRIPT).then(() => new Promise<void>((resolve, reject) => {
    // the prayer API the posters read is set before the script runs
    if (prayBaseUrl) window.MAP_APP_API_URL = prayBaseUrl
    const script = document.createElement('script')
    script.src = POSTERS_SCRIPT
    script.onload = () => customElements.get(POSTERS_TAG) ? resolve() : reject(new Error('the posters bundle did not register'))
    script.onerror = () => reject(new Error('the posters bundle failed to load'))
    document.head.appendChild(script)
  })).catch((err) => {
    postersLoad = null // a later opening tries again
    throw err
  })
  return postersLoad
}
</script>

<script setup lang="ts">
import { countrySlug } from '~~/config/countries-meta'
/**
 * PosterSlot: a layout component, like DoxaMapSlot. A "View country posters" disclosure that, when opened,
 * drops down and embeds DX Maps' poster section for one region (<dxm-poster-section>, from this site's own
 * /dx-maps/ copy). The posters are DX Maps'; this only places them and owns the toggle, so the element is
 * asked for no header of its own (show-header="false").
 *
 * Its markup and look are the Regions plugin's card (DX Maps library/components/regions/RegionSectionCard.vue,
 * itself taken from this site's /regions card): a second footer row under the card's dashboard link, a caret
 * that turns to point down when open (the closed caret mirrors in RTL like the site's rotate-90; the open one
 * does not, like rotate-180), aria-expanded and aria-controls, and the posters open underneath.
 */
interface Props {
  /** The region's /regions slug, e.g. "latin-america-and-caribbean": the poster section's scope. */
  scope: string
  /** The poster section's type. */
  type?: string
}
const props = withDefaults(defineProps<Props>(), { type: 'country' })

const { locale } = useI18n()
const localePath = useLocalePath()
const runtimeConfig = useRuntimeConfig()

// DX Maps' own words for the two states (library/i18n/locales/<lang>/regions.json), in each language the site
// has; English for any other.
const LABELS: Record<string, [string, string]> = {
  en: ['View country posters', 'Hide country posters'],
  ar: ['عرض ملصقات الدولة', 'إخفاء ملصقات الدولة'],
  de: ['Länderposter ansehen', 'Länderposter ausblenden'],
  es: ['Ver los carteles del país', 'Ocultar los carteles del país'],
  fr: ['Voir les affiches du pays', 'Masquer les affiches du pays'],
  hi: ['देश के पोस्टर देखें', 'देश के पोस्टर छिपाएँ'],
  it: ['Vedi i poster del paese', 'Nascondi i poster del paese'],
  pt: ['Ver os cartazes do país', 'Ocultar os cartazes do país'],
  ro: ['Vezi posterele țării', 'Ascunde posterele țării'],
  ru: ['Показать плакаты страны', 'Скрыть плакаты страны'],
  zh: ['查看国家海报', '隐藏国家海报']
}

const open = ref(false)
const label = computed(() => (LABELS[locale.value] || LABELS.en)[open.value ? 1 : 0])
const disclosureId = `poster-slot-${props.scope}`
const posters = ref<HTMLElement | null>(null)

async function toggle() {
  open.value = !open.value
  if (!open.value || !posters.value || posters.value.firstElementChild) return
  const prayBaseUrl = (runtimeConfig.public.prayBaseUrl as string) || ''
  try {
    await loadPosters(prayBaseUrl)
  } catch (err) {
    console.error('[poster slot]', err)
    return
  }
  const section = document.createElement(POSTERS_TAG)
  section.setAttribute('type', props.type)
  section.setAttribute('scope', props.scope)
  section.setAttribute('locale', locale.value)
  section.setAttribute('show-header', 'false')
  section.setAttribute('min-card-px', '150')
  section.setAttribute('collapsible', 'false')
  // each poster card's button reads "Show dashboard" and asks for the country's own page (the site decides the address)
  section.setAttribute('card-action', 'dashboard')
  section.setAttribute('assets-base', '/dx-maps/assets')
  if (prayBaseUrl) section.setAttribute('api-base-url', prayBaseUrl)
  posters.value.appendChild(section)
}

// "Show dashboard" on a poster card: the element sends dxm-poster-dashboard ({ iso3, name, … }, composed) and this goes
// to the country's own page, /regions/<slug>, by the same slug rule as the regions page's country links.
function onDashboard(event: Event) {
  const detail = (event as CustomEvent<{ iso3?: string, name?: string }>).detail
  if (!detail?.iso3) return
  event.preventDefault()
  navigateTo(localePath(`/regions/${countrySlug(detail.iso3, detail.name)}`))
}
onMounted(() => posters.value?.addEventListener('dxm-poster-dashboard', onDashboard))
onBeforeUnmount(() => posters.value?.removeEventListener('dxm-poster-dashboard', onDashboard))
</script>

<template>
  <p class="region-card__footer region-card__posters-toggle">
    <button
      type="button"
      class="region-card__footer-link | with-icon"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="disclosureId"
      @click="toggle"
    >
      {{ label }}
      <svg
        class="icon | right"
        :class="open ? 'rotate-180' : 'rotate-90'"
        aria-hidden="true"
      >
        <use href="/assets/icons/arrow-chevron.svg#chevron-up" />
      </svg>
    </button>
  </p>
  <div
    v-show="open"
    :id="disclosureId"
    ref="posters"
    class="region-card__posters"
  />
</template>

<style scoped>
/* The region card's footer row, as /regions draws it (flex, flex-end, margin-top --spacing-lg); the toggle row
   sits directly under the dashboard link's row (the Regions plugin's .region-card__posters-toggle). */
.region-card__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
}

.region-card__posters-toggle {
  /* a little room under the dashboard link (the Driver: "a little bit more") */
  margin-top: var(--spacing-xs);
}

/* A <button> that reads as the footer's link: the site's own `a` rule (base/_globals.scss). */
.region-card__footer-link {
  appearance: none;
  background: none;
  border: 0;
  padding: 0;
  margin: 0;
  cursor: pointer;
  font: inherit;
  color: var(--color-brand-light);
  font-weight: var(--font-weight-medium);
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
  transition: color 0.3s ease;
}

.region-card__footer-link:hover {
  color: var(--color-brand-lighter);
}

.region-card__posters {
  margin-top: 13.3px;
}
</style>
