<script setup lang="ts">
// Admin: list of page categories. Categories are the first-class
// grouping layer above pages — renaming one cascades to every member
// page's URL, so deletion is blocked while pages are still attached.
// Categories form a tree (parent_id) and can be reordered within their
// sibling group via drag and drop (see CategoryTree).

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

// Mirrors the prop shape CategoryTree expects (structural).
interface CategoryNode {
  id: string
  slug: string
  url: string
  parent_id: string | null
  translations: Array<{ locale: string; name: string }>
  page_count: number
  children: CategoryNode[]
}

interface CategoryRow {
  id: string
  slug: string
  url: string
  parent_id: string | null
  parent_path: string | null
  parent_label: string | null
  menu_order: number
  translations: Array<{ locale: string; name: string; updated: string }>
  page_count: number
  created: string
  updated: string
}

const toast = useToast()

const { data, pending, error, refresh } = await useFetch<{ rows: CategoryRow[] }>(
  '/api/admin/categories',
  { default: () => ({ rows: [] }) }
)

function englishName(node: { slug: string; translations: Array<{ locale: string; name: string }> }): string {
  return node.translations.find(t => t.locale === 'en')?.name ?? node.slug
}

// Nest the flat category rows into a tree (siblings sorted by
// menu_order then slug) so each level renders as its own draggable
// list. Kept as a writable ref — not a computed — because vuedraggable
// splices the sibling arrays in place on drop; rebuilding from a fresh
// refresh() is what rolls the UI back if a save fails.
const tree = ref<CategoryNode[]>([])

function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const byParent = new Map<string | null, CategoryRow[]>()
  for (const row of rows) {
    const key = row.parent_id ?? null
    const list = byParent.get(key) ?? []
    list.push(row)
    byParent.set(key, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) =>
      a.menu_order - b.menu_order || a.slug.localeCompare(b.slug)
    )
  }
  const build = (parentId: string | null): CategoryNode[] =>
    (byParent.get(parentId) ?? []).map(row => ({
      id: row.id,
      slug: row.slug,
      url: row.url,
      parent_id: row.parent_id,
      translations: row.translations,
      page_count: row.page_count,
      children: build(row.id)
    }))
  return build(null)
}

watch(data, (value) => {
  tree.value = buildTree(value?.rows ?? [])
}, { immediate: true })

// Autosave after every drop. The dropped sibling array is already
// reordered in place; persist the new order for that parent. Server is
// the source of truth — on failure we refetch so the UI rolls back to
// the persisted order instead of staying out of sync.
const savingOrder = ref(false)

async function onReorder(parentId: string | null, ids: string[]) {
  savingOrder.value = true
  try {
    await $fetch('/api/admin/category-order', {
      method: 'PATCH',
      body: { parentId, categoryIds: ids }
    })
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

// Delete flow — blocked server-side if any pages still belong to the
// category, so we surface the 409 message directly.
const deleteModalOpen = ref(false)
const deleteTarget = ref<CategoryNode | null>(null)
const deleting = ref(false)

function askDelete(node: CategoryNode) {
  deleteTarget.value = node
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/categories/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Category deleted', color: 'success' })
    deleteModalOpen.value = false
    deleteTarget.value = null
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Could not delete',
      description: e?.data?.statusMessage || e?.message,
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" to="/admin/pages">Back to pages</UButton>
        <div>
          <h1 class="text-2xl font-semibold">Categories</h1>
          <p class="text-sm text-(--ui-text-muted)">Group pages into sections. Each category's name shows as the sidebar heading on its member pages. Drag the handle to reorder categories within their group.</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span
          v-if="savingOrder"
          class="text-xs text-(--ui-text-muted) inline-flex items-center gap-1"
        >
          <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" />
          Saving order…
        </span>
        <UButton icon="i-lucide-plus" color="primary" to="/admin/pages/categories/new">New category</UButton>
      </div>
    </div>

    <UCard v-if="error">
      <p class="text-(--ui-text-muted)">Failed to load categories: {{ error.message }}</p>
      <UButton size="sm" variant="outline" class="mt-2" @click="refresh()">Retry</UButton>
    </UCard>

    <UCard v-else-if="pending && !data?.rows.length">
      <p class="text-(--ui-text-muted)">Loading…</p>
    </UCard>

    <UCard v-else-if="!data?.rows.length">
      <p class="text-(--ui-text-muted)">No categories yet. Click <strong>New category</strong> to create one.</p>
    </UCard>

    <div v-else class="border border-(--ui-border) rounded-lg">
      <CategoryTree
        :items="tree"
        :parent-id="null"
        :depth="0"
        @reorder="onReorder"
        @delete="askDelete"
      />
    </div>

    <UModal v-model:open="deleteModalOpen" title="Delete category?">
      <template #body>
        <p v-if="deleteTarget">
          Permanently delete category <strong>{{ englishName(deleteTarget) }}</strong>? This is only allowed when no pages are attached.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="deleteModalOpen = false">Cancel</UButton>
          <UButton color="error" :loading="deleting" @click="confirmDelete">Delete</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
