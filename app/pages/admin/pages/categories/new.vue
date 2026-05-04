<script setup lang="ts">
// Admin: create a new category. Collect the slug and a per-locale name
// for each enabled language. Server insists on a non-empty English
// name; the other locales can be filled in here or later on the edit
// screen.

import { ENABLED_LANGUAGES } from '~~/config/languages'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const toast = useToast()
const router = useRouter()

const slug = ref('')
const names = reactive<Record<string, string>>({})
for (const l of ENABLED_LANGUAGES) names[l.code] = ''

const activeLocale = ref<string>('en')
const creating = ref(false)

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
      body: { slug: slugValue, translations }
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
        <UFormField label="Slug" required description="Lowercase letters, digits, and dashes. Used as the URL prefix for every page in this category (e.g. about).">
          <UInput v-model="slug" placeholder="about" />
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
              <UInput v-model="names[l.code]" :placeholder="l.code === 'en' ? 'About' : 'Leave blank to fill later'" />
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
