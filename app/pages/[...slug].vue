<script setup lang="ts">
// CMS catch-all renderer. Port of marketing-theme/page.php — the default
// page template with optional sidebar child-page nav. Fetches the
// rendered page from /api/pages/:slug and renders its title + body_html
// + sidebar. Falls back to a child-cards grid if a parent page has no
// body content (matches the `empty(trim(strip_tags(get_the_content())))`
// branch in the PHP source).
//
// Nuxt's router will only mount this file after every more-specific
// route (/, /research, /pray, /adopt, /adopt/[slug], /contact-us, /admin/*)
// has failed to match — so the hardcoded pages keep their priority.

interface ChildPage {
  slug: string
  title: string
  excerpt: string | null
  featured_image: string | null
  menu_order: number
}

interface PageResponse {
  slug: string
  parent_slug: string | null
  menu_order: number
  custom_css: string | null
  requested_locale: string
  resolved_locale: string
  title: string
  excerpt: string | null
  featured_image: string | null
  meta_title: string | null
  meta_description: string | null
  og_image: string | null
  body_html: string
  body_is_empty: boolean
  menu_parent: { slug: string; title: string }
  children: ChildPage[]
}

import { h, render, getCurrentInstance } from 'vue'
import { UUPGS_LIST_PLACEHOLDER_CLASS } from '~/utils/tiptapUupgsList'
import UupgsList from '~/components/public/UupgsList.vue'

const route = useRoute()
const { locale } = useI18n()
const localePath = useLocalePath()

const slug = computed(() => {
  const raw = route.params.slug
  const parts = Array.isArray(raw) ? raw : [raw]
  return parts.filter(Boolean).join('/')
})

const { data, error } = await useAsyncData<PageResponse | null>(
  () => `cms-${slug.value}-${locale.value}`,
  async () => {
    if (!slug.value) return null
    try {
      return await $fetch<PageResponse>(`/api/pages/${slug.value}`, {
        query: { locale: locale.value }
      })
    } catch (e: any) {
      if (e?.statusCode === 404) return null
      throw e
    }
  },
  { watch: [() => slug.value, () => locale.value] }
)

if (!data.value && !error.value) {
  // Explicit 404 if the page isn't in the CMS (or not published)
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

// <head>
useHead(() => {
  if (!data.value) return {}
  return {
    title: data.value.meta_title || data.value.title,
    meta: [
      ...(data.value.meta_description ? [{ name: 'description', content: data.value.meta_description }] : []),
      ...(data.value.og_image ? [{ property: 'og:image', content: data.value.og_image }] : [])
    ],
    // Port of WP's per-page `_page_custom_css` meta — see
    // `output_page_custom_css` in marketing-theme/functions.php.
    style: data.value.custom_css
      ? [{ key: `page-custom-css-${data.value.slug}`, innerHTML: data.value.custom_css }]
      : []
  }
})

const hasSidebar = computed(() => (data.value?.children.length ?? 0) > 0)
const isParentSelf = computed(() => data.value?.menu_parent.slug === data.value?.slug)
const showChildGrid = computed(() =>
  // Parent page with no body content → render children as cards
  Boolean(data.value && isParentSelf.value && data.value.body_is_empty && data.value.children.length > 0)
)

useTextHighlight()

// The body_html is rendered via v-html, so the embedded
// <div class="doxa-uupgs-list-slot" data-uupgs-list-props="…"></div>
// placeholders come through as plain DOM. After each render, mount
// the real Vue <UupgsList> component into each slot. Using h() + render()
// with the host app's context so the mounted component still resolves
// useI18n / useRuntimeConfig.
const instance = getCurrentInstance()
const mountedSlots = new Set<HTMLElement>()

function hydrateUupgsListSlots() {
  if (!import.meta.client) return
  const slots = document.querySelectorAll<HTMLElement>(`.${UUPGS_LIST_PLACEHOLDER_CLASS}`)
  for (const slot of slots) {
    if (mountedSlots.has(slot)) continue
    const raw = slot.getAttribute('data-uupgs-list-props') || '{}'
    let props: Record<string, any> = {}
    try {
      props = JSON.parse(raw)
    } catch (e) {
      console.error('[UupgsList slot] failed to parse props', e, raw)
      continue
    }
    const vnode = h(UupgsList, props)
    if (instance?.appContext) vnode.appContext = instance.appContext
    try {
      render(vnode, slot)
      mountedSlots.add(slot)
    } catch (e) {
      console.error('[UupgsList slot] failed to mount', e)
    }
  }
}

function unmountUupgsListSlots() {
  for (const slot of mountedSlots) {
    try { render(null, slot) } catch { /* ignore */ }
  }
  mountedSlots.clear()
}

// Hydrate once on mount (the watch above fires before the DOM is in
// place so `querySelectorAll` would be empty).
onMounted(() => {
  nextTick(hydrateUupgsListSlots)
})

// Re-hydrate on client-side navigation when body_html changes.
watch(() => data.value?.body_html, () => {
  unmountUupgsListSlots()
  nextTick(hydrateUupgsListSlots)
})

onBeforeUnmount(unmountUupgsListSlots)
</script>

<template>
  <div v-if="data" class="container page-content">
    <div :class="hasSidebar ? 'with-sidebar' : ''">
      <aside v-if="hasSidebar" class="sidebar">
        <nav class="stack" aria-label="Child pages navigation">
          <div>
            <ul class="stack | max-width-xs" role="list">
              <li>
                <NuxtLink
                  class="font-size-lg"
                  :class="{ 'current-link': data.slug === data.menu_parent.slug }"
                  :to="localePath(`/${data.menu_parent.slug}`)"
                >
                  {{ data.menu_parent.title }}
                </NuxtLink>
              </li>
              <li v-for="child in data.children" :key="child.slug">
                <NuxtLink
                  :class="{ 'current-link': data.slug === child.slug }"
                  :to="localePath(`/${child.slug}`)"
                >
                  {{ child.title }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <article :id="`page-${data.slug}`" class="page">
        <!-- WP page.php emits `page-featured-image` only when a
             post_thumbnail is explicitly set. Matches live behavior. -->
        <div v-if="data.featured_image" class="page-featured-image">
          <img :src="data.featured_image" :alt="data.title">
        </div>

        <!-- No <h1> — page.php doesn't render the title inside the
             article; the document <title> is set via useHead() above. -->
        <div v-if="!showChildGrid" class="page-body" v-html="data.body_html" />

        <div v-if="showChildGrid" class="grid">
          <div v-for="child in data.children" :key="child.slug" class="card" data-variant="secondary">
            <div v-if="child.featured_image" class="child-thumbnail">
              <NuxtLink :to="localePath(`/${child.slug}`)">
                <img :src="child.featured_image" :alt="child.title">
              </NuxtLink>
            </div>
            <div class="stack">
              <h3>
                <NuxtLink class="color-white" :to="localePath(`/${child.slug}`)">
                  {{ child.title }}
                </NuxtLink>
              </h3>
              <div v-if="child.excerpt" class="child-excerpt" v-html="child.excerpt" />
            </div>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
