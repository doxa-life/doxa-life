<script setup lang="ts">
// Admin: list of CMS pages. Minimal table with slug, English title,
// category, publish status (published / total translations), last
// updated, and a button to open each row in the editor.

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

interface PageRow {
  id: string
  slug: string
  category_id: string | null
  category_slug: string | null
  category_name_en: string | null
  menu_order: number
  updated: string
  title_en: string | null
  translation_count: number
  published_count: number
}

interface CategoryRow {
  id: string
  slug: string
  menu_order: number
  translations: Array<{ locale: string; name: string }>
  page_count: number
}

const toast = useToast()
const router = useRouter()

const { data, pending, refresh, error } = await useFetch<{ rows: PageRow[] }>(
  '/api/admin/pages',
  { default: () => ({ rows: [] }) }
)

const { data: categoriesData } = await useFetch<{ rows: CategoryRow[] }>(
  '/api/admin/categories',
  { default: () => ({ rows: [] }) }
)

const categories = computed(() => categoriesData.value?.rows ?? [])

function categoryLabel(cat: CategoryRow): string {
  const en = cat.translations.find(t => t.locale === 'en')?.name
  return en ?? cat.slug
}

// Modal state for creating a new page
const createModalOpen = ref(false)
const newSlugLeaf = ref('')
const newCategoryId = ref<string | null>(null)
const newMenuOrder = ref(0)
const creating = ref(false)

const newCategoryPrefix = computed(() => {
  if (!newCategoryId.value) return ''
  const cat = categories.value.find(c => c.id === newCategoryId.value)
  return cat ? `${cat.slug}/` : ''
})

const newFullSlug = computed(() => {
  const leaf = newSlugLeaf.value.trim().replace(/^\/+|\/+$/g, '')
  return `${newCategoryPrefix.value}${leaf}`
})

const categoryItems = computed(() => [
  { label: '— Uncategorized —', value: null as string | null },
  ...categories.value.map(c => ({ label: categoryLabel(c), value: c.id as string | null }))
])

function resetCreateForm() {
  newSlugLeaf.value = ''
  newCategoryId.value = null
  newMenuOrder.value = 0
}

async function createPage() {
  creating.value = true
  try {
    const slug = newFullSlug.value
    if (!slug) {
      toast.add({ title: 'Slug is required', color: 'error' })
      creating.value = false
      return
    }
    const page = await $fetch<{ id: string }>('/api/admin/pages', {
      method: 'POST',
      body: {
        slug,
        category_id: newCategoryId.value,
        menu_order: newMenuOrder.value || 0
      }
    })
    toast.add({ title: 'Page created', color: 'success' })
    createModalOpen.value = false
    resetCreateForm()
    router.push(`/admin/pages/${page.id}`)
  } catch (e: any) {
    toast.add({
      title: 'Could not create page',
      description: e?.data?.statusMessage || e?.message || 'Unknown error',
      color: 'error'
    })
  } finally {
    creating.value = false
  }
}

function formatDate(s: string) {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString()
}

// 'all' shows everything, 'none' shows uncategorized pages, otherwise
// the value is a category id. Kept as a plain ref — no URL state for
// now since the list is small and the admin reloads infrequently.
const categoryFilter = ref<'all' | 'none' | string>('all')

const filterButtons = computed<Array<{ label: string; value: string; count: number }>>(() => {
  const rows = data.value?.rows ?? []
  const counts = new Map<string, number>()
  let noneCount = 0
  for (const r of rows) {
    if (!r.category_id) noneCount++
    else counts.set(r.category_id, (counts.get(r.category_id) ?? 0) + 1)
  }
  return [
    { label: 'All', value: 'all', count: rows.length },
    { label: 'None', value: 'none', count: noneCount },
    ...categories.value.map(c => ({
      label: categoryLabel(c),
      value: c.id,
      count: counts.get(c.id) ?? 0
    }))
  ]
})

