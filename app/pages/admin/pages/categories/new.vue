<script setup lang="ts">
// Admin: create a new category. Collect the slug, an optional parent
// category, and a per-locale name for each enabled language. Server
// insists on a non-empty English name.

import { ENABLED_LANGUAGES } from '~~/config/languages'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

interface CategoryRow {
  id: string
  slug: string
  url: string
  parent_id: string | null
  parent_path: string | null
  parent_label: string | null
  translations: Array<{ locale: string; name: string }>
}

const toast = useToast()
const router = useRouter()

const slug = ref('')
const parentId = ref<string | null>(null)
const names = reactive<Record<string, string>>({})
for (const l of ENABLED_LANGUAGES) names[l.code] = ''

const activeLocale = ref<string>('en')
const creating = ref(false)

const { data: categoriesData } = await useFetch<{ rows: CategoryRow[] }>(
  '/api/admin/categories',
  { default: () => ({ rows: [] }) }
)

const categories = computed(() => categoriesData.value?.rows ?? [])

function categoryLabel(cat: CategoryRow): string {
  const en = cat.translations.find(t => t.locale === 'en')?.name ?? cat.slug
  return cat.parent_label ? `${cat.parent_label} / ${en}` : en
}

const parentItems = computed(() => [
  { label: '— Top level —', value: null as string | null },
  ...[...categories.value]
    .sort((a, b) => a.url.localeCompare(b.url))
    .map(c => ({ label: categoryLabel(c), value: c.id as string | null }))
])

const previewUrl = computed(() => {
  const leaf = slug.value.trim().replace(/^\/+|\/+$/g, '')
  if (!leaf) return ''
  const parent = parentId.value ? categories.value.find(c => c.id === parentId.value) : null
  return parent ? `${parent.url}/${leaf}` : leaf
})

async function submit() {
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

  creating.value = true
  try {
    const translations = ENABLED_LANGUAGES
      .map(l => ({ locale: l.code, name: (names[l.code] ?? '').trim() }))
      .filter(t => t.name)

    const category = await $fetch<{ id: string }>('/api/admin/categories', {
      method: 'POST',
      body: { slug: slugValue, parent_id: parentId.value, translations }
    })
    toast.add({ title: 'Category created', color: 'success' })
    router.push(`/admin/pages/categories/${category.id}`)
  } catch (e: any) {
    toast.add({
      title: 'Could not create category',
      description: e?.data?.statusMessage || e?.message,
      color: 'error'
    })
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <div class="flex items-center gap-3">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" to="/admin/pages/categories">Back</UButton>
      <h1 class="text-2xl font-semibold">New category</h1>
    </div>

    <UCard>
      <div class="space-y-4">
        <UFormField label="Parent category" description="Leave as Top level for a root category like /resources.">
          <USelect
            v-model="parentId"
            :items="parentItems"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Slug"
          required
          :description="previewUrl ? `URL will be /${previewUrl}` : 'Lowercase letters, digits, and dashes (no slashes).'"
        >
          <UInput v-model="slug" placeholder="adoption" />
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
              <UInput v-model="names[l.code]" :placeholder="l.code === 'en' ? 'Adoption Resources' : 'Leave blank to fill later'" />
            </UFormField>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton color="neutral" variant="ghost" to="/admin/pages/categories">Cancel</UButton>
          <UButton
            color="primary"
            :loading="creating"
            :disabled="!slug.trim() || !names.en?.trim()"
            @click="submit"
          >Create</UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
