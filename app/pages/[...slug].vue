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
    ]
  }
})

const hasSidebar = computed(() => (data.value?.children.length ?? 0) > 0)
const isParentSelf = computed(() => data.value?.menu_parent.slug === data.value?.slug)
const showChildGrid = computed(() =>
  // Parent page with no body content → render children as cards
  Boolean(data.value && isParentSelf.value && data.value.body_is_empty && data.value.children.length > 0)
)

useTextHighlight()
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
        <div v-if="data.featured_image" class="page-featured-image">
          <img :src="data.featured_image" :alt="data.title">
        </div>

        <h1 v-if="!showChildGrid">{{ data.title }}</h1>

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
