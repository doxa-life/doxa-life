<script setup lang="ts">
// Training tab in the header. Lists everything under Resources in the CMS
// (every section and its pages), read from the same /api/pages endpoint the
// catch-all renderer uses, so edits in the CMS show up here automatically.

interface NavNode {
  kind: 'category' | 'page'
  url: string
  title: string
  items?: NavNode[]
}

interface PageResponse {
  nav_tree?: NavNode
}

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data } = await useAsyncData(
  () => `training-${locale.value}`,
  () => $fetch<PageResponse>('/api/pages/resources', { query: { locale: locale.value } }),
  { watch: [() => locale.value] }
)

const sections = computed(() => data.value?.nav_tree?.items?.filter(i => i.kind === 'category') ?? [])
const loosePages = computed(() => data.value?.nav_tree?.items?.filter(i => i.kind === 'page') ?? [])

useHead(() => ({ title: t('Training') }))
</script>

<template>
  <div class="container page-content">
    <article class="stack stack--lg">
      <h1 class="page-title">{{ t('Training') }}</h1>

      <div class="grid">
        <div
          v-for="section in sections"
          :key="section.url"
          class="card"
          data-variant="secondary"
        >
          <div class="stack">
            <h3>
              <NuxtLink class="color-white" :to="localePath(`/${section.url}`)">
                {{ section.title }}
              </NuxtLink>
            </h3>
            <ul class="stack stack--sm" role="list">
              <li v-for="page in section.items ?? []" :key="page.url">
                <NuxtLink class="color-white" :to="localePath(`/${page.url}`)">
                  {{ page.title }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>

        <div
          v-for="page in loosePages"
          :key="page.url"
          class="card"
          data-variant="secondary"
        >
          <h3>
            <NuxtLink class="color-white" :to="localePath(`/${page.url}`)">
              {{ page.title }}
            </NuxtLink>
          </h3>
        </div>
      </div>
    </article>
  </div>
</template>
