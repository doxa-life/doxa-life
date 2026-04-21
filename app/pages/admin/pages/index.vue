<script setup lang="ts">
// Admin: list of CMS pages. Minimal table with slug, English title,
// parent, publish status (published / total translations), last
// updated, and a button to open each row in the editor.

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

interface PageRow {
  id: string
  slug: string
  parent_slug: string | null
  menu_order: number
  updated: string
  title_en: string | null
  translation_count: number
  published_count: number
}

const toast = useToast()
const router = useRouter()

const { data, pending, refresh, error } = await useFetch<{ rows: PageRow[] }>(
  '/api/admin/pages',
  { default: () => ({ rows: [] }) }
)

// Modal state for creating a new page
const createModalOpen = ref(false)
const newSlug = ref('')
const newParentSlug = ref('')
const newMenuOrder = ref(0)
const creating = ref(false)

async function createPage() {
  creating.value = true
  try {
    const page = await $fetch<{ id: string }>('/api/admin/pages', {
      method: 'POST',
      body: {
        slug: newSlug.value.trim(),
        parent_slug: newParentSlug.value.trim() || null,
        menu_order: newMenuOrder.value || 0
      }
    })
    toast.add({ title: 'Page created', color: 'success' })
    createModalOpen.value = false
    newSlug.value = ''
    newParentSlug.value = ''
    newMenuOrder.value = 0
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
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">CMS Pages</h1>
        <p class="text-sm text-(--ui-text-muted)">Manage translated content for about, resources, privacy, and other CMS-driven pages.</p>
      </div>
      <UButton
        icon="i-lucide-plus"
        color="primary"
        @click="createModalOpen = true"
      >
        New page
      </UButton>
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

    <div v-else class="overflow-x-auto border border-(--ui-border) rounded-lg">
      <table class="w-full text-sm">
        <thead class="bg-(--ui-bg-elevated) text-(--ui-text-muted)">
          <tr>
            <th class="text-left px-3 py-2 font-medium">Title (EN)</th>
            <th class="text-left px-3 py-2 font-medium">Slug</th>
            <th class="text-left px-3 py-2 font-medium">Parent</th>
            <th class="text-left px-3 py-2 font-medium">Translations</th>
            <th class="text-left px-3 py-2 font-medium">Updated</th>
            <th class="text-right px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in data.rows"
            :key="row.id"
            class="border-t border-(--ui-border) hover:bg-(--ui-bg-elevated)"
          >
            <td class="px-3 py-2">
              <span v-if="row.title_en">{{ row.title_en }}</span>
              <em v-else class="text-(--ui-text-muted)">Untitled</em>
            </td>
            <td class="px-3 py-2 font-mono">{{ row.slug }}</td>
            <td class="px-3 py-2">{{ row.parent_slug || '—' }}</td>
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

    <UModal v-model:open="createModalOpen" title="New CMS page">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Slug" required description="e.g. about/vision">
            <UInput v-model="newSlug" placeholder="about/vision" />
          </UFormField>
          <UFormField label="Parent slug" description="Leave blank for top-level pages.">
            <UInput v-model="newParentSlug" placeholder="about" />
          </UFormField>
          <UFormField label="Menu order" description="Sort order in sidebar navigation.">
            <UInput v-model.number="newMenuOrder" type="number" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="createModalOpen = false">Cancel</UButton>
          <UButton color="primary" :loading="creating" :disabled="!newSlug.trim()" @click="createPage">Create</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
