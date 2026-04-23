<script setup>
/**
 * LoadingOverlay — full-viewport modal w/ spinner and step progress.
 * Replaces the imperative DOM-injection class
 * `vue-geo-steward/src/components/ui/legacy-loading-popup.js`
 * (`LoadingModal_UI.show/hide/setStep`) with a declarative SFC.
 *
 * Props:
 *   visible    (Boolean)
 *   title      (String)
 *   message    (String)
 *   currentStep(Number)   — 0-based
 *   totalSteps (Number)
 *   determinate(Boolean)  — if false, hides the bar
 *
 * Slots:
 *   default    — extra content under the message
 */
import { computed } from 'vue';

const props = defineProps({
  visible:     { type: Boolean, default: false },
  title:       { type: String, default: 'Processing…' },
  message:     { type: String, default: 'Please wait' },
  currentStep: { type: Number, default: 0 },
  totalSteps:  { type: Number, default: 1 },
  determinate: { type: Boolean, default: true },
});

const pct = computed(() => {
  if (!props.determinate || props.totalSteps <= 0) return 0;
  return Math.max(0, Math.min(100, (props.currentStep / props.totalSteps) * 100));
});
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="gs-loading" role="dialog" aria-modal="true">
      <div class="gs-loading__card">
        <div class="gs-loading__spinner" />
        <h3 class="gs-loading__title">{{ title }}</h3>
        <div v-if="determinate" class="gs-loading__bar">
          <div class="gs-loading__fill" :style="{ width: pct + '%' }" />
        </div>
        <div v-if="determinate" class="gs-loading__step">
          Step {{ currentStep }} of {{ totalSteps }}
        </div>
        <div class="gs-loading__msg">{{ message }}</div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gs-loading {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.7);
  display: flex; justify-content: center; align-items: center;
  z-index: 10000;
  font-family: var(--gs-font, system-ui, sans-serif);
}
.gs-loading__card {
  background: var(--gs-loading-bg, #ffffff);
  color:      var(--gs-loading-fg, #111827);
  border-radius: 12px;
  padding: 30px;
  min-width: 320px;
  max-width: 480px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,.3);
}
.gs-loading__spinner {
  width: 48px; height: 48px;
  border: 4px solid var(--gs-loading-track, #f3f3f3);
  border-top-color: var(--gs-loading-accent, #2c7fb8);
  border-radius: 50%;
  margin: 0 auto 18px;
  animation: gs-spin 1s linear infinite;
}
.gs-loading__title { margin: 0 0 12px; font-size: 1.1rem; }
.gs-loading__bar {
  height: 8px; width: 100%;
  background: var(--gs-loading-track, #f0f0f0);
  border-radius: 10px; overflow: hidden;
  margin: 14px 0 6px;
}
.gs-loading__fill {
  height: 100%;
  background: var(--gs-loading-accent, #2c7fb8);
  transition: width 250ms;
}
.gs-loading__step { font-size: .75rem; color: var(--gs-muted, #6b7280); margin-bottom: 8px; }
.gs-loading__msg  { font-size: .85rem; color: var(--gs-muted, #6b7280); }
@keyframes gs-spin { to { transform: rotate(360deg); } }
</style>
