<script setup lang="ts">
// Port of marketing-theme/footer.php. Must match the live output exactly
// — see /Users/jd/code/doxa/marketing-theme/footer.php for the source.

import { FOOTER_NAV } from '~/utils/nav'

const { t } = useI18n()
const localePath = useLocalePath()
const siteName = 'Doxa.Life'
const year = new Date().getFullYear()
</script>

<template>
  <footer id="colophon" class="footer">
    <div class="container | footer__content">
      <div class="footer__left stack stack--xs">
        <div>
          <img
            src="/assets/DOXA-logo-light-with-text.png"
            alt="DOXA Logo"
            class="mx-auto"
            width="120"
            height="auto"
          >
        </div>
      </div>
      <div class="footer__center">
        <div class="footer__description">
          <h3>{{ siteName }}</h3>
          <p>{{ t('Global Partnership for the Unreached') }}</p>
        </div>
        <nav class="main-navigation">
          <div class="menu-footer-container">
            <ul id="menu-footer" class="main-navigation role-list">
              <li v-for="item in FOOTER_NAV" :key="item.key" class="menu-item">
                <a
                  v-if="item.href"
                  :href="item.href"
                  target="_blank"
                  rel="noopener"
                  class="with-icon"
                >
                  {{ t(item.key) }}
                  <ExternalLinkIcon />
                </a>
                <NuxtLink v-else-if="item.to" :to="localePath(item.to)" :rel="item.rel">
                  {{ t(item.key) }}
                </NuxtLink>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div class="footer__right">
        <NuxtLink :to="localePath('/contact-us')" class="button compact white">
          {{ t('Contact Us') }}
        </NuxtLink>
      </div>
    </div>
    <div class="center | footer__copyright">
      <p>&copy; {{ year }} {{ siteName }}. {{ t('All rights reserved.') }}</p>
    </div>
  </footer>
</template>
