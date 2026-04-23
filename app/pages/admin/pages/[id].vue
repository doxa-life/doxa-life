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

// Live public URL for the "View page" link in the Publish card. Uses the
// committed slug (data) not the in-flight slug ref, so the link always
// points to an existing route even if the author is editing the slug.
// English is the default locale, so `prefix_except_default` means no prefix.
const publicUrl = computed(() => {
  const committedSlug = data.value?.page.slug
  if (!committedSlug) return null
  return activeLocale.value === 'en'
    ? `/${committedSlug}`
    : `/${activeLocale.value}/${committedSlug}`
})

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

// Single save action: page-level metadata (PATCH /pages/:id) + the
// active locale's translation (PUT /translations/:locale) in one click.
// Passing a statusOverride also flips published/draft on the translation.
const saving = ref(false)
async function saveAll(statusOverride?: 'draft' | 'published') {
  const locale = activeLocale.value
  const f = forms[locale]
  if (!f) return
  if (!f.title.trim()) {
    toast.add({ title: 'Title is required', color: 'error' })
    return
  }
  saving.value = true
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

    const verb = statusOverride === 'published'
      ? 'Published'
      : statusOverride === 'draft'
        ? 'Unpublished'
        : 'Saved'
    toast.add({ title: `${verb} ${locale}`, color: 'success' })
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
        <UButton variant="outline" color="primary" icon="i-lucide-languages" disabled title="Workflow not yet tested" @click="openTranslateModal">Translate from English</UButton>
        <UButton variant="outline" color="error" icon="i-lucide-trash-2" @click="deleteModalOpen = true">Delete page</UButton>
      </div>
    </div>

    <UCard v-if="pending && !data">
      <p class="text-(--ui-text-muted)">Loading…</p>
    </UCard>

    <template v-else-if="data">
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <!-- Main column: locale tabs -->
        <div class="border border-(--ui-border) rounded-lg min-w-0">
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

          <div class="pt-2 border-t border-(--ui-border) text-sm text-(--ui-text-muted)">
            <template v-if="forms[l.code]?.dirty">Unsaved changes</template>
            <template v-else-if="forms[l.code]?.loaded">Saved</template>
            <template v-else>Not translated yet</template>
          </div>
        </div>
        </div>

        <!-- Sidebar: page-level metadata (WordPress-style) -->
        <aside class="lg:sticky lg:top-4 space-y-4">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold">Publish</span>
                <UBadge
                  size="xs"
                  :color="forms[activeLocale]?.status === 'published' ? 'success' : 'neutral'"
                  variant="subtle"
                >
                  {{ forms[activeLocale]?.status ?? 'draft' }} · {{ activeLocale }}
                </UBadge>
              </div>
            </template>

            <div class="flex flex-col gap-2">
              <template v-if="forms[activeLocale]?.status === 'published'">
                <UButton
                  block
                  color="primary"
                  icon="i-lucide-globe"
                  :loading="saving"
                  @click="saveAll('published')"
                >Update</UButton>
                <UButton
                  block
                  variant="ghost"
                  color="warning"
                  icon="i-lucide-eye-off"
                  :loading="saving"
                  @click="saveAll('draft')"
                >Move to draft</UButton>
              </template>
              <template v-else>
                <UButton
                  block
                  color="primary"
                  icon="i-lucide-globe"
                  :loading="saving"
                  @click="saveAll('published')"
                >Publish</UButton>
                <UButton
                  block
                  variant="outline"
                  color="neutral"
                  :loading="saving"
                  @click="saveAll()"
                >Save draft</UButton>
              </template>

              <div v-if="publicUrl" class="pt-2 mt-1 border-t border-(--ui-border)">
                <a
                  :href="publicUrl"
                  target="_blank"
                  rel="noopener"
                  class="text-sm text-(--ui-primary) hover:underline inline-flex items-center gap-1"
                >
                  <UIcon name="i-lucide-external-link" class="size-3.5" />
                  {{ publicUrl }}
                </a>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <span class="text-sm font-semibold">Page settings</span>
            </template>

            <div class="space-y-4">
              <UFormField label="Slug" description="URL path (e.g. about/vision)">
                <UInput v-model="slug" />
              </UFormField>
              <UFormField label="Parent slug" description="Leave blank for top-level.">
                <UInput v-model="parentSlug" />
              </UFormField>
              <UFormField label="Menu order">
                <UInput v-model.number="menuOrder" type="number" />
              </UFormField>
              <UFormField label="Page theme" description="Applied to <body>.">
                <USelect v-model="theme" :items="THEME_OPTIONS" class="w-full" />
              </UFormField>
              <UFormField label="Custom CSS" description="Raw CSS injected at end of <body>. Wins over app & theme styles.">
                <UTextarea
                  v-model="customCss"
                  :rows="6"
                  placeholder="body { … }"
                  class="font-mono text-xs w-full"
                />
              </UFormField>
            </div>
          </UCard>

          <!-- Per-locale SEO & extras for the active locale. Native <details>
               keeps the collapsed-by-default behavior without extra state. -->
          <details class="group rounded-(--ui-radius) bg-(--ui-bg) ring ring-(--ui-border) shadow-sm">
            <summary class="cursor-pointer select-none flex items-center justify-between px-4 py-3 text-sm font-semibold">
              <span>SEO &amp; extras <span class="text-(--ui-text-muted) font-normal">· {{ activeLocale }}</span></span>
              <UIcon name="i-lucide-chevron-down" class="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <div class="px-4 py-3 space-y-4 border-t border-(--ui-border)">
              <UFormField label="Excerpt" description="Shown in child-page cards when a parent page has no body.">
                <UTextarea
                  :model-value="forms[activeLocale]?.excerpt ?? ''"
                  :rows="2"
                  @update:model-value="v => setField(activeLocale, 'excerpt', String(v))"
                />
              </UFormField>

              <UFormField label="Featured image">
                <div class="flex items-center gap-2">
                  <UInput
                    :model-value="forms[activeLocale]?.featured_image ?? ''"
                    placeholder="https://…"
                    class="flex-1"
                    @update:model-value="v => setField(activeLocale, 'featured_image', String(v))"
                  />
                  <label class="shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) uploadField('featured_image', activeLocale, f); (e.target as HTMLInputElement).value = '' }"
                    >
                    <UButton variant="outline" color="neutral" size="sm" icon="i-lucide-upload" as="span">Upload</UButton>
                  </label>
                </div>
              </UFormField>

              <UFormField label="OG image">
                <div class="flex items-center gap-2">
                  <UInput
                    :model-value="forms[activeLocale]?.og_image ?? ''"
                    placeholder="https://…"
                    class="flex-1"
                    @update:model-value="v => setField(activeLocale, 'og_image', String(v))"
                  />
                  <label class="shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) uploadField('og_image', activeLocale, f); (e.target as HTMLInputElement).value = '' }"
                    >
                    <UButton variant="outline" color="neutral" size="sm" icon="i-lucide-upload" as="span">Upload</UButton>
                  </label>
                </div>
              </UFormField>

              <UFormField label="Meta title" description="Overrides the page title in <title>.">
                <UInput
                  :model-value="forms[activeLocale]?.meta_title ?? ''"
                  @update:model-value="v => setField(activeLocale, 'meta_title', String(v))"
                />
              </UFormField>
              <UFormField label="Meta description">
                <UInput
                  :model-value="forms[activeLocale]?.meta_description ?? ''"
                  @update:model-value="v => setField(activeLocale, 'meta_description', String(v))"
                />
              </UFormField>
            </div>
          </details>
        </aside>
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
