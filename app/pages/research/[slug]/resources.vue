<script setup lang="ts">
// Port of marketing-theme/template-uupg-resources.php (WP rewrite
// /research/{slug}/resources/ → template-uupg-resources.php). Fetches
// the people group by slug from
// `{prayBaseUrl}/api/people-groups/detail/{slug}?lang={locale}` and
// renders the adoption-resource download cards plus the shared
// <GeneralResources> list below.

import type { Uupg, ValueLabel } from '~/types/uupg'

interface UupgDetail extends Uupg {
  country_code?: ValueLabel
  rop1?: ValueLabel
  error?: string
}

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const config = useRuntimeConfig()

const slug = computed(() => String(route.params.slug || ''))

useTextHighlight()

const { data: uupg, error: uupgError } = await useAsyncData<UupgDetail | null>(
  `uupg-resources-${slug.value}-${locale.value}`,
  async () => {
    if (!slug.value) return null
    const url = `${config.public.prayBaseUrl}/api/people-groups/detail/${encodeURIComponent(slug.value)}?lang=${locale.value}`
    try {
      return await $fetch<UupgDetail>(url)
    } catch {
      return { error: 'not_found' } as UupgDetail
    }
  }
)

const notFound = computed(() => !uupg.value || 'error' in (uupg.value as UupgDetail))

const S3_URL = 'https://s3.doxa.life/'

interface AdoptionResource {
  key: string
  title: string
  imageUrl: string
  style?: string
  downloadLink: string
}

const adoptionResources = computed<AdoptionResource[]>(() => {
  const s = slug.value
  const lang = locale.value
  return [
    {
      key: 'adoption_certificate',
      title: 'Adoption Certificate',
      imageUrl: '/assets/images/certificate.png',
      downloadLink: `${S3_URL}adoption-resources/certificate-${s}-${lang}.pdf`
    },
    {
      key: 'uupg_photo',
      title: 'UUPG Photo',
      imageUrl: '/assets/images/profile.png',
      style: 'width: 50%;',
      downloadLink: `${S3_URL}adoption-resources/uupg-photo-${s}.jpg`
    },
    {
      key: 'prayer_campaign_qr_code',
      title: 'Prayer Campaign QR Code',
      imageUrl: '/assets/images/qr.png',
      style: 'width: 50%; padding-top: 5%; padding-bottom: 5%;',
      downloadLink: `${S3_URL}adoption-resources/qr-code-${s}-${lang}.png`
    },
    {
      key: 'prayer_card',
      title: 'Printable Prayer Cards',
      imageUrl: '/assets/images/card.png',
      downloadLink: `${S3_URL}adoption-resources/prayer-card-${s}-${lang}.pdf`
    },
    {
      key: 'promo_slide',
      title: 'Promo Slide',
      imageUrl: '/assets/images/slide.png',
      downloadLink: `${S3_URL}adoption-resources/promo-slide-${s}-${lang}.jpg`
    },
    {
      key: 'social_share',
      title: 'Social Share',
      imageUrl: '/assets/images/social.png',
      style: 'width: 40%;',
      downloadLink: `${S3_URL}adoption-resources/social-share-${s}-${lang}.jpg`
    }
  ]
})

