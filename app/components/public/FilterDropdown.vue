<script setup lang="ts">
// Port of marketing-theme/js/components/src/filter-dropdown.ts (Lit → Vue).
// Classes and markup mirror the source exactly so the existing CUBE SCSS
// (blocks/_filters.scss) styles apply unchanged.

import type { FilterOption } from '~/types/uupg'

const props = withDefaults(defineProps<{
  label: string
  name: string
  options: FilterOption[]
  value?: string
  placeholder?: string
}>(), {
  value: '',
  placeholder: 'Type to search...'
})

const emit = defineEmits<{
  (e: 'filter-change', detail: { name: string; value: string; label: string; type?: 'dropdown' | 'boolean' }): void
  (e: 'filter-clear', detail: { name: string }): void
}>()

const isOpen = ref(false)
const searchText = ref('')
const highlightedIndex = ref(-1)
const rootRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const filteredOptions = computed<FilterOption[]>(() => {
  if (!searchText.value) return props.options
  const search = searchText.value.toLowerCase()
  return props.options.filter(o => o.label.toLowerCase().includes(search))
})

const selectedOption = computed(() => props.options.find(o => o.value === props.value))

function onClickOutside(e: Event) {
  const path = (e as any).composedPath?.() ?? []
  if (rootRef.value && !path.includes(rootRef.value)) {
    close()
  }
}

function toggle() {
  if (isOpen.value) close()
  else open()
}

function open() {
  isOpen.value = true
  searchText.value = ''
  highlightedIndex.value = -1
  document.addEventListener('click', onClickOutside)
  nextTick(() => searchInputRef.value?.focus())
}

function close() {
  isOpen.value = false
  searchText.value = ''
  highlightedIndex.value = -1
  document.removeEventListener('click', onClickOutside)
}

function onSearchInput(e: Event) {
  searchText.value = (e.target as HTMLInputElement).value
  highlightedIndex.value = -1
}

function onKeydown(e: KeyboardEvent) {
  const options = filteredOptions.value
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, options.length - 1)
      scrollHighlightedIntoView()
      break
    case 'ArrowUp':
      e.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      scrollHighlightedIntoView()
      break
    case 'Enter': {
      e.preventDefault()
      const option = options[highlightedIndex.value]
      if (option) select(option)
      break
    }
    case 'Escape':
      e.preventDefault()
      close()
      break
  }
}

function scrollHighlightedIntoView() {
  nextTick(() => {
    const highlighted = rootRef.value?.querySelector('.filter-dropdown__option[data-highlighted]')
    highlighted?.scrollIntoView({ block: 'nearest' })
  })
}

function select(option: FilterOption) {
  emit('filter-change', {
    name: props.name,
    value: option.value,
    label: option.label,
    type: option.type
  })
  close()
}

function clear() {
  emit('filter-clear', { name: props.name })
  close()
}

onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="rootRef" class="filter-dropdown" :class="{ 'is-open': isOpen }">
    <button
      class="filter-dropdown__trigger input"
      :data-active="value ? '' : undefined"
      type="button"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <span class="filter-dropdown__label">
        <template v-if="selectedOption">{{ label }}: <strong>{{ selectedOption.label }}</strong></template>
        <template v-else>{{ label }}</template>
      </span>
      <svg class="filter-dropdown__chevron" width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <div v-if="isOpen" class="filter-dropdown__menu" role="listbox">
      <input
        ref="searchInputRef"
        class="filter-dropdown__search"
        type="text"
        :value="searchText"
        :placeholder="placeholder"
        @input="onSearchInput"
        @keydown="onKeydown"
      >
      <button
        v-if="value"
        class="filter-dropdown__clear"
        type="button"
        @click="clear"
      >Clear selection</button>
      <div class="filter-dropdown__options">
        <template v-if="filteredOptions.length === 0">
          <div class="filter-dropdown__no-options">No options found</div>
        </template>
        <template v-else>
          <div
            v-for="(option, index) in filteredOptions"
            :key="option.value"
            class="filter-dropdown__option"
            role="option"
            :data-highlighted="index === highlightedIndex ? '' : undefined"
            :data-selected="option.value === value ? '' : undefined"
            :aria-selected="option.value === value"
            @click="select(option)"
            @mouseenter="highlightedIndex = index"
          >
            <span>{{ option.label }}</span>
            <span class="filter-dropdown__count">{{ option.count }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
