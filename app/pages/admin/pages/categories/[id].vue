<script setup lang="ts">
// Admin: category editor. Two concerns on one screen:
//   1) Slug + per-locale name edits (renaming the slug cascades to
//      every member page's URL — warn loudly).
//   2) Drag-and-drop reorder of the category's pages via vuedraggable
//      (Sortable.js). Uses a dedicated grip handle so clicks on the
//      "Edit" button/link don't get hijacked into a drag.

import { ENABLED_LANGUAGES } from '~~/config/languages'
import draggable from 'vuedraggable'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

interface CategoryPage {
  id: string
  slug: string
  url: string
  menu_order: number
  title_en: string | null
  published_count: number
  translation_count: number
}

interface ChildCategory {
  id: string
  slug: string
  url: string
  menu_order: number
}

interface CategoryDetail {
  category: {
    id: string
    slug: string
    parent_id: string | null
    menu_order: number
    created: string
    updated: string
  }
  url: string
  parent_path: string | null
  parent_label: string | null
  translations: Array<{ locale: string; name: string; updated: string }>
  pages: CategoryPage[]
  child_categories: ChildCategory[]
}

interface CategoryRow {
  id: string
  slug: string
  url: string
  parent_id: string | null
  parent_path: string | null
  parent_label: string | null
  translations: Array<{ locale: string; name: string }>
}

const route = useRoute()
const router = useRouter()
const toast = useToast()
const categoryId = computed(() => String(route.params.id))

const { data, pending, refresh } = await useFetch<CategoryDetail>(
  () => `/api/admin/categories/${categoryId.value}`
)

const slug = ref('')
const originalSlug = ref('')
const parentId = ref<string | null>(null)
const originalParentId = ref<string | null>(null)
const names = reactive<Record<string, string>>({})
for (const l of ENABLED_LANGUAGES) names[l.code] = ''

const pageOrder = ref<CategoryPage[]>([])
const originalPageOrderKey = ref('')

// Hydrate local form state from server data. Intentionally a
// data-only watch (not watchEffect) so writing back to pageOrder from
// vuedraggable doesn't retrigger this effect and snap the order back.
watch(data, (value) => {
  if (!value) return
  slug.value = value.category.slug
  originalSlug.value = value.category.slug
  parentId.value = value.category.parent_id
  originalParentId.value = value.category.parent_id
  for (const l of ENABLED_LANGUAGES) {
    const t = value.translations.find(x => x.locale === l.code)
    names[l.code] = t?.name ?? ''
  }
  pageOrder.value = [...value.pages]
  originalPageOrderKey.value = value.pages.map(p => p.id).join(',')
}, { immediate: true })

const activeLocale = ref<string>('en')
const saving = ref(false)
const savingOrder = ref(false)

const { data: allCategoriesData } = await useFetch<{ rows: CategoryRow[] }>(
  '/api/admin/categories',
  { default: () => ({ rows: [] }) }
)

function categoryLabel(cat: CategoryRow): string {
  const en = cat.translations.find(t => t.locale === 'en')?.name ?? cat.slug
  return cat.parent_label ? `${cat.parent_label} / ${en}` : en
}

// Block self/descendants from the parent picker so the user can't
// accidentally request a cycle (the server would reject anyway, but
// not surfacing the option avoids a confusing failure).
const descendantIds = computed(() => {
  const all = allCategoriesData.value?.rows ?? []
  const childrenByParent = new Map<string | null, CategoryRow[]>()
  for (const c of all) {
    const key = c.parent_id ?? null
    const list = childrenByParent.get(key) ?? []
    list.push(c)
    childrenByParent.set(key, list)
  }
  const out = new Set<string>([categoryId.value])
  const stack = [categoryId.value]
  while (stack.length) {
    const id = stack.pop()!
    for (const c of childrenByParent.get(id) ?? []) {
      out.add(c.id)
      stack.push(c.id)
    }
  }
  return out
})

const parentItems = computed(() => [
  { label: '— Top level —', value: null as string | null },
  ...[...(allCategoriesData.value?.rows ?? [])]
    .filter(c => !descendantIds.value.has(c.id))
    .sort((a, b) => a.url.localeCompare(b.url))
    .map(c => ({ label: categoryLabel(c), value: c.id as string | null }))
])

