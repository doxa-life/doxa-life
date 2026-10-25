<script setup lang="ts">
// Posterverse: every poster plugin (UPG 100 List Posters, Country Posters, Poster Design and the poster
// shelf of experimental plugins) in one full-page app, the poster twin of Deep Research. Like Deep
// Research, this page is HIDDEN: it is in no menu and links nowhere, and robots are told not to index
// it. It is reached by its address, and ?tab=<row id> opens one plugin directly (the shell reads it).
//
// The shell is a web component served from this site's OWN /dx-maps/ tree, the same copy the Deep
// Research page uses: one script, one element, <posterverse-app>. A custom
// element's name needs a hyphen, which is why the tag is not just <posterverse>.
//
// The element is created in onMounted rather than written in the template: it is a custom element
// that only exists in the browser, so this keeps it out of SSR and out of Vue's component resolver
// without any nuxt.config change.

// A full-page app on every screen: no layout, so no site header and no footer. The way back to the site
// is the shell's own "Back to homepage" button, directly above its Collapse button (home-href below),
// so the shell fills the whole screen. The page itself never scrolls (the shell's own panes scroll).
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

// The shell comes from this site's own /dx-maps/ copy; the script and every embed URL come from it.
const POSTERVERSE_SCRIPT = '/dx-maps/posterverse/posterverse.js'

// FRESH, NOT STALE: a returning reader's browser may keep /dx-maps/ files for hours (no cache rule is sent for them), so
// the script is asked for once with cache 'no-cache' before it is added (a 304 when unchanged; a changed file replaces the
// stale copy), then added at its PLAIN address, so DX Maps' gallery still recognises it and never runs it twice.
function revalidate(src: string): Promise<void> {
  return fetch(src, { cache: 'no-cache', credentials: 'same-origin' })
    .then((r) => { if (r.status === 200 && r.body) r.body.cancel() })
    .catch(() => {})
}

useHead({
  title: 'Posterverse',
  meta: [{ name: 'robots', content: 'noindex' }]
})

// With no layout, this page sets <html lang dir> itself, as the public layout does for every other
// page: in Arabic the shell reads right to left.
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
let shell: HTMLElement | null = null

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
  shell = document.createElement('posterverse-app')
  // Every embed URL is built at RUNTIME from the origin serving this page, so the same build works on
  // any host with nothing hardcoded.
  shell.setAttribute('tree-base', `${window.location.origin}/dx-maps`)
  // The site's language drives the shell's (and every plugin's); it follows the language switcher.
  shell.setAttribute('language', locale.value)
  // A website, not the mobile app: no phone bar of the app's own (one header on a phone); its ☰ sits in the
  // corner and its language menu at the drawer's foot. Read once, when the element mounts, so it is set here.
  shell.setAttribute('shell-mode', 'web')
  // The way back to the site: the shell draws it above its Collapse button, in the site's own words.
  shell.setAttribute('home-href', homeHref())
  shell.setAttribute('home-label', homeLabel())
  // The keyless MapLibre engine, always: the app needs no token and no setting.
  // urlOwner 'host': the site's router writes the address (onAddress, above)
  const shellConfig: Record<string, unknown> = { provider: 'maplibre', urlOwner: 'host' }
  shell.setAttribute('provider', 'maplibre')
  shell.setAttribute('profile-config', JSON.stringify(shellConfig))
  shell.addEventListener('tab-change', onTabChange)
  shell.addEventListener('doxa-language-request', onLanguageRequest)
  shell.addEventListener('dxm-address', onAddress)
  host.value?.appendChild(shell)
  // its script, revalidated (above) and then added at its plain address, once per page load
  if (!customElements.get('posterverse-app') && !document.querySelector(`script[src="${POSTERVERSE_SCRIPT}"]`)) {
    revalidate(POSTERVERSE_SCRIPT).then(() => {
      if (document.querySelector(`script[src="${POSTERVERSE_SCRIPT}"]`)) return
      const script = document.createElement('script')
      script.src = POSTERVERSE_SCRIPT
      document.head.appendChild(script)
    })
  }
})

watch(locale, (lang) => {
  shell?.setAttribute('language', lang)
  shell?.setAttribute('home-href', homeHref())
  shell?.setAttribute('home-label', homeLabel())
})

onBeforeUnmount(() => {
  shell?.remove()
  shell = null
})
</script>

<template>
  <div class="posterverse-page">
    <h1 class="visually-hidden">
      Posterverse
    </h1>
    <div
      ref="host"
      class="posterverse-host"
    />
  </div>
</template>

<style scoped>
.posterverse-page {
  /* 100svh: the phone's SMALL viewport, so the browser's own toolbars never cover the shell. */
  height: 100svh;
}
/* The shell takes the whole screen, so there is no page scrollbar. */
.posterverse-host {
  display: block;
  width: 100%;
  height: 100%;
}
/* 100%, not the element's own 85vh default: here the shell is the whole page. */
.posterverse-host :deep(posterverse-app) {
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
html:has(.posterverse-page),
html:has(.posterverse-page) body {
  margin: 0;
  overflow: hidden;
}
/* The site keeps room for a scrollbar on every page (scrollbar-gutter: stable, base/_globals.scss).
   This page never scrolls, so on a desktop that room would only be an empty strip at the right edge. */
html:has(.posterverse-page) {
  scrollbar-gutter: auto;
}
</style>
