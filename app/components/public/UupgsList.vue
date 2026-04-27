<script setup lang="ts">
// Port of marketing-theme/js/components/src/uupgs-list.ts (Lit → Vue).
// Preserves class names, markup structure, fetch endpoints, search
// algorithm, and filter logic verbatim so the source SCSS
// (blocks/_filters.scss, blocks/_cards.scss) applies unchanged.

import Fuse from 'fuse.js'
import type { Uupg, FilterOption } from '~/types/uupg'

interface Translations {
  search?: string
  exact_filter?: string
  adopted_filter?: string
  engaged_filter?: string
  hide_filters?: string
  show_filters?: string
  type_to_search?: string
  wagf_region?: string
  wagf_block?: string
  country?: string
  rop1?: string
  religion?: string
  clear_all?: string
  total?: string
  see_all?: string
  load_more?: string
  loading?: string
  prayer_coverage?: string
  select?: string
  full_profile?: string
  adopted?: string
  not_adopted?: string
  alternate_name?: string
}

const props = withDefaults(defineProps<{
  t?: Translations
  selectUrl?: string
  researchUrl?: string
  initialSearchTerm?: string
  languageCode?: string
  perPage?: number
  morePerPage?: number
  dontShowListOnLoad?: boolean
  useSelectCard?: boolean
  useHighlightedUUPGs?: boolean
  randomizeList?: boolean
  hideSeeAllLink?: boolean
}>(), {
  t: () => ({}),
  selectUrl: '',
  researchUrl: '/research',
  initialSearchTerm: '',
  languageCode: '',
  perPage: 24,
  morePerPage: 0,
  dontShowListOnLoad: false,
  useSelectCard: false,
  useHighlightedUUPGs: false,
  randomizeList: false,
  hideSeeAllLink: false
})

const config = useRuntimeConfig()
const prayBaseUrl = config.public.prayBaseUrl as string
const imagesUrl = '/assets/images'
const iconsUrl = '/assets/icons'

const uupgs = ref<Uupg[]>([])
const highlightedUUPGs = ref<Uupg[]>([])
const filteredUUPGs = ref<Uupg[]>([])
const total = ref(0)
const page = ref(1)
const searchTerm = ref('')
const loading = ref(true)
const dontShowListOnLoad = ref(props.dontShowListOnLoad)
const activeFilters = ref<Record<string, { value: string; label: string }>>({})
const filtersExpanded = ref(false)
const filterOptions = ref<Record<string, FilterOption[]>>({})

function debounce<T extends (...args: any[]) => void>(fn: T, ms = 500): T {
  let timeout: any
  return ((...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), ms)
  }) as T
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function hasMore() {
  if (props.morePerPage > 0) {
    return total.value > props.perPage + (page.value - 1) * props.morePerPage
      && !loading.value && filteredUUPGs.value.length > 0
  }
  return total.value > page.value * props.perPage
    && !loading.value && filteredUUPGs.value.length > 0
}

function loadMore() {
  page.value = page.value + 1
}

function getUUPGsToDisplay(): Uupg[] {
  if (props.morePerPage > 0) {
    return filteredUUPGs.value.slice(0, props.perPage + (page.value - 1) * props.morePerPage)
  }
  return filteredUUPGs.value.slice(0, page.value * props.perPage)
}

const onSearch = debounce((event: Event) => {
  searchTerm.value = (event.target as HTMLInputElement).value
  loading.value = true
  page.value = 1
  total.value = 0
  filteredUUPGs.value = []
  filterUUPGs()
}, 500)

function toggleFilters() {
  filtersExpanded.value = !filtersExpanded.value
}

function onFilterChange(detail: { name: string; value: string; label: string }) {
  activeFilters.value = { ...activeFilters.value, [detail.name]: { value: detail.value, label: detail.label } }
  page.value = 1
  filterUUPGs()
}

function onFilterClear(detail: { name: string }) {
  removeFilter(detail.name)
}

function removeFilter(name: string) {
  const copy = { ...activeFilters.value }
  delete copy[name]
  activeFilters.value = copy
  page.value = 1
  filterUUPGs()
}

function clearAllFilters() {
  activeFilters.value = {}
  page.value = 1
  filterUUPGs()
}

