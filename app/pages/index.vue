<script setup lang="ts">
// Placeholder home page. Phase 3 replaces this with the full port of
// marketing-theme/front-page.php (hero video, reel, step cards, etc.).
const { t } = useI18n()
</script>

<template>
  <section class="stack stack--md container">
    <div>
      <h2 class="color-brand">{{ t('Our gift to Jesus') }}:</h2>
      <h1 class="color-brand-light">{{ t('Engage every people by 2033') }}</h1>
    </div>
    <p>
      {{ t('The DOXA Vision: Click image to watch the video') }}
    </p>
  </section>
</template>
