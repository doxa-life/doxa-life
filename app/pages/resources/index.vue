<script setup lang="ts">
// /resources is not CMS content — the live page is a heading, intro
// paragraph, and the [general_resources] shortcode. The shortcode
// links out to 4 CMS child pages under /resources/, and the WP theme
// renders a sidebar with those children on both the parent and each
// child page. We match that here by fetching the /api/pages/resources
// payload (parent + children) and rendering the same sidebar the
// catch-all [...slug].vue uses.

interface PageResponse {
  title: string
  menu_parent: { slug: string; title: string }
  children: Array<{ slug: string; title: string }>
}

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data } = await useAsyncData<PageResponse | null>(
  () => `resources-${locale.value}`,
  async () => {
    try {
      return await $fetch<PageResponse>('/api/pages/resources', {
        query: { locale: locale.value }
      })
    } catch {
      return null
    }
  },
  { watch: [() => locale.value] }
)

const hasSidebar = computed(() => (data.value?.children.length ?? 0) > 0)

useHead(() => ({ title: t('Adoption Resources') }))
</script>

<template>
  <div class="container page-content">
    <div :class="hasSidebar ? 'with-sidebar' : ''">
      <aside v-if="hasSidebar && data" class="sidebar">
        <nav class="stack" aria-label="Child pages navigation">
          <div>
            <ul class="stack | max-width-xs" role="list">
              <li>
                <NuxtLink
                  class="font-size-lg current-link"
                  :to="localePath(`/${data.menu_parent.slug}`)"
                >{{ data.menu_parent.title }}</NuxtLink>
              </li>
              <li v-for="child in data.children" :key="child.slug">
                <NuxtLink :to="localePath(`/${child.slug}`)">
                  {{ child.title }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <article class="stack stack--lg">
        <h1>{{ t('Adoption Resources') }}</h1>
        <p>
          {{ t('These resources are available to any church looking to learn more about Unengaged, Unreached People Groups and grow in their understanding of global mission. Use them to educate your congregation, deepen your church’s commitment to prayer, and explore ways your community can play a part in bringing the gospel to those who have never heard.') }}
        </p>
        <GeneralResources />
      </article>
    </div>
  </div>
</template>