function toggleAdopted() {
  if (activeFilters.value.adopted) return removeFilter('adopted')
  activeFilters.value = { ...activeFilters.value, adopted: { value: 'yes', label: props.t.adopted_filter || 'Adopted' } }
  page.value = 1
  filterUUPGs()
}

function toggleEngaged() {
  if (activeFilters.value.engaged) return removeFilter('engaged')
  activeFilters.value = { ...activeFilters.value, engaged: { value: 'yes', label: props.t.engaged_filter || 'Engaged' } }
  page.value = 1
  filterUUPGs()
}

function toggleExact() {
  if (activeFilters.value.exact) return removeFilter('exact')
  activeFilters.value = { ...activeFilters.value, exact: { value: 'yes', label: props.t.exact_filter || 'Exact' } }
  page.value = 1
  filterUUPGs()
}

function applyDropdownFilters(list: Uupg[]): Uupg[] {
  let filtered = list
  for (const [field, selection] of Object.entries(activeFilters.value)) {
    if (field === 'adopted') {
      filtered = filtered.filter(u => (u.adopted_by_churches ?? 0) > 0)
    } else if (field === 'engaged') {
      filtered = filtered.filter(u => (u.people_praying ?? 0) > 0)
    } else if (field === 'exact') {
      filtered = filtered
    } else {
      filtered = filtered.filter((u) => {
        const vl = (u as unknown as Record<string, { value: string }>)[field]
        return vl?.value === selection.value
      })
    }
  }
  return filtered
}

function extractFilterOptions() {
  const extract = (field: string): FilterOption[] => {
    const counts = new Map<string, { label: string; count: number }>()
    for (const u of uupgs.value) {
      const vl = (u as unknown as Record<string, { value: string; label: string }>)[field]
      if (!vl?.value) continue
      const existing = counts.get(vl.value)
      if (existing) existing.count++
      else counts.set(vl.value, { label: vl.label, count: 1 })
    }
    return Array.from(counts.entries())
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }
  filterOptions.value = {
    country_code: extract('country_code'),
    rop1: extract('rop1'),
    wagf_region: extract('wagf_region'),
    wagf_block: extract('wagf_block'),
    religion: extract('religion')
  }
}

function updateFilterOptionCounts() {
  const fields = Object.keys(filterOptions.value)
  const next: Record<string, FilterOption[]> = {}

  for (const field of fields) {
    const filtersWithout: Record<string, { value: string; label: string }> = {}
    for (const [key, val] of Object.entries(activeFilters.value)) {
      if (key !== field) filtersWithout[key] = val
    }
    const saved = activeFilters.value
    activeFilters.value = filtersWithout
    const subset = Object.keys(filtersWithout).length > 0
      ? applyDropdownFilters(uupgs.value)
      : uupgs.value
    activeFilters.value = saved

    const counts = new Map<string, number>()
    for (const u of subset) {
      const vl = (u as unknown as Record<string, { value: string }>)[field]
      if (!vl?.value) continue
      counts.set(vl.value, (counts.get(vl.value) ?? 0) + 1)
    }

    next[field] = (filterOptions.value[field] ?? []).map(opt => ({
      ...opt,
      count: counts.get(opt.value) ?? 0
    }))
  }

  filterOptions.value = next
}

