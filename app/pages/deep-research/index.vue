<script setup lang="ts">
// Deep Research: the Research Gallery (every research map, dashboard and list in one app) as a
// full-page app. DX Life asked for the gallery under this name, on a page of the site rather than a
// subdomain, and kept off the Research page. So this page is HIDDEN: it is in no menu, and robots are
// told not to index it. It is reached by its address, or by the link under the Research page's map.
//
// The gallery is a web component served from DX-life's OWN origin (public/dx-maps/, a copy of
// the dx-maps build tree), so this site is its CDN: one script, one element, and no other host for the
// map code (the engine and base-map tiles come from public services).
// It reads its manifest and every child map from the same /dx-maps/ tree.
//
// The element is created in onMounted rather than written in the template: it is a custom element
// that only exists in the browser, so this keeps it out of SSR and out of Vue's component resolver
// without any nuxt.config change.

// A full-page app on every screen: no layout, so no site header and no footer. The way back to the site
// is the gallery's own "Back to homepage" button, directly above its Collapse button (home-href below),
// so the gallery fills the whole screen. The page itself never scrolls (the gallery's own panes scroll).
definePageMeta({ layout: false })

const { locale, locales } = useI18n()
const localePath = useLocalePath()

// The page's own words, in every language the site has (English for any other); the site's shared
// translation files stay as they are. "Back to homepage" is drawn by the app, above its Collapse button.
const HOME_LABEL: Record<string, string> = {
  en: "Back to homepage",
  ar: "العودة إلى الصفحة الرئيسية",
  de: "Zurück zur Startseite",
  es: "Volver a la página de inicio",
  fr: "Retour à l'accueil",
  hi: "होमपेज पर वापस जाएँ",
  it: "Torna alla home page",
  pt: "Voltar à página inicial",
  ro: "Înapoi la pagina principală",
  ru: "Вернуться на главную",
  zh: "返回首页",
}
const homeLabel = () => HOME_LABEL[locale.value] || HOME_LABEL.en
// "Back to homepage" goes to the public site, doxa.life, in the reader's language (https://doxa.life/,
// https://doxa.life/ar), whichever server this page runs on.
const homeHref = () => `https://doxa.life${localePath('/')}`

// The gallery comes from this site's own /dx-maps/ copy; the script and every embed URL come from it.
const GALLERY_SCRIPT = '/dx-maps/doxa-maps-spa/doxa-maps-spa.js'

// FRESH, NOT STALE: a returning reader's browser may keep /dx-maps/ files for hours (no cache rule is sent for them), so
// the script is asked for once with cache 'no-cache' before it is added (a 304 when unchanged; a changed file replaces the
// stale copy), then added at its PLAIN address, so DX Maps' gallery still recognises it and never runs it twice.
function revalidate(src: string): Promise<void> {
  return fetch(src, { cache: 'no-cache', credentials: 'same-origin' })
    .then((r) => { if (r.status === 200 && r.body) r.body.cancel() })
    .catch(() => {})
}

useHead({
  title: 'Deep Research',
  meta: [{ name: 'robots', content: 'noindex' }]
})

// With no layout, this page sets <html lang dir> itself, as the public layout does for every other
// page: in Arabic the bar and the gallery read right to left.
const dir = computed(() => {
  const loc = locales.value.find(l => typeof l === 'object' && 'code' in l && l.code === locale.value)
  return (typeof loc === 'object' && loc && 'dir' in loc && loc.dir) ? loc.dir : 'ltr'
})
useHead(() => ({
  htmlAttrs: {
    lang: locale.value,
    dir: dir.value
  }
}))

const host = ref<HTMLElement | null>(null)
let gallery: HTMLElement | null = null

// THE LANGUAGE MENU INSIDE THE APP (its phone bar and its rail): on a pick it fires a cancelable
// 'doxa-language-request' {detail.language}. This site owns the language (it is in the address: /ar/...),
// so the page cancels the event and switches the SITE's locale; the app then follows through `language`
// (the watch below). The tab open at that moment is carried over in ?tab=, because the localized
// address is a new page. A code the site has no route for is cancelled and ignored.
const route = useRoute()
const switchLocalePath = useSwitchLocalePath()
let currentTab = typeof route.query.tab === 'string' ? route.query.tab : ''
function onTabChange(e: Event) {
  const d = (e as CustomEvent).detail
  const id = Array.isArray(d) ? d[0]?.id : d?.id
  if (typeof id === 'string' && id) currentTab = id
}
function onLanguageRequest(e: Event) {
  e.preventDefault()
  const code = (e as CustomEvent<{ language?: string }>).detail?.language
  const known = locales.value.some(l => (typeof l === 'string' ? l : l.code) === code)
  if (!code || !known || code === locale.value) return
  const target = switchLocalePath(code as typeof locale.value)
  if (!target) return
  const url = new URL(target, window.location.origin)
  if (currentTab) url.searchParams.set('tab', currentTab)
  navigateTo(url.pathname + url.search + url.hash)
}