// Mirror the shortcode's inline <script>: fetch → Blob → programmatic
// download so the browser doesn't navigate away. Falls back to a new
// tab on failure.
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
  <div v-if="notFound || uupgError" class="container page-content uupg-detail-page">
    <div class="stack stack--lg">
      <h1>{{ t('People Group Not Found') }}</h1>
      <p>{{ t('The people group you are looking for could not be found. Please try again.') }}</p>
      <NuxtLink :to="localePath('/research')" class="button font-size-lg">
        <span class="sr-only">{{ t('Back') }}</span>
        <svg class="icon | rotate-270" viewBox="0 0 489.67 289.877">
          <path d="M439.017,211.678L263.258,35.919c-3.9-3.9-8.635-6.454-13.63-7.665-9.539-2.376-20.051.161-27.509,7.619L46.361,211.632c-11.311,11.311-11.311,29.65,0,40.961h0c11.311,11.311,29.65,11.311,40.961,0L242.667,97.248l155.39,155.39c11.311,11.311,29.65,11.311,40.961,0h0c11.311-11.311,11.311-29.65,0-40.961Z" />
        </svg>
        {{ t('Back') }}
      </NuxtLink>
    </div>
  </div>

  <div v-else-if="uupg" class="uupg-detail-page" @click="handleDownloadClick">
    <div class="surface-brand-light py-xl color-secondary">
      <div class="container">
        <h1 class="text-center">{{ t('Adoption Resources') }}</h1>
      </div>
    </div>
    <div class="surface-white py-xl stack-spacing-none">
      <div class="container">
        <div class="switcher">
          <div class="center | grow-none">
            <img
              class="uupg__image"
              data-size="medium"
              data-shape="portrait"
              :src="uupg.image_url"
              :alt="uupg.name || 'People Group Photo'"
            >
          </div>
          <div class="stack stack--xs | uupg__header">
            <h2 class="color-primary">{{ t('Your UUPG') }}</h2>
            <h3 class="h1 font-weight-medium">{{ uupg.name }}</h3>
            <p class="font-weight-medium font-size-lg">
              {{ uupg.country_code?.label }} ({{ uupg.rop1?.label }})
            </p>
            <NuxtLink :to="localePath(`/research/${slug}`)" class="button compact">
              {{ t('View full profile') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <section class="surface-white mt-2xl">
      <div class="container stack stack--xl">
        <h2>{{ t('Introduction') }}</h2>
        <h3 class="color-brand-lighter stack-spacing-3xl">{{ t('Welcome to the adoption Journey') }}</h3>
        <p class="max-width-lg">
          {{ t('Thank you for adopting this Unengaged, Unreached People Group. Your church is joining a global movement asking God to open the way for the gospel among people who currently have little or no access to it. This page provides resources to help your church stay informed, mobilize prayer, and explore how God may use your community to help bring the good news of Jesus to this people group.') }}
        </p>

        <h3 class="color-brand-lighter stack-spacing-3xl">{{ t('Your role as an adopting church') }}</h3>
        <ul>
          <li>{{ t('Pray regularly for this people group and for gospel breakthrough') }}</li>
          <li>{{ t('Mobilize others in your church to join in prayer') }}</li>
          <li>{{ t('Give to support gospel work among unreached peoples') }}</li>
          <li>{{ t('Send or raise up workers who may go and serve among them') }}</li>
        </ul>

        <h3 class="color-brand-lighter stack-spacing-3xl">{{ t('Resources available on this page') }}</h3>
        <ul>
          <li>{{ t('Printable prayer cards and people group images') }}</li>
          <li>{{ t('Graphics, QR code and slides for sharing with your congregation') }}</li>
          <li>{{ t('Additional tools to help your church stay engaged in prayer for this people group') }}</li>
        </ul>
      </div>
    </section>

    <section class="container stack stack--3xl">
      <h2 class="text-center">{{ t('Your Adoption Resources') }}</h2>

      <div class="grid" data-width-md>
        <div
          v-for="resource in adoptionResources"
          :key="resource.key"
          class="card | resource-card | stack stack--xs | align-center rounded-md"
          padding-small
        >
          <div class="resource-card__image" :style="resource.style">
            <img :src="resource.imageUrl" :alt="t(resource.title)">
          </div>
          <h3 class="h4 text-center font-heading mb-auto">{{ t(resource.title) }}</h3>
          <div class="switcher | text-center gap-md" data-width="xs">
            <a target="_blank" :href="resource.downloadLink" class="button extra-compact outline">
              {{ t('View') }}
            </a>
            <a download :href="resource.downloadLink" class="button extra-compact">
              {{ t('Download') }}
            </a>
          </div>
        </div>
      </div>
    </section>

    <section class="surface-secondary-light">
      <div class="container stack stack--3xl">
        <h2 class="text-center">{{ t('General Resources') }}</h2>
        <GeneralResources layout="on-page" />
      </div>
    </section>
  </div>
</template>