function filterUUPGs() {
  // Reset per-item highlighting state
  uupgs.value = uupgs.value.map((u) => {
    u.matches = []
    u.country_label = ''
    u.rop1_label = ''
    u.wagf_region_label = ''
    return u
  })

  const hasActive = Object.keys(activeFilters.value).length > 0
  const preFiltered = hasActive ? applyDropdownFilters(uupgs.value) : uupgs.value

  if (hasActive) dontShowListOnLoad.value = false

  if (searchTerm.value === '') {
    filteredUUPGs.value = preFiltered
    total.value = filteredUUPGs.value.length
    loading.value = false
    updateFilterOptionCounts()
    return
  }

  dontShowListOnLoad.value = false
  const fuse = new Fuse(preFiltered, {
    useExtendedSearch: true,
    includeScore: true,
    includeMatches: true,
    ignoreLocation: true,
    minMatchCharLength: 3,
    threshold: activeFilters.value.exact ? 0 : 0.4,
    keys: [
      'name',
      'imb_alternate_name',
      'country_code.label',
      'rop1.label',
      'religion.label',
      'wagf_region.label',
      'wagf_block.label'
    ]
  })

  const result = fuse.search(searchTerm.value)
  filteredUUPGs.value = result.map((res) => {
    const newItem: Uupg = { ...res.item }
    if (!res.matches) return newItem

    newItem.matches = []
    for (const match of res.matches) {
      const matchKey = match.key
      if (!matchKey) continue
      const key = matchKey as keyof Uupg
      let value: any = ''
      if (String(key).includes('.')) {
        const [parentKey, childKey] = String(key).split('.') as [string, string]
        value = (newItem as unknown as Record<string, Record<string, string>>)[parentKey]?.[childKey]
      } else {
        value = (newItem as unknown as Record<string, string>)[String(key)]
      }
      if (value && typeof value === 'string') {
        let currentIndex = 0
        let highlightedValue = ''
        match.indices.forEach((idx, i) => {
          const start = idx[0]
          const end = idx[1]
          const isLast = match.indices.length - 1 === i
          highlightedValue
            += escapeHtml(value.slice(currentIndex, start))
            + `<span class="search-highlight">${escapeHtml(value.slice(start, end + 1))}</span>`
            + (isLast ? escapeHtml(value.slice(end + 1)) : '')
          currentIndex = end + 1
        })

        if (String(key).includes('imb_alternate_name')) {
          newItem.matches!.push({ key: props.t.alternate_name ?? 'Also known as', label: highlightedValue })
        } else if (String(key).includes('.')) {
          const [parentKey] = String(key).split('.') as [string]
          const keyTranslations: Record<string, string | undefined> = {
            religion: props.t.religion,
            country_code: props.t.country,
            rop1: props.t.rop1,
            wagf_region: props.t.wagf_region,
            wagf_block: props.t.wagf_block
          }
          if (parentKey === 'wagf_region' && props.useSelectCard) {
            newItem.wagf_region_label = highlightedValue
          } else if (parentKey === 'rop1' && !props.useSelectCard) {
            newItem.rop1_label = highlightedValue
          } else if (parentKey === 'country_code' && !props.useSelectCard) {
            newItem.country_label = highlightedValue
          } else if (parentKey === 'wagf_region' && !props.useSelectCard) {
            // do nothing
          } else {
            newItem.matches!.push({
              key: keyTranslations[parentKey] ?? parentKey,
              label: highlightedValue
            })
          }
        } else {
          (newItem as unknown as Record<string, unknown>)[String(key)] = highlightedValue
        }
      }
    }

    return newItem
  })

  total.value = filteredUUPGs.value.length
  loading.value = false
}

