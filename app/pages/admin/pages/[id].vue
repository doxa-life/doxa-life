<script setup lang="ts">
// Admin: CMS page editor. Per-locale tabs, Tiptap editor, featured
// image + OG image uploaders, meta_title / meta_description, and
// Save / Publish / Unpublish actions. A DeepL button fan-outs English
// into the other enabled locales.

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

import { ENABLED_LANGUAGES } from '~~/config/languages'
import { uploadImage } from '~/composables/useImageUpload'

type PageTheme = 'default' | 'green'

interface Page {
  id: string
  slug: string
  parent_slug: string | null
  menu_order: number
  theme: PageTheme
  custom_css: string | null
  created: string
  updated: string
}

interface Translation {
  id: string
  page_id: string
  locale: string
  title: string
  body_json: Record<string, any>
  excerpt: string | null
  featured_image: string | null
  meta_title: string | null
  meta_description: string | null
  og_image: string | null
  status: 'draft' | 'published'
  updated: string
}

interface PageDetail {
  page: Page
  translations: Translation[]
}

const route = useRoute()
const router = useRouter()
const toast = useToast()

const pageId = computed(() => String(route.params.id))

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

const { data, pending, refresh } = await useFetch<PageDetail>(() => `/api/admin/pages/${pageId.value}`)

// Metadata editable in the top bar
const slug = ref('')
const parentSlug = ref<string>('')
const menuOrder = ref(0)
const theme = ref<PageTheme>('default')
const customCss = ref('')
watchEffect(() => {
  if (data.value) {
    slug.value = data.value.page.slug
    parentSlug.value = data.value.page.parent_slug ?? ''
    menuOrder.value = data.value.page.menu_order
    theme.value = data.value.page.theme ?? 'default'
    customCss.value = data.value.page.custom_css ?? ''
  }
})

const THEME_OPTIONS: Array<{ label: string; value: PageTheme }> = [
  { label: 'Default', value: 'default' },
  { label: 'Green background', value: 'green' }
]

// Tabs state — one tab per enabled language
const activeLocale = ref<string>('en')

interface LocaleForm {
  title: string
  excerpt: string
  featured_image: string
  meta_title: string
  meta_description: string
  og_image: string
  body_json: Record<string, any>
  status: 'draft' | 'published'
  dirty: boolean
  loaded: boolean
}

function blankForm(): LocaleForm {
  return {
    title: '',
    excerpt: '',
    featured_image: '',
    meta_title: '',
    meta_description: '',
    og_image: '',
    body_json: structuredClone(EMPTY_DOC),
    status: 'draft',
    dirty: false,
    loaded: false
  }
}

const forms = reactive<Record<string, LocaleForm>>({})
for (const l of ENABLED_LANGUAGES) forms[l.code] = blankForm()

// Hydrate forms from server data
watch(data, (value) => {
  if (!value) return
  for (const l of ENABLED_LANGUAGES) {
    const existing = value.translations.find(t => t.locale === l.code)
    if (existing) {
      forms[l.code] = {
        title: existing.title,
        excerpt: existing.excerpt ?? '',
        featured_image: existing.featured_image ?? '',
        meta_title: existing.meta_title ?? '',
        meta_description: existing.meta_description ?? '',
        og_image: existing.og_image ?? '',
        body_json: existing.body_json ?? structuredClone(EMPTY_DOC),
        status: existing.status,
        dirty: false,
        loaded: true
      }
    } else {
      forms[l.code] = { ...blankForm(), loaded: false }
    }
  }
}, { immediate: true })

function markDirty(locale: string) {
  const f = forms[locale]
  if (f) f.dirty = true
}

function setField(locale: string, field: keyof LocaleForm, value: unknown) {
  const f = forms[locale]
  if (!f) return
  ;(f as any)[field] = value
  f.dirty = true
}

// Per-field watchers aren't tractable — use v-on on each input by calling markDirty.
// For Tiptap we watch body_json for changes.
for (const l of ENABLED_LANGUAGES) {
  watch(() => forms[l.code]?.body_json, () => markDirty(l.code), { deep: true })
}