// THE ADDRESS (shareable pages): this site's router owns the address, so the app is told urlOwner 'host' and, when the
// open tab changes, it sends a 'dxm-address' {href, push} instead of writing history itself. A reader's tab click is a
// new history entry (push); the app's first paint replaces the current one (so a shared link or a reload keeps the
// tab). The router writes it, so Back, Forward and the language switch keep the tab; Back/Forward never send one.
const router = useRouter()
function onAddress(e: Event) {
  const d = (e as CustomEvent<{ href?: string, push?: boolean }>).detail
  if (!d || typeof d.href !== 'string' || !d.href.startsWith('/') || d.href.startsWith('//')) return
  if (d.push) router.push(d.href).catch(() => {})
  else router.replace(d.href).catch(() => {})
}

onMounted(() => {
  gallery = document.createElement('doxa-maps-spa')
  // Every embed URL is built at RUNTIME from the origin serving this page, so the same build works on
  // any host with nothing hardcoded.
  gallery.setAttribute('tree-base', `${window.location.origin}/dx-maps`)
  // The site's language drives the gallery's (and every map's); it follows the language switcher.
  gallery.setAttribute('language', locale.value)
  // A website, not the mobile app: no phone bar of the app's own (one header on a phone); its ☰ sits in the
  // corner and its language menu at the drawer's foot. Read once, when the element mounts, so it is set here.
  gallery.setAttribute('shell-mode', 'web')
  // The way back to the site: the gallery draws it above its Collapse button, in the site's own words.
  gallery.setAttribute('home-href', homeHref())
  gallery.setAttribute('home-label', homeLabel())
  // Every section shows, Experimental included (the gallery's default).
  const galleryConfig: Record<string, unknown> = {}
  // The keyless MapLibre engine, always: the app needs no token and no setting.
  galleryConfig.provider = 'maplibre'
  // the site's router writes the address (onAddress, above)
  galleryConfig.urlOwner = 'host'
  gallery.setAttribute('provider', 'maplibre')
  gallery.setAttribute('profile-config', JSON.stringify(galleryConfig))
  gallery.addEventListener('tab-change', onTabChange)
  gallery.addEventListener('doxa-language-request', onLanguageRequest)
  gallery.addEventListener('dxm-address', onAddress)
  host.value?.appendChild(gallery)
  // its script, revalidated (above) and then added at its plain address, once per page load
  if (!customElements.get('doxa-maps-spa') && !document.querySelector(`script[src="${GALLERY_SCRIPT}"]`)) {
    revalidate(GALLERY_SCRIPT).then(() => {
      if (document.querySelector(`script[src="${GALLERY_SCRIPT}"]`)) return
      const script = document.createElement('script')
      script.src = GALLERY_SCRIPT
      document.head.appendChild(script)
    })
  }
})

watch(locale, (lang) => {
  gallery?.setAttribute('language', lang)
  gallery?.setAttribute('home-href', homeHref())
  gallery?.setAttribute('home-label', homeLabel())
})

onBeforeUnmount(() => {
  gallery?.remove()
  gallery = null
})
</script>

<template>
  <div class="research-gallery-page">
    <h1 class="visually-hidden">
      Deep Research
    </h1>
    <div
      ref="host"
      class="research-gallery-host"
    />
  </div>
</template>

<style scoped>
.research-gallery-page {
  /* 100svh: the phone's SMALL viewport, so the browser's own toolbars never cover the gallery. */
  height: 100svh;
}
/* The gallery takes the whole screen, so there is no page scrollbar. */
.research-gallery-host {
  display: block;
  width: 100%;
  height: 100%;
}
.research-gallery-host :deep(doxa-maps-spa) {
  display: block;
  width: 100%;
  height: 100%;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>

<style>
/* Not scoped, and keyed to this page's own element, so it applies only while this page is shown and
   no other page changes. With no layout, the site's stylesheet may not be loaded here: the page sets
   the two things it needs itself, no body margin and no page scroll. */
html:has(.research-gallery-page),
html:has(.research-gallery-page) body {
  margin: 0;
  overflow: hidden;
}
/* The site keeps room for a scrollbar on every page (scrollbar-gutter: stable, base/_globals.scss).
   This page never scrolls, so on a desktop that room would only be an empty strip at the right edge. */
html:has(.research-gallery-page) {
  scrollbar-gutter: auto;
}
</style>
