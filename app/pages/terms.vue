<script setup lang="ts">
// Terminology page (/terms, /{locale}/terms). Hardcoded rather than CMS:
// each locale ships its own edition in app/utils/terms/ documenting that
// language's terminology decisions; locales without an edition fall back
// to the English one. Mounted ahead of the CMS catch-all by route priority.

import { getTermsContent } from '~/utils/terms'

const { locale } = useI18n()
const localePath = useLocalePath()

const content = computed(() => getTermsContent(locale.value))

useHead(() => ({ title: content.value.title }))
</script>

<template>
  <div class="container page-content">
    <h1 class="page-title">{{ content.title }}</h1>
    <div class="page-body">
      <p v-for="(paragraph, i) in content.intro" :key="i">{{ paragraph }}</p>
      <p>
        {{ content.seeDefinitionsBefore }}
        <NuxtLink :to="localePath('/about/definitions')">{{ content.definitionsLinkLabel }}</NuxtLink>{{ content.seeDefinitionsAfter }}
      </p>

      <!-- Entries render as flat children of .page-body — the same shape the
           CMS catch-all produces — so the site's direct-child typography
           rules (heading and paragraph rhythm) apply as on CMS pages.
           Wrapping each entry in an element would defeat those selectors
           (and <section> carries landing-page band padding globally). -->
      <template v-for="entry in content.entries" :key="entry.term">
        <h2>{{ entry.term }}</h2>
        <p v-if="entry.english">
          <em>{{ content.labels.english }} {{ entry.english }}</em>
        </p>
        <p v-if="entry.definition">
          <!-- Spaces are interpolated: literal whitespace at template-fragment
               edges is stripped by Vue's whitespace condensing. -->
          <template v-if="entry.english"><strong>{{ content.labels.definition }}</strong>{{ ' ' }}</template>{{ entry.definition }}
        </p>
        <p v-if="entry.alternatives">
          <strong>{{ content.labels.alternatives }}</strong> {{ entry.alternatives }}
        </p>
        <p v-if="entry.jp || entry.pg">
          <template v-if="entry.jp"><strong>{{ content.labels.jp }}</strong>{{ ' ' + entry.jp }}</template>
          <template v-if="entry.jp && entry.pg">{{ ' ' }}</template>
          <template v-if="entry.pg"><strong>{{ content.labels.pg }}</strong>{{ ' ' + entry.pg }}</template>
        </p>
        <p v-if="entry.rationale">
          <strong>{{ content.labels.rationale }}</strong> {{ entry.rationale }}
        </p>
      </template>
    </div>
  </div>
</template>