const savingMeta = ref(false)
async function saveMetadata() {
  savingMeta.value = true
  try {
    await $fetch(`/api/admin/pages/${pageId.value}`, {
      method: 'PATCH',
      body: {
        slug: slug.value,
        parent_slug: parentSlug.value || null,
        menu_order: menuOrder.value,
        theme: theme.value,
        custom_css: customCss.value.trim() ? customCss.value : null
      }
    })
    toast.add({ title: 'Page metadata saved', color: 'success' })
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Could not save metadata',
      description: e?.data?.statusMessage || e?.message,
      color: 'error'
    })
  } finally {
    savingMeta.value = false
  }
}

const savingTranslation = ref(false)
async function saveTranslation(locale: string, statusOverride?: 'draft' | 'published') {
  const f = forms[locale]
  if (!f) return
  if (!f.title.trim()) {
    toast.add({ title: 'Title is required', color: 'error' })
    return
  }
  savingTranslation.value = true
  try {
    const body: Record<string, unknown> = {
      title: f.title,
      body_json: f.body_json,
      excerpt: f.excerpt || null,
      featured_image: f.featured_image || null,
      meta_title: f.meta_title || null,
      meta_description: f.meta_description || null,
      og_image: f.og_image || null
    }
    if (statusOverride) body.status = statusOverride

    await $fetch(`/api/admin/pages/${pageId.value}/translations/${locale}`, {
      method: 'PUT',
      body
    })
    if (statusOverride) f.status = statusOverride
    f.loaded = true
    f.dirty = false
    toast.add({ title: `Saved ${locale}`, color: 'success' })
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Save failed',
      description: e?.data?.statusMessage || e?.message,
      color: 'error'
    })
  } finally {
    savingTranslation.value = false
  }
}

async function setStatus(locale: string, status: 'draft' | 'published') {
  const f = forms[locale]
  if (!f) return
  if (f.dirty) {
    // Save current content along with the publish action so published
    // state never diverges from the draft the editor is looking at
    await saveTranslation(locale, status)
    return
  }
  try {
    await $fetch(`/api/admin/pages/${pageId.value}/publish`, {
      method: 'POST',
      body: { locale, status }
    })
    f.status = status
    toast.add({ title: status === 'published' ? 'Published' : 'Unpublished', color: 'success' })
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Status change failed',
      description: e?.data?.statusMessage || e?.message,
      color: 'error'
    })
  }
}

// Image uploads for featured_image + og_image
async function uploadField(field: 'featured_image' | 'og_image', locale: string, file: File) {
  try {
    const { url } = await uploadImage(file)
    const f = forms[locale]
    if (f) {
      f[field] = url
      f.dirty = true
    }
  } catch (e: any) {
    toast.add({ title: 'Upload failed', description: e?.message, color: 'error' })
  }
}

// Deletion confirmation
const deleteModalOpen = ref(false)
const deleting = ref(false)
async function deletePage() {
  deleting.value = true
  try {
    await $fetch(`/api/admin/pages/${pageId.value}`, { method: 'DELETE' })
    toast.add({ title: 'Page deleted', color: 'success' })
    router.push('/admin/pages')
  } catch (e: any) {
    toast.add({
      title: 'Delete failed',
      description: e?.data?.statusMessage || e?.message,
      color: 'error'
    })
  } finally {
    deleting.value = false
    deleteModalOpen.value = false
  }
}

// DeepL translate modal
const translateModalOpen = ref(false)
const translateSource = ref('en')
const translateTargets = ref<string[]>([])
const translateOverwrite = ref(false)
const translating = ref(false)

function openTranslateModal() {
  translateSource.value = 'en'
  translateTargets.value = ENABLED_LANGUAGES.map(l => l.code).filter(c => c !== 'en')
  translateOverwrite.value = false
  translateModalOpen.value = true
}

async function runTranslate() {
  translating.value = true
  try {
    const res = await $fetch<{ results: Array<{ locale: string; skipped?: boolean; error?: string }> }>(
      `/api/admin/pages/${pageId.value}/translate`,
      {
        method: 'POST',
        body: {
          sourceLocale: translateSource.value,
          targetLocales: translateTargets.value,
          overwrite: translateOverwrite.value
        }
      }
    )
    const skipped = res.results.filter(r => r.skipped).length
    const failed = res.results.filter(r => r.error).length
    const succeeded = res.results.filter(r => !r.error && !r.skipped).length
    toast.add({
      title: 'Translation complete',
      description: `${succeeded} translated${skipped ? `, ${skipped} skipped` : ''}${failed ? `, ${failed} failed` : ''}`,
      color: failed ? 'warning' : 'success'
    })
    translateModalOpen.value = false
    await refresh()
  } catch (e: any) {
    toast.add({
      title: 'Translation failed',
      description: e?.data?.statusMessage || e?.message,
      color: 'error'
    })
  } finally {
    translating.value = false
  }
}

