<script setup lang="ts">
// Port of marketing-theme/page-uupgs.php.
// Matches the PHP markup verbatim: container page-content uupgs-page stack
// stack--3xl + a highlighted h1 + the <UupgsList> component. The
// `initialSearchTerm` is taken from the `uupg_search` query parameter
// (PHP equivalent: `get_query_var('uupg_search')`).
//
// Below the UupgsList we embed the 5-tab `research-map` IIFE built from
// the upstream DOXA-MAPS module — exposes Engagement / Prayer
// / Adoption (clones of doxa-simple-map) plus Language Families. The
// 1040-maps build now publishes /js/doxa-research-map.js (canonical name).
// via the publishToDoxaLife() plugin.

import { buildUupgListTranslations } from '~/utils/uupgListTranslations'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const initialSearchTerm = computed(() =>
  (Array.isArray(route.query.uupg_search) ? route.query.uupg_search[0] : route.query.uupg_search) ?? ''
)

const translations = computed(() => buildUupgListTranslations(t))

const runtimeConfig = useRuntimeConfig()
const researchProfileConfig = computed(() => JSON.stringify({
  profile:    'research-map',
  tk:         (runtimeConfig.public as { mapboxToken?: string }).mapboxToken || '',
  dataSource: 'pray-tools',
  instanceId: 'research-page',
  // Active Nuxt locale → drives the map bundle's UI i18n AND its API `lang`
  // param so /fr/research, /es/research etc. render French/Spanish chrome and
  // data, not English. See research-map.vue (activeLocale) + DataSourceManager.
  locale:     locale.value,
  // Per-map zoom-OUT floor only (feedback #1 /pray): pin a lower bound so the
  // map can't zoom out past world context. The zoom-IN cap is intentionally
  // NOT set here — the research map must reach street level (RESEARCH_MAX_ZOOM
  // = 18 in research-map.vue) so users can zoom deep into a dense cluster and
  // click *between* overlapping pins (Driver directive 2026-06-22). Do NOT
  // re-add a maxZoom here; it would override the 18 cap and re-block zoom-in.
  minZoom:    0.5
}))

// Feedback widget — mirrors the pray.vue pattern (qa.md R5 status flag).
const researchFeedbackConfig = JSON.stringify({
  profile: 'chat-bubble',
  apiBase: 'https://support.gospelambition.org',
  enabled: true,
  showByDefault: false,
  instanceId: 'fb-research-map',
  projectId: '1be56abd-60fd-4366-ad4f-178dddef657d'
})

useTextHighlight()
</script>

<template>
  <div class="container page-content uupgs-page stack stack--3xl">
    <h1 class="text-center highlight" data-highlight-last>{{ t('Find a UUPG') }}</h1>

    <!-- Research map embed — sits directly under the H1, above the UUPG
         search bar. Loads /js/doxa-research-map.js (auto-published from
         the upstream module on every research-mfe build). -->
    <DoxaMapSlot
      map-id="research-page-map"
      bundle="research-map"
      :profile-config="researchProfileConfig"
      class="rounded-xlg"
    >
      <FeedbackWidgetSlot :profile-config="researchFeedbackConfig" />
    </DoxaMapSlot>

    <UupgsList
      :language-code="locale"
      :research-url="localePath('/research') + '/'"
      :t="translations"
      :initial-search-term="initialSearchTerm"
      hide-see-all-link
    />
  </div>
</template>
