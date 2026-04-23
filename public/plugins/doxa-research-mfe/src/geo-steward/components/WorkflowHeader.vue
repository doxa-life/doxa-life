<script setup>
/**
 * WorkflowHeader — title, optional description, step indicator, and
 * (optional) navigation buttons. Used at the top of a multi-step workflow.
 */
import { computed } from 'vue';

const props = defineProps({
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  step:         { type: Number, default: 0 },
  totalSteps:   { type: Number, default: 0 },
  showNav:      { type: Boolean, default: false },
  canBack:      { type: Boolean, default: true },
  canForward:   { type: Boolean, default: true },
});
const emit = defineEmits(['back', 'forward']);

const stepLabel = computed(() => {
  if (!props.totalSteps) return '';
  return `Step ${props.step + 1} of ${props.totalSteps}`;
});
</script>

<template>
  <header class="workflow-header">
    <div class="workflow-header__text">
      <h2>{{ title }}</h2>
      <p v-if="description">{{ description }}</p>
    </div>
    <div class="workflow-header__meta">
      <span v-if="stepLabel" class="workflow-header__step">{{ stepLabel }}</span>
      <div v-if="showNav" class="workflow-header__nav">
        <button :disabled="!canBack" @click="emit('back')">‹ Back</button>
        <button :disabled="!canForward" @click="emit('forward')">Next ›</button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.workflow-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--wf-border, #e5e7eb);
  gap: 1rem;
}
.workflow-header__text h2 { margin: 0 0 .25rem; font-size: 1.125rem; }
.workflow-header__text p  { margin: 0; color: var(--wf-muted, #6b7280); font-size: .875rem; }
.workflow-header__meta { display: flex; align-items: center; gap: .75rem; }
.workflow-header__step { font-size: .75rem; color: var(--wf-muted, #6b7280); }
.workflow-header__nav button { padding: .25rem .75rem; }
.workflow-header__nav button[disabled] { opacity: .4; cursor: not-allowed; }
</style>