const slugWillRename = computed(() => slug.value.trim() !== originalSlug.value)
const parentWillChange = computed(() => parentId.value !== originalParentId.value)
const willChangeUrls = computed(() => slugWillRename.value || parentWillChange.value)

async function saveDetails() {
  const slugValue = slug.value.trim().replace(/^\/+|\/+$/g, '')
  if (!slugValue) {
    toast.add({ title: 'Slug is required', color: 'error' })
    return
  }
  if (!names.en?.trim()) {
    toast.add({ title: 'English name is required', color: 'error' })
    activeLocale.value = 'en'
    return
  }
  saving.value = true
  try {
    const translations = ENABLED_LANGUAGES.map(l => ({
      locale: l.code,
      name: (names[l.code] ?? '').trim()
    }))
    await $fetch(`/api/admin/categories/${categoryId.value}`, {
      method: 'PATCH',
      body: { slug: slugValue, parent_id: parentId.value, translations }
    })
    toast.add({ title: 'Category saved', color: 'success' })
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Save failed',
      description: e?.data?.statusMessage || e?.message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

// Autosave after every drop. Skip a noop drop (position didn't
// change) so we don't spam PATCHes for non-moves. Server is the
// source of truth — on failure we refetch so the UI rolls back to the
// persisted order instead of staying out of sync.
async function onReorderEnd() {
  const nextKey = pageOrder.value.map(p => p.id).join(',')
  if (nextKey === originalPageOrderKey.value) return

  savingOrder.value = true
  try {
    await $fetch(`/api/admin/categories/${categoryId.value}/page-order`, {
      method: 'PATCH',
      body: { pageIds: pageOrder.value.map(p => p.id) }
    })
    originalPageOrderKey.value = nextKey
    toast.add({ title: 'Order saved', color: 'success' })
  } catch (e: any) {
    toast.add({
      title: 'Save failed',
      description: e?.data?.statusMessage || e?.message,
      color: 'error'
    })
    await refresh()
  } finally {
    savingOrder.value = false
  }
}

// Deletion confirm
const deleteModalOpen = ref(false)
const deleting = ref(false)

async function deleteCategory() {
  deleting.value = true
  try {
    await $fetch(`/api/admin/categories/${categoryId.value}`, { method: 'DELETE' })
    toast.add({ title: 'Category deleted', color: 'success' })
    router.push('/admin/pages/categories')
  } catch (e: any) {
    toast.add({
      title: 'Delete failed',
      description: e?.data?.statusMessage || e?.message,
      color: 'error'
    })
    deleteModalOpen.value = false
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-4xl">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" to="/admin/pages/categories">Back</UButton>
        <h1 class="text-xl font-semibold">Edit category</h1>
      </div>
      <UButton
        variant="outline"
        color="error"
        icon="i-lucide-trash-2"
        :disabled="(data?.pages.length ?? 0) > 0 || (data?.child_categories.length ?? 0) > 0"
        :title="(data?.pages.length ?? 0) > 0
          ? 'Move or delete member pages first'
          : ((data?.child_categories.length ?? 0) > 0 ? 'Move or delete child categories first' : 'Delete category')"
        @click="deleteModalOpen = true"
      >
        Delete
      </UButton>
    </div>

    <UCard v-if="pending && !data">
      <p class="text-(--ui-text-muted)">Loading…</p>
    </UCard>

    <template v-else-if="data">
      <UCard>
        <template #header>
          <span class="text-sm font-semibold">Details</span>
        </template>

        <div class="space-y-4">
          <UFormField
            label="Parent category"
            :description="parentWillChange ? 'Moving this category to a different parent will change every URL beneath it. Old URLs will 404.' : 'Leave as Top level for a root category.'"
          >
            <USelect
              v-model="parentId"
              :items="parentItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Slug"
            :description="willChangeUrls ? 'Saving will rewrite every URL beneath this category. Old URLs will 404.' : `Current URL: /${data.url}`"
          >
            <UInput v-model="slug" />
          </UFormField>

          <div>
            <div class="text-sm font-semibold mb-2">Names</div>
            <div class="flex flex-wrap gap-1 p-2 border border-(--ui-border) rounded-t-lg bg-(--ui-bg-elevated)">
              <UButton
                v-for="l in ENABLED_LANGUAGES"
                :key="l.code"
                :color="activeLocale === l.code ? 'primary' : 'neutral'"
                :variant="activeLocale === l.code ? 'solid' : 'ghost'"
                size="sm"
                @click="activeLocale = l.code"
              >
                <span class="mr-1">{{ l.flag }}</span>
                {{ l.nativeName }}
                <span v-if="names[l.code]?.trim()" class="ml-2 text-(--ui-primary-contrast)">•</span>
              </UButton>
            </div>
            <div class="p-4 border border-t-0 border-(--ui-border) rounded-b-lg">
              <UFormField
                v-for="l in ENABLED_LANGUAGES"
                v-show="activeLocale === l.code"
                :key="l.code"
                :label="`${l.flag} ${l.nativeName}`"
                :required="l.code === 'en'"
              >
                <UInput v-model="names[l.code]" />
              </UFormField>
            </div>
          </div>

          <div class="flex justify-end pt-2">
            <UButton color="primary" :loading="saving" @click="saveDetails">Save details</UButton>
          </div>
        </div>
      </UCard>

      <UCard v-if="data.child_categories?.length">
        <template #header>
          <span class="text-sm font-semibold">Child categories ({{ data.child_categories.length }})</span>
        </template>
        <ul class="divide-y divide-(--ui-border)">
          <li
            v-for="child in data.child_categories"
            :key="child.id"
            class="flex items-center gap-3 py-2 px-2"
          >
            <div class="flex-1 min-w-0">
              <div class="text-sm truncate">{{ child.slug }}</div>
              <div class="text-xs text-(--ui-text-muted) font-mono truncate">/{{ child.url }}</div>
            </div>
            <UButton
              size="xs"
              variant="outline"
              icon="i-lucide-pencil"
              :to="`/admin/pages/categories/${child.id}`"
            >
              Edit
            </UButton>
          </li>
        </ul>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold">Pages ({{ data.pages.length }})</span>
            <span
              v-if="savingOrder"
              class="text-xs text-(--ui-text-muted) inline-flex items-center gap-1"
            >
              <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" />
              Saving order…
            </span>
          </div>
        </template>

        <p v-if="data.pages.length === 0" class="text-(--ui-text-muted) text-sm">
          No pages in this category yet. Use the page editor to assign pages to it.
        </p>

        <draggable
          v-else
          v-model="pageOrder"
          tag="ul"
          item-key="id"
          handle=".drag-handle"
          animation="150"
          ghost-class="opacity-40"
          class="divide-y divide-(--ui-border)"
          @end="onReorderEnd"
        >
          <template #item="{ element: page, index: idx }">
            <li class="flex items-center gap-3 py-2 px-2">
              <button
                type="button"
                class="drag-handle cursor-grab active:cursor-grabbing text-(--ui-text-muted) hover:text-(--ui-text) p-1 -m-1"
                aria-label="Drag to reorder"
              >
                <UIcon name="i-lucide-grip-vertical" class="size-4" />
              </button>
              <div class="flex-1 min-w-0">
                <div class="text-sm truncate">
                  {{ page.title_en || 'Untitled' }}
                  <UBadge v-if="idx === 0" size="xs" variant="subtle" color="info" class="ml-2">
                    Default for /{{ data.url }}
                  </UBadge>
                </div>
                <div class="text-xs text-(--ui-text-muted) font-mono truncate">/{{ page.url }}</div>
              </div>
              <UBadge
                size="xs"
                variant="subtle"
                :color="page.published_count > 0 ? 'success' : 'neutral'"
              >
                {{ page.published_count }}/{{ page.translation_count }}
              </UBadge>
              <UButton
                size="xs"
                variant="outline"
                icon="i-lucide-pencil"
                :to="`/admin/pages/${page.id}`"
              >
                Edit
              </UButton>
            </li>
          </template>
        </draggable>
      </UCard>
    </template>

    <UModal v-model:open="deleteModalOpen" title="Delete category?">
      <template #body>
        <p v-if="data">
          Permanently delete category <strong>{{ data.category.slug }}</strong>?
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="deleteModalOpen = false">Cancel</UButton>
          <UButton color="error" :loading="deleting" @click="deleteCategory">Delete</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
