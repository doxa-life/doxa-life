<script setup>
/**
 * WorkflowFooter — action buttons + optional progress bar. Sits at bottom
 * of a workflow card. Renders nothing if no slot content and no progress.
 */
const props = defineProps({
  progress: { type: Number, default: null },  // 0..1 or null
  busy:     { type: Boolean, default: false },
});
</script>

<template>
  <footer class="workflow-footer">
    <div v-if="progress !== null" class="workflow-footer__bar">
      <div class="workflow-footer__bar-fill" :style="{ width: (progress * 100) + '%' }" />
    </div>
    <div class="workflow-footer__actions">
      <slot />
      <span v-if="busy" class="workflow-footer__busy">Working…</span>
    </div>
  </footer>
</template>

<style scoped>
.workflow-footer {
  border-top: 1px solid var(--wf-border, #e5e7eb);
  padding: 0.75rem 1rem;
}
.workflow-footer__bar {
  height: 4px;
  width: 100%;
  background: var(--wf-bar-bg, #f3f4f6);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}
.workflow-footer__bar-fill {
  height: 100%;
  background: var(--wf-bar, #2563eb);
  transition: width 200ms;
}
.workflow-footer__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.workflow-footer__busy {
  font-size: .75rem;
  color: var(--wf-muted, #6b7280);
  margin-left: auto;
}
</style>