const filteredRows = computed<PageRow[]>(() => {
  const rows = data.value?.rows ?? []
  if (categoryFilter.value === 'all') return rows
  if (categoryFilter.value === 'none') return rows.filter(r => !r.category_id)
  return rows.filter(r => r.category_id === categoryFilter.value)
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">CMS Pages</h1>
        <p class="text-sm text-(--ui-text-muted)">Manage translated content for about, resources, privacy, and other CMS-driven pages.</p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-folder-tree"
          to="/admin/pages/categories"
        >
          Categories
        </UButton>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          @click="createModalOpen = true"
        >
          New page
        </UButton>
      </div>
    </div>

    <UCard v-if="error">
      <p class="text-(--ui-text-muted)">Failed to load pages: {{ error.message }}</p>
      <UButton size="sm" variant="outline" class="mt-2" @click="refresh()">Retry</UButton>
    </UCard>

    <UCard v-else-if="pending && !data?.rows.length">
      <p class="text-(--ui-text-muted)">Loading…</p>
    </UCard>

    <UCard v-else-if="!data?.rows.length">
      <p class="text-(--ui-text-muted)">No CMS pages yet. Click <strong>New page</strong> to create your first one.</p>
    </UCard>

    <template v-else>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="btn in filterButtons"
          :key="btn.value"
          size="sm"
          :color="categoryFilter === btn.value ? 'primary' : 'neutral'"
          :variant="categoryFilter === btn.value ? 'solid' : 'outline'"
          @click="categoryFilter = btn.value"
        >
          {{ btn.label }}
          <span class="ml-1.5 text-xs opacity-70">{{ btn.count }}</span>
        </UButton>
      </div>

      <div class="overflow-x-auto border border-(--ui-border) rounded-lg">
      <table class="w-full text-sm">
        <thead class="bg-(--ui-bg-elevated) text-(--ui-text-muted)">
          <tr>
            <th class="text-left px-3 py-2 font-medium">Title (EN)</th>
            <th class="text-left px-3 py-2 font-medium">Slug</th>
            <th class="text-left px-3 py-2 font-medium">Category</th>
            <th class="text-left px-3 py-2 font-medium">Translations</th>
            <th class="text-left px-3 py-2 font-medium">Updated</th>
            <th class="text-right px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredRows.length === 0">
            <td colspan="6" class="px-3 py-6 text-center text-(--ui-text-muted)">
              No pages match the selected filter.
            </td>
          </tr>
          <tr
            v-for="row in filteredRows"
            :key="row.id"
            class="border-t border-(--ui-border) hover:bg-(--ui-bg-elevated)"
          >
            <td class="px-3 py-2">
              <span v-if="row.title_en">{{ row.title_en }}</span>
              <em v-else class="text-(--ui-text-muted)">Untitled</em>
            </td>
            <td class="px-3 py-2 font-mono">{{ row.slug }}</td>
            <td class="px-3 py-2">
              <span v-if="row.category_slug">{{ row.category_name_en || row.category_slug }}</span>
              <em v-else class="text-(--ui-text-muted)">—</em>
            </td>
            <td class="px-3 py-2">
              <UBadge :color="row.published_count > 0 ? 'success' : 'neutral'" variant="subtle">
                {{ row.published_count }} / {{ row.translation_count }} published
              </UBadge>
            </td>
            <td class="px-3 py-2 text-(--ui-text-muted)">{{ formatDate(row.updated) }}</td>
            <td class="px-3 py-2 text-right">
              <UButton
                size="xs"
                variant="outline"
                icon="i-lucide-pencil"
                :to="`/admin/pages/${row.id}`"
              >
                Edit
              </UButton>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </template>

    <UModal v-model:open="createModalOpen" title="New CMS page">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Category" description="Pick a category or leave as uncategorized for standalone pages.">
            <USelect
              v-model="newCategoryId"
              :items="categoryItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Slug" required :description="newCategoryPrefix ? `Full URL will be /${newFullSlug}` : 'e.g. privacy, contact'">
            <UInput v-model="newSlugLeaf" :placeholder="newCategoryId ? 'vision' : 'privacy'">
              <template v-if="newCategoryPrefix" #leading>
                <span class="text-(--ui-text-muted) font-mono text-sm">{{ newCategoryPrefix }}</span>
              </template>
            </UInput>
          </UFormField>
          <UFormField label="Menu order" description="Sort order within the category sidebar.">
            <UInput v-model.number="newMenuOrder" type="number" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="createModalOpen = false">Cancel</UButton>
          <UButton color="primary" :loading="creating" :disabled="!newSlugLeaf.trim()" @click="createPage">Create</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