const enabledLanguages = ENABLED_LANGUAGES
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" to="/admin/pages">Back</UButton>
        <h1 class="text-xl font-semibold">Edit page</h1>
      </div>
      <div class="flex items-center gap-2">
        <UButton variant="outline" color="primary" icon="i-lucide-languages" @click="openTranslateModal">Translate from English</UButton>
        <UButton variant="outline" color="error" icon="i-lucide-trash-2" @click="deleteModalOpen = true">Delete page</UButton>
      </div>
    </div>

    <UCard v-if="pending && !data">
      <p class="text-(--ui-text-muted)">Loading…</p>
    </UCard>

    <template v-else-if="data">
      <UCard>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <UFormField label="Slug" description="URL path (e.g. about/vision)">
            <UInput v-model="slug" />
          </UFormField>
          <UFormField label="Parent slug" description="Leave blank for top-level.">
            <UInput v-model="parentSlug" />
          </UFormField>
          <UFormField label="Menu order">
            <UInput v-model.number="menuOrder" type="number" />
          </UFormField>
        </div>
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <UFormField label="Page theme" description="Applied to <body>.">
            <USelect v-model="theme" :items="THEME_OPTIONS" />
          </UFormField>
          <UFormField label="Custom CSS" description="Raw CSS injected at end of <body>. Wins over app styles." class="sm:col-span-2">
            <UTextarea
              v-model="customCss"
              :rows="4"
              placeholder="body { … }"
              class="font-mono text-xs w-full"
            />
          </UFormField>
        </div>
        <div class="mt-4 flex justify-end">
          <UButton size="sm" color="primary" :loading="savingMeta" @click="saveMetadata">Save metadata</UButton>
        </div>
      </UCard>

      <!-- Locale tabs -->
      <div class="border border-(--ui-border) rounded-lg">
        <div class="flex flex-wrap gap-1 p-2 border-b border-(--ui-border) bg-(--ui-bg-elevated)">
          <UButton
            v-for="l in enabledLanguages"
            :key="l.code"
            :color="activeLocale === l.code ? 'primary' : 'neutral'"
            :variant="activeLocale === l.code ? 'solid' : 'ghost'"
            size="sm"
            @click="activeLocale = l.code"
          >
            <span class="mr-1">{{ l.flag }}</span>
            {{ l.nativeName }}
            <UBadge
              v-if="forms[l.code]?.loaded"
              class="ml-2"
              size="xs"
              :color="forms[l.code]?.status === 'published' ? 'success' : 'neutral'"
              variant="subtle"
            >
              {{ forms[l.code]?.status }}
            </UBadge>
          </UButton>
        </div>

        <div
          v-for="l in enabledLanguages"
          v-show="activeLocale === l.code"
          :key="l.code"
          class="p-4 space-y-4"
        >
          <UFormField label="Title" required>
            <UInput
              :model-value="forms[l.code]?.title ?? ''"
              @update:model-value="v => setField(l.code, 'title', String(v))"
            />
          </UFormField>

          <UFormField label="Body">
            <RichTextEditor
              v-if="forms[l.code]"
              :model-value="forms[l.code]!.body_json"
              @update:model-value="v => setField(l.code, 'body_json', v)"
            />
          </UFormField>

          <details class="group border border-(--ui-border) rounded-md">
            <summary class="cursor-pointer select-none flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-(--ui-bg-elevated)">
              <span>SEO &amp; extras</span>
              <UIcon name="i-lucide-chevron-down" class="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <div class="p-4 space-y-4 border-t border-(--ui-border)">
              <UFormField label="Excerpt" description="Shown in child-page cards when a parent page has no body.">
                <UTextarea
                  :model-value="forms[l.code]?.excerpt ?? ''"
                  :rows="2"
                  @update:model-value="v => setField(l.code, 'excerpt', String(v))"
                />
              </UFormField>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <UFormField label="Featured image">
                  <div class="flex items-center gap-2">
                    <UInput
                      :model-value="forms[l.code]?.featured_image ?? ''"
                      placeholder="https://…"
                      class="flex-1"
                      @update:model-value="v => setField(l.code, 'featured_image', String(v))"
                    />
                    <label class="shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        class="hidden"
                        @change="e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) uploadField('featured_image', l.code, f); (e.target as HTMLInputElement).value = '' }"
                      >
                      <UButton variant="outline" color="neutral" size="sm" icon="i-lucide-upload" as="span">Upload</UButton>
                    </label>
                  </div>
                </UFormField>
                <UFormField label="OG image">
                  <div class="flex items-center gap-2">
                    <UInput
                      :model-value="forms[l.code]?.og_image ?? ''"
                      placeholder="https://…"
                      class="flex-1"
                      @update:model-value="v => setField(l.code, 'og_image', String(v))"
                    />
                    <label class="shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        class="hidden"
                        @change="e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) uploadField('og_image', l.code, f); (e.target as HTMLInputElement).value = '' }"
                      >
                      <UButton variant="outline" color="neutral" size="sm" icon="i-lucide-upload" as="span">Upload</UButton>
                    </label>
                  </div>
                </UFormField>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <UFormField label="Meta title" description="Overrides the page title in <title>.">
                  <UInput
                    :model-value="forms[l.code]?.meta_title ?? ''"
                    @update:model-value="v => setField(l.code, 'meta_title', String(v))"
                  />
                </UFormField>
                <UFormField label="Meta description">
                  <UInput
                    :model-value="forms[l.code]?.meta_description ?? ''"
                    @update:model-value="v => setField(l.code, 'meta_description', String(v))"
                  />
                </UFormField>
              </div>
            </div>
          </details>

          <div class="flex justify-between items-center pt-2 border-t border-(--ui-border)">
            <div class="text-sm text-(--ui-text-muted)">
              <template v-if="forms[l.code]?.dirty">Unsaved changes</template>
              <template v-else-if="forms[l.code]?.loaded">Saved</template>
              <template v-else>Not translated yet</template>
            </div>
            <div class="flex gap-2">
              <UButton
                v-if="forms[l.code]?.status === 'published'"
                variant="outline"
                color="warning"
                icon="i-lucide-eye-off"
                :loading="savingTranslation"
                @click="setStatus(l.code, 'draft')"
              >Unpublish</UButton>
              <UButton
                variant="outline"
                color="neutral"
                :loading="savingTranslation"
                @click="saveTranslation(l.code)"
              >Save draft</UButton>
              <UButton
                color="primary"
                icon="i-lucide-globe"
                :loading="savingTranslation"
                @click="setStatus(l.code, 'published')"
              >Publish</UButton>
            </div>
          </div>
        </div>
      </div>
    </template>

    <UModal v-model:open="deleteModalOpen" title="Delete page?">
      <template #body>
        <p>
          This permanently deletes the page <strong>{{ data?.page.slug }}</strong> and all its translations.
          This cannot be undone.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="deleteModalOpen = false">Cancel</UButton>
          <UButton color="error" :loading="deleting" @click="deletePage">Delete</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="translateModalOpen" title="Translate with DeepL">
      <template #body>
        <div class="space-y-3">
          <UFormField label="Source locale">
            <USelect
              v-model="translateSource"
              :items="enabledLanguages.map(l => ({ label: l.nativeName, value: l.code }))"
            />
          </UFormField>
          <UFormField label="Target locales">
            <div class="flex flex-wrap gap-2">
              <UCheckbox
                v-for="l in enabledLanguages.filter(x => x.code !== translateSource)"
                :key="l.code"
                :model-value="translateTargets.includes(l.code)"
                :label="`${l.flag} ${l.nativeName}`"
                @update:model-value="checked => { if (checked) { translateTargets = Array.from(new Set([...translateTargets, l.code])) } else { translateTargets = translateTargets.filter(c => c !== l.code) } }"
              />
            </div>
          </UFormField>
          <UCheckbox
            v-model="translateOverwrite"
            label="Overwrite existing translations (draft or published)"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="translateModalOpen = false">Cancel</UButton>
          <UButton color="primary" :disabled="translateTargets.length === 0" :loading="translating" @click="runTranslate">Translate</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
