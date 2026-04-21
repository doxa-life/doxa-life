<script setup lang="ts">
// Port of marketing-theme/header.php.
// Layout: logo + WAGF tagline on the left, primary nav + hamburger toggle
// on the right, plus a slide-down hamburger overlay for mobile.

import { PRIMARY_NAV, SECONDARY_NAV } from '~/utils/nav'

const { t } = useI18n()
const localePath = useLocalePath()
const { isOpen, close, toggle } = useMobileMenu()

// Close the drawer when navigating to a new page.
const route = useRoute()
watch(() => route.fullPath, close)
</script>

<template>
  <header id="masthead" class="position-relative">
    <div
      class="hamburger-menu-overlay"
      :data-state="isOpen ? 'open' : 'closed'"
      @click="close"
    />

    <nav
      id="hamburger-menu"
      class="hamburger-menu"
      aria-label="Hamburger menu"
      :data-state="isOpen ? 'open' : 'closed'"
    >
      <ul id="secondary-menu" class="role-list stack">
        <li v-for="item in SECONDARY_NAV" :key="item.key" class="menu-item">
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
          <NuxtLink v-else-if="item.to" :to="localePath(item.to)">
            {{ t(item.key) }}
          </NuxtLink>
        </li>
        <LanguageSwitcher />
      </ul>
    </nav>

    <div class="header">
      <div class="container">
        <div class="header-content">
          <div class="site-branding">
            <NuxtLink :to="localePath('/')" rel="home">
              <img
                src="/assets/Small Banner/DOXA-small-light-banner.png"
                class="logo"
                alt="Doxa.Life"
                width="250"
                height="auto"
              >
            </NuxtLink>
            <span class="wagf-text">
              {{ t('World assemblies of God Fellowship') }}
            </span>
          </div>

          <div class="header-menu">
            <nav id="site-navigation" class="main-navigation">
              <ul id="primary-menu" class="role-list">
                <li v-for="item in PRIMARY_NAV" :key="item.key" class="menu-item">
                  <a v-if="item.href" :href="item.href" :rel="item.rel">
                    {{ t(item.key) }}
                  </a>
                  <NuxtLink v-else-if="item.to" :to="localePath(item.to)">
                    {{ t(item.key) }}
                  </NuxtLink>
                </li>
                <LanguageSwitcher />
              </ul>
            </nav>

            <button
              class="mobile-menu-toggle"
              :class="{ open: isOpen }"
              aria-label="Toggle navigation menu"
              :aria-expanded="isOpen"
              @click="toggle"
            >
              <span class="hamburger-line" />
              <span class="hamburger-line" />
              <span class="hamburger-line" />
              <span class="hamburger-line" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
