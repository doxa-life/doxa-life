<script setup lang="ts">
// Admin: list of page categories. Categories are the first-class
// grouping layer above pages — renaming one cascades to every member
// page's URL, so deletion is blocked while pages are still attached.

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

interface CategoryRow {
  id: string
  slug: string
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

function englishName(row: CategoryRow): string {
  return row.translations.find(t => t.locale === 'en')?.name ?? row.slug
}

// Delete flow — blocked server-side if any pages still belong to the
// category, so we surface the 409 message directly.
const deleteModalOpen = ref(false)
const deleteTarget = ref<CategoryRow | null>(null)
const deleting = ref(false)

function askDelete(row: CategoryRow) {
  deleteTarget.value = row
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
          <p class="text-sm text-(--ui-text-muted)">Group pages into sections. Each category's name shows as the sidebar heading on its member pages.</p>
        </div>
      </div>
      <UButton icon="i-lucide-plus" color="primary" to="/admin/pages/categories/new">New category</UButton>
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

    <div v-else class="overflow-x-auto border border-(--ui-border) rounded-lg">
      <table class="w-full text-sm">
        <thead class="bg-(--ui-bg-elevated) text-(--ui-text-muted)">
          <tr>
            <th class="text-left px-3 py-2 font-medium">Name (EN)</th>
            <th class="text-left px-3 py-2 font-medium">Slug</th>
            <th class="text-left px-3 py-2 font-medium">Translations</th>
            <th class="text-left px-3 py-2 font-medium">Pages</th>
            <th class="text-right px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in data.rows"
            :key="row.id"
            class="border-t border-(--ui-border) hover:bg-(--ui-bg-elevated)"
          >
            <td class="px-3 py-2">{{ englishName(row) }}</td>
            <td class="px-3 py-2 font-mono">{{ row.slug }}</td>
            <td class="px-3 py-2">
              <div class="flex flex-wrap gap-1">
                <UBadge
                  v-for="t in row.translations"
                  :key="t.locale"
                  size="xs"
                  variant="subtle"
                  color="neutral"
                >
                  {{ t.locale }}
                </UBadge>
              </div>
            </td>
            <td class="px-3 py-2">
              <UBadge :color="row.page_count > 0 ? 'info' : 'neutral'" variant="subtle">
                {{ row.page_count }}
              </UBadge>
            </td>
            <td class="px-3 py-2 text-right">
              <div class="flex justify-end gap-1">
                <UButton
                  size="xs"
                  variant="outline"
                  icon="i-lucide-pencil"
                  :to="`/admin/pages/categories/${row.id}`"
                >
                  Edit
                </UButton>
                <UButton
                  size="xs"
                  variant="outline"
                  color="error"
                  icon="i-lucide-trash-2"
                  :disabled="row.page_count > 0"
                  :title="row.page_count > 0 ? 'Move or delete member pages first' : 'Delete category'"
                  @click="askDelete(row)"
                >
                  Delete
                </UButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
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
