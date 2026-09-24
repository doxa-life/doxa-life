<script setup lang="ts">
// The two official store badges. Apple and Google each require their own
// artwork, unaltered, so the files in public/assets/images/badges are the
// ones their badge tools hand out (same set the campaigns server uses).
//
// The Apple badge is hidden when no App Store link is available — the iOS
// app only shows up once MOBILE_APP_APPLE_ID is configured.

defineProps<{
  appStoreUrl?: string | null
  googlePlayUrl: string
}>()

const { t, locale } = useI18n()

// Apple publishes no Arabic or Hindi badge — their tool returns the English
// artwork for those locales, so those locales fall back to it here.
const APP_STORE_BADGE_LOCALES = ['de', 'en', 'es', 'fr', 'it', 'pt', 'ro', 'ru', 'zh']
const GOOGLE_PLAY_BADGE_LOCALES = ['ar', 'de', 'en', 'es', 'fr', 'hi', 'it', 'pt', 'ro', 'ru', 'zh']

function badgeLocale(available: string[]) {
  return available.includes(locale.value) ? locale.value : 'en'
}

const appStoreBadge = computed(() => `/assets/images/badges/app-store-${badgeLocale(APP_STORE_BADGE_LOCALES)}.svg`)
const googlePlayBadge = computed(() => `/assets/images/badges/google-play-${badgeLocale(GOOGLE_PLAY_BADGE_LOCALES)}.png`)
</script>

<template>
  <div class="app-store-badges">
    <a
      v-if="appStoreUrl"
      :href="appStoreUrl"
      class="app-store-badges__link"
      target="_blank"
    >
      <img
        class="app-store-badges__apple"
        :src="appStoreBadge"
        :alt="t('Download on the App Store')"
        width="120"
        height="40"
        loading="lazy"
      >
    </a>
    <a :href="googlePlayUrl" class="app-store-badges__link" target="_blank" rel="noopener noreferrer">
      <img
        class="app-store-badges__google"
        :src="googlePlayBadge"
        :alt="t('Get it on Google Play')"
        width="155"
        height="60"
        loading="lazy"
      >
    </a>
  </div>
</template>

<style scoped>
.app-store-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.app-store-badges__link {
  flex: 0 0 auto;
}

/* Google's badge carries its mandatory clear space inside the image, so it
   is rendered taller than Apple's to make the two read at the same size. */
.app-store-badges__apple {
  height: 44px;
  width: auto;
  border-radius: 0;
}

.app-store-badges__google {
  height: 66px;
  width: auto;
}
</style>
