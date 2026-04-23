<script setup>
/**
 * AppShell — three-row layout with `header`, `main`, and `footer` slots.
 * Ported from `vue-geo-steward/src/components/layout/header-main-footer.js`.
 *
 * Props:
 *   headerTitle (String)  — text in default header bar
 *   footerText  (String)  — text in default footer bar
 *
 * Slots:
 *   header  — full custom header (overrides headerTitle)
 *   main    — primary content area
 *   footer  — full custom footer (overrides footerText)
 *
 * Emits:
 *   warning — clicked the "Why this warning?" link in the default header
 */

defineProps({
  headerTitle: { type: String, default: 'Geo Steward' },
  footerText:  { type: String, default: '' },
});
const emit = defineEmits(['warning']);
</script>

<template>
  <div class="gs-app-shell">
    <header class="gs-app-shell__header">
      <slot name="header">
        <div class="gs-app-shell__title">
          <span>{{ headerTitle }}</span>
        </div>
        <button
          v-if="$attrs.onWarning"
          type="button"
          class="gs-app-shell__warning"
          @click="emit('warning')"
        >
          (Why this warning?)
        </button>
      </slot>
    </header>

    <main class="gs-app-shell__main">
      <slot name="main">
        <slot />
      </slot>
    </main>

    <footer v-if="footerText || $slots.footer" class="gs-app-shell__footer">
      <slot name="footer">{{ footerText }}</slot>
    </footer>
  </div>
</template>

<style scoped>
.gs-app-shell {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  min-height: 0;
  background: var(--gs-bg, #ffffff);
  color: var(--gs-fg, #111827);
  font-family: var(--gs-font, system-ui, sans-serif);
}
.gs-app-shell__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: .75rem 1rem;
  background: var(--gs-header-bg, #0f172a);
  color: var(--gs-header-fg, #f8fafc);
}
.gs-app-shell__title { font-weight: 600; font-size: 1.05rem; }
.gs-app-shell__warning {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--gs-warning, #f59e0b);
  cursor: pointer;
  font-size: .8rem;
}
.gs-app-shell__main { overflow: auto; min-height: 0; }
.gs-app-shell__footer {
  padding: .5rem 1rem;
  background: var(--gs-footer-bg, #f1f5f9);
  color: var(--gs-footer-fg, #475569);
  font-size: .8rem;
  text-align: center;
}
</style>
