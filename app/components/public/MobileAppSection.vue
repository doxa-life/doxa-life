<script setup lang="ts">
// "Take the unreached with you" — the DOXA Prayer App promo section, used at
// the bottom of /pray and of each research people group page. The heading is one
// message either way: the people group's name fills the placeholder, or the
// collective noun does (see headingTerm below).
//
// Where a people group is in hand (the research detail page) both badges point
// at the campaigns-server smart link, `{prayBaseUrl}/app/<slug>`: it opens an
// installed app straight on that people group and, on Android, carries the slug
// through the Play install referrer so a fresh install lands there too
// (deferred deep linking — see doxa-campaigns-server server/routes/app/[slug]).
// With no people group there is nothing to defer, so the badges go straight to
// the stores, built from the MOBILE_APP_* ids in runtime config.

const props = defineProps<{
  peopleGroupName?: string | null
  peopleGroupSlug?: string | null
}>()

const { t } = useI18n()
const config = useRuntimeConfig()

const prayBaseUrl = config.public.prayBaseUrl as string
const appleId = config.public.mobileAppAppleId as string
const androidPackage = config.public.mobileAppAndroidPackage as string

const appStoreUrl = computed(() => {
  if (!appleId) return null
  return props.peopleGroupSlug
    ? `${prayBaseUrl}/app/${props.peopleGroupSlug}?store=ios`
    : `https://apps.apple.com/app/id${appleId}`
})

const googlePlayUrl = computed(() => {
  if (props.peopleGroupSlug) return `${prayBaseUrl}/app/${props.peopleGroupSlug}?store=android`
  const referrer = encodeURIComponent('utm_source=doxa_life&utm_medium=referral')
  return `https://play.google.com/store/apps/details?id=${androidPackage}&referrer=${referrer}`
})

// The heading accents whatever fills the placeholder — the people group's name,
// or the collective noun when the section stands on its own. Both go through one
// message so each language decides where the accented phrase sits; a fixed word
// index would land on "unreached" in English and on "a" or "te" elsewhere.
//
// A locale that hasn't translated a string gets the English key back, and that
// fallback is *not* interpolated (see i18n.config.ts) — so pass the placeholder
// through as the argument and split on it here.
const headingTerm = computed(() => props.peopleGroupName || t('unreached'))

const titleParts = computed(() => {
  const [before = '', after = ''] = t('Take the {0} with you', ['{0}']).split('{0}')
  return { before, after }
})
</script>

<template>
  <section class="surface-white">
    <div class="container">
      <div class="switcher | align-center" data-width="xl">
        <div class="stack | grow-2 align-center">
          <div class="stack stack--2xl">
            <p class="color-brand-lighter font-weight-medium uppercase">
              {{ t('The DOXA Prayer App') }}
            </p>
            <h2 class="stack-spacing-sm">
              {{ titleParts.before }}<span class="color-primary">{{ headingTerm }}</span>{{ titleParts.after }}
            </h2>
            <ul class="stack stack--sm" data-list-color="primary">
              <li>{{ t('Daily reminders at the time you choose') }}</li>
              <li>{{ t('Today\'s prayer ready to open') }}</li>
              <li>{{ t('See how many people are praying with you now') }}</li>
            </ul>
            <AppStoreBadges
              id="app-store-links"
              :app-store-url="appStoreUrl"
              :google-play-url="googlePlayUrl"
            />
            <p class="font-size-sm color-brand-light stack-spacing-sm">
              {{t('Download and choose your people group in the app.')}}
            </p>
          </div>
        </div>
        <div>
          <picture>
            <source
              srcset="/assets/images/pray-02-PrayerFUEL-Phone-graphic-2.avif"
              type="image/avif"
            >
            <source
              srcset="/assets/images/pray-02-PrayerFUEL-Phone-graphic-2.webp"
              type="image/webp"
            >
            <img
              class="center"
              src="/assets/images/pray-02-PrayerFUEL-Phone-graphic-2.png"
              :alt="t('Your daily prayer guide')"
              width="500"
              height="872"
              loading="lazy"
            >
          </picture>
        </div>
      </div>
    </div>
  </section>
</template>
