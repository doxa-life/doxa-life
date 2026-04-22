<script setup lang="ts">
// Port of marketing-theme/shortcodes/general-resources-shortcode.php.
// Renders the always-present image cards row plus either the
// "general resources" list (default) or the "documents" list
// (`useDocuments`) as the second grid. Same CUBE CSS class names as
// the PHP template so the ported SCSS lays it out verbatim.

import {
  resourcesWithImage,
  generalResourcesNoImage,
  documentResourcesNoImage,
  type ResourceWithImage,
  type ResourceNoImage
} from '~/utils/generalResources'
import { getVideoUrl } from '~/utils/videoUrls'

const props = withDefaults(defineProps<{
  useDocuments?: boolean
  layout?: 'on-sidebar-page' | 'on-page'
}>(), {
  useDocuments: false,
  layout: 'on-sidebar-page'
})

const { t, locale } = useI18n()
const localePath = useLocalePath()

// First-grid width comes from the shortcode's `data-width-{sm|md}`
// attribute — `sm` on sidebar pages, `md` otherwise.
const firstGridAttr = computed(() =>
  props.layout === 'on-sidebar-page' ? { 'data-width-sm': '' } : { 'data-width-md': '' }
)

const imageResources = computed<ResourceWithImage[]>(() => resourcesWithImage(getVideoUrl))
const noImageResources = computed<ResourceNoImage[]>(() =>
  props.useDocuments
    ? documentResourcesNoImage()
    : generalResourcesNoImage(localePath as (p: string) => string)
)

// Re-implement the shortcode's inline <script> — fetch the file, create
// a Blob URL, and trigger a programmatic download so browsers don't
// navigate away. Fallback to window.open on failure.
async function handleDownloadClick(e: MouseEvent) {
  const anchor = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[download]')
  if (!anchor) return
  e.preventDefault()
  const url = anchor.href
  const filename = url.split('/').pop()?.split('?')[0] ?? 'download'
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Download failed')
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch (err) {
    console.error('Download failed', err)
    window.open(url, '_blank')
  }
}
</script>

<template>
  <div class="stack stack--2xl" @click="handleDownloadClick">
    <div class="grid" v-bind="firstGridAttr">
      <div
        v-for="resource in imageResources"
        :key="resource.key"
        class="card | resource-card | stack stack--xs | align-center rounded-md"
        padding-small
      >
        <div class="resource-card__image" :style="resource.style">
          <img :src="resource.imageUrl" :alt="t(resource.title)">
        </div>
        <div class="mb-auto">
          <h3 class="h4 text-center font-heading">{{ t(resource.title) }}</h3>
          <p
            v-if="!resource.hasTranslation(locale)"
            class="text-center font-size-sm font-style-italic color-brand-lighter"
          >{{ t('In English') }}</p>
        </div>
        <div class="switcher | text-center gap-md" data-width="xs">
          <a
            :href="resource.downloadLink(locale)"
            target="_blank"
            class="button extra-compact"
            :class="{ outline: resource.downloadType === 'file' }"
          >{{ t('View') }}</a>
          <a
            v-if="resource.downloadType === 'file'"
            :href="resource.downloadLink(locale)"
            target="_blank"
            download
            class="button extra-compact"
          >{{ t('Download') }}</a>
        </div>
      </div>
    </div>

    <div class="grid" data-width-lg>
      <div
        v-for="resource in noImageResources"
        :key="resource.key"
        class="card | resource-card | switcher | align-center rounded-md"
        data-width="md"
        padding-small
      >
        <div>
          <h3 class="h5 font-weight-medium">{{ t(resource.title) }}</h3>
          <p
            v-if="resource.downloadType === 'file' && !resource.hasTranslation(locale)"
            class="font-size-sm stack-spacing-0 font-style-italic color-brand-lighter"
          >{{ t('In English') }}</p>
        </div>
        <div class="switcher gap-md | text-center" data-width="xs">
          <a
            :href="resource.downloadLink(locale)"
            target="_blank"
            class="button extra-compact"
            :class="{ outline: resource.downloadType === 'file' }"
          >{{ t('View') }}</a>
          <a
            v-if="resource.downloadType === 'file'"
            :href="resource.downloadLink(locale)"
            target="_blank"
            download
            class="button extra-compact"
          >{{ t('Download') }}</a>
        </div>
      </div>
    </div>
  </div>
</template>