async function getUUPGs() {
  const url = `${prayBaseUrl}/api/people-groups/list?fields=name,slug,wagf_region,wagf_block,country_code,rop1,religion,has_photo,image_url,adopted_by_churches,imb_alternate_name,engagement_status,people_committed&lang=${props.languageCode}`
  loading.value = true
  try {
    const response = await fetch(url)
    const data = await response.json()
    total.value = data.total
    uupgs.value = data.posts
    extractFilterOptions()
    if (props.randomizeList) {
      uupgs.value = uupgs.value.sort(() => Math.random() - 0.5)
    }
    if (props.useHighlightedUUPGs) {
      filteredUUPGs.value = [...filteredUUPGs.value, ...data.posts]
    }
    if (!dontShowListOnLoad.value && !props.useHighlightedUUPGs) {
      filterUUPGs()
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    loading.value = false
  }
}

async function getHighlightedUUPGs() {
  const url = `${prayBaseUrl}/api/people-groups/highlighted?lang=${props.languageCode}`
  try {
    const response = await fetch(url)
    const data = await response.json()
    highlightedUUPGs.value = data.posts
    total.value = data.total
    filteredUUPGs.value = highlightedUUPGs.value
  } catch (error) {
    console.error('Error:', error)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (props.initialSearchTerm) {
    searchTerm.value = decodeURI(props.initialSearchTerm)
  }
  if (props.useHighlightedUUPGs) {
    await getHighlightedUUPGs()
    await getUUPGs()
  } else {
    await getUUPGs()
  }
})

const displayedUUPGs = computed(() => getUUPGsToDisplay())
const showMore = computed(() => hasMore())
</script>

<template>
  <div
    class="stack stack--md bg-image"
    :style="`background-image: url(${imagesUrl}/worldmap.svg); background-size: 60%; background-position: top; min-height: 400px;`"
  >
    <div id="filters" class="filters">
      <div class="search-box | center | max-width-md">
        <span class="sr-only">{{ t.search }}</span>
        <svg class="search-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <use :href="`${iconsUrl}/search.svg#search`" />
        </svg>
        <div class="repel">
          <input
            type="search"
            :placeholder="initialSearchTerm ? initialSearchTerm : t.search"
            @input="onSearch"
          >
          <button
            v-if="useSelectCard"
            class="mx-auto color-brand surface-primary filter-toggle input fit-content"
            type="button"
            :data-active="activeFilters.exact ? '' : undefined"
            @click="toggleExact"
          >
            {{ t.exact_filter || 'Exact' }}
          </button>
        </div>
      </div>

      <button
        v-if="!useSelectCard"
        class="filters__toggle | button compact link"
        type="button"
        :aria-expanded="filtersExpanded"
        @click="toggleFilters"
      >
        {{ filtersExpanded ? (t.hide_filters || 'Hide Filters') : (t.show_filters || 'Show Filters') }}
        <svg width="12" height="12" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <template v-if="filtersExpanded">
        <div class="filters__panel">
          <FilterDropdown
            :label="t.wagf_region || 'WAGF Region'"
            name="wagf_region"
            :options="filterOptions.wagf_region || []"
            :value="activeFilters.wagf_region?.value ?? ''"
            :placeholder="t.type_to_search || 'Type to search...'"
            @filter-change="onFilterChange"
            @filter-clear="onFilterClear"
          />
          <FilterDropdown
            :label="t.wagf_block || 'WAGF Block'"
            name="wagf_block"
            :options="filterOptions.wagf_block || []"
            :value="activeFilters.wagf_block?.value ?? ''"
            :placeholder="t.type_to_search || 'Type to search...'"
            @filter-change="onFilterChange"
            @filter-clear="onFilterClear"
          />
          <FilterDropdown
            :label="t.country || 'Country'"
            name="country_code"
            :options="filterOptions.country_code || []"
            :value="activeFilters.country_code?.value ?? ''"
            :placeholder="t.type_to_search || 'Type to search...'"
            @filter-change="onFilterChange"
            @filter-clear="onFilterClear"
          />
          <FilterDropdown
            :label="t.rop1 || 'People Group'"
            name="rop1"
            :options="filterOptions.rop1 || []"
            :value="activeFilters.rop1?.value ?? ''"
            :placeholder="t.type_to_search || 'Type to search...'"
            @filter-change="onFilterChange"
            @filter-clear="onFilterClear"
          />
          <FilterDropdown
            :label="t.religion || 'Religion'"
            name="religion"
            :options="filterOptions.religion || []"
            :value="activeFilters.religion?.value ?? ''"
            :placeholder="t.type_to_search || 'Type to search...'"
            @filter-change="onFilterChange"
            @filter-clear="onFilterClear"
          />
        </div>
        <div class="filters__panel">
          <button
            class="filter-toggle input fit-content"
            type="button"
            :data-active="activeFilters.adopted ? '' : undefined"
            @click="toggleAdopted"
          >{{ t.adopted_filter || 'Adopted' }}</button>
          <button
            class="filter-toggle input fit-content"
            type="button"
            :data-active="activeFilters.engaged ? '' : undefined"
            @click="toggleEngaged"
          >{{ t.engaged_filter || 'Engaged' }}</button>
          <button
            class="filter-toggle input fit-content"
            type="button"
            :data-active="activeFilters.exact ? '' : undefined"
            @click="toggleExact"
          >{{ t.exact_filter || 'Exact' }}</button>
        </div>
      </template>

      <div v-if="!useSelectCard && Object.keys(activeFilters).length > 0" class="filters__active">
        <span v-for="(filter, name) in activeFilters" :key="name" class="filter-chip">
          {{ filter.label }}
          <button class="filter-chip__remove" type="button" @click="removeFilter(String(name))">&times;</button>
        </span>
        <button class="filters__clear-all | button compact link" type="button" @click="clearAllFilters">
          {{ t.clear_all || 'Clear All' }}
        </button>
      </div>
    </div>

    <div class="stack stack--xs">
      <div class="repel">
        <div class="font-size-sm">
          <template v-if="!dontShowListOnLoad && !loading">
            {{ t.total }}: {{ total }}
          </template>
          <span v-else class="invisible-placeholder">Placeholder</span>
        </div>
        <a
          v-if="!hideSeeAllLink && !dontShowListOnLoad && showMore"
          class="light-link"
          :href="`${researchUrl}search/${searchTerm}`"
        >{{ t.see_all }}</a>
      </div>

      <div
        id="results"
        class="grid | uupgs-list"
        :class="{ 'gap-md': useSelectCard }"
        :data-width-lg="!useSelectCard ? '' : undefined"
        :data-width-md="useSelectCard ? '' : undefined"
      >
        <template v-for="uupg in displayedUUPGs" :key="uupg.slug">
          <!-- useSelectCard variant -->
          <div v-if="useSelectCard" class="stack stack--sm | card | highlighted-uupg__card">
            <div class="repel align-start">
              <img :src="uupg.image_url" :alt="uupg.name">
              <p class="color-brand-lighter uppercase text-end overflow-wrap-anywhere" v-html="uupg.wagf_region_label ? uupg.wagf_region_label : uupg.wagf_region.label" />
            </div>
            <div>
              <p class="line-height-tight" v-html="uupg.name" />
              <template v-if="uupg.matches">
                <p v-for="(match, mi) in uupg.matches" :key="mi" class="font-size-sm color-brand-lighter">
                  <strong>{{ match.key }}</strong>: <span v-html="match.label" />
                </p>
              </template>
            </div>
            <div class="repel">
              <p class="font-size-sm color-brand-lighter">{{ t.prayer_coverage }}:</p>
              <p class="font-size-xl font-button">{{ uupg.people_committed ?? 0 }}/144</p>
            </div>
            <div class="switcher | text-center" data-width="md">
              <a class="highlighted-uupg__prayer-coverage-button button compact" :href="`${selectUrl}${uupg.slug}?source=doxalife`">{{ t.select }}</a>
              <a class="highlighted-uupg__more-button button compact link" :href="`${researchUrl}${uupg.slug}`">{{ t.full_profile }}</a>
            </div>
          </div>

          <!-- full card variant -->
          <div v-else class="card | uupg__card">
            <img class="uupg__image" :src="uupg.image_url" :alt="uupg.name">
            <div class="uupg__header">
              <h3 class="uupg__name line-height-tight" v-html="uupg.name" />
              <p class="uupg__country">
                <span v-html="uupg.country_label ? uupg.country_label : uupg.country_code.label" /> (<span v-html="uupg.rop1_label ? uupg.rop1_label : uupg.rop1.label" />)
              </p>
              <template v-if="uupg.matches">
                <p v-for="(match, mi) in uupg.matches" :key="mi" class="font-size-sm color-brand-lighter">
                  <strong>{{ match.key }}</strong>: <span v-html="match.label" />
                </p>
              </template>
            </div>
            <div class="uupg_adopted">
              <div>
                <img
                  :src="(uupg.adopted_by_churches && uupg.adopted_by_churches > 0) ? `${iconsUrl}/Check-GreenCircle.png` : `${iconsUrl}/RedX-Circle.png`"
                  :alt="(uupg.adopted_by_churches && uupg.adopted_by_churches > 0) ? (t.adopted || '') : (t.not_adopted || '')"
                >
                <span>{{ (uupg.adopted_by_churches && uupg.adopted_by_churches > 0) ? t.adopted : t.not_adopted }}</span>
              </div>
            </div>
            <p v-if="uupg.location_description" class="uupg__content">{{ uupg.location_description }}</p>
            <a class="uupg__more-button button compact" :href="`${researchUrl}${uupg.slug}`">{{ t.full_profile }}</a>
          </div>
        </template>

        <div v-if="!dontShowListOnLoad && loading" class="loading">{{ t.loading }}</div>
      </div>

      <button
        v-if="showMore"
        class="center | button compact stack-spacing-2xl"
        @click="loadMore"
      >{{ t.load_more }}</button>
    </div>
  </div>
</template>
