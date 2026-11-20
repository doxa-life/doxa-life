<script setup lang="ts">
// UUPGs tab in the header. Links to the live PDF of every people group with
// no one signed up to pray for them, served by the campaigns server, plus two
// static UUPG spreadsheets on s3.doxa.life (R2 bucket `doxa`, documents/).
// Replace those files in the bucket to update them; no deploy needed.

const S3_URL = 'https://s3.doxa.life/'

const { t } = useI18n()
const config = useRuntimeConfig()

const pdfUrl = `${config.public.prayBaseUrl as string}/api/people-groups/without-prayer-pdf`

useHead(() => ({ title: t('UUPGS') }))
</script>

<template>
  <div class="container page-content">
    <article class="stack stack--lg">
      <h1>{{ t('Unengaged, Unreached People Groups') }}</h1>
      <p>{{ t('These people groups have no one signed up to pray for them yet. The list is updated continuously and sorted by population, largest first. Each name links to its prayer page.') }}</p>
      <div>
        <a :href="pdfUrl" target="_blank" rel="noopener" class="button | compact">
          {{ t('People groups with no one praying (PDF)') }}
        </a>
      </div>
      <div class="cluster">
        <a :href="`${S3_URL}documents/UUPGs.xlsx`" download class="button | compact">
          {{ t('Full UUPG list (Excel)') }}
        </a>
        <a :href="`${S3_URL}documents/UUPGs-by-Population.xlsx`" download class="button | compact">
          {{ t('UUPGs by population (Excel)') }}
        </a>
      </div>
    </article>
  </div>
</template>
