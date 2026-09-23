<script setup lang="ts">
// Message-category picker for the contact form, mirroring the campaigns-server
// feedback form's three options. The values are the feedback types the
// campaigns-server understands (`compliment` / `suggestion` / `problem`); only
// the labels are worded for a contact-us page.

import type { MessageType } from '~/types/contact'

const model = defineModel<MessageType | null>({ default: null })

defineProps<{
  /** id of the field label, so the group is announced with it. */
  labelId?: string
}>()

const { t } = useI18n()

const options = computed<{ value: MessageType, label: string }[]>(() => [
  { value: 'compliment', label: t('Compliment') },
  { value: 'suggestion', label: t('Suggestion') },
  { value: 'problem', label: t('Problem') }
])
</script>

<template>
  <div
    class="cluster message-type-select"
    role="group"
    :aria-labelledby="labelId"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="button compact with-icon"
      :class="{ outline: model !== option.value }"
      :aria-pressed="model === option.value"
      @click="model = option.value"
    >
      <!-- Heart / lightbulb / warning-triangle, matching the feedback form's
           icon set. Stroked rather than filled, so `fill` is overridden here. -->
      <svg
        v-if="option.value === 'compliment'"
        class="icon width-md"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
      <svg
        v-else-if="option.value === 'suggestion'"
        class="icon width-md"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </svg>
      <svg
        v-else
        class="icon width-md"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
/* The shared `.icon` rule fills with currentColor; these are stroked outlines. */
.message-type-select .icon {
  fill: none;
}

.message-type-select .with-icon .icon {
  margin-inline-end: var(--spacing-2xs);
}
</style>
