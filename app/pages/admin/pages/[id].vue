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
  category_id: string | null
  menu_order: number
  theme: PageTheme
  custom_css: string | null
  created: string
  updated: string
}

interface CategoryRow {
  id: string
  slug: string
  url: string
  parent_path: string | null
  parent_label: string | null
  parent_id: string | null
  menu_order: number
  translations: Array<{ locale: string; name: string }>
  page_count: number
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
  url: string
  category_path: string | null
}

const route = useRoute()
const router = useRouter()
const toast = useToast()

const pageId = computed(() => String(route.params.id))

// Live public URL for the "View page" link in the Publish card. Uses
// the server-computed full URL (data.url) so it stays correct as the
// page moves between categories. English is the default locale, so
// `prefix_except_default` means no prefix.
const publicUrl = computed(() => {
  const committedUrl = data.value?.url
  if (!committedUrl) return null
  return activeLocale.value === 'en'
    ? `/${committedUrl}`
    : `/${activeLocale.value}/${committedUrl}`
})

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

const { data, pending, refresh } = await useFetch<PageDetail>(() => `/api/admin/pages/${pageId.value}`)
const { data: categoriesData } = await useFetch<{ rows: CategoryRow[] }>(
  '/api/admin/categories',
  { default: () => ({ rows: [] }) }
)

const categories = computed(() => categoriesData.value?.rows ?? [])

function categoryLabel(cat: CategoryRow): string {
  const en = cat.translations.find(t => t.locale === 'en')?.name ?? cat.slug
  return cat.parent_label ? `${cat.parent_label} / ${en}` : en
}

const categoryItems = computed(() => [
  { label: '— Uncategorized —', value: null as string | null },
  ...[...categories.value]
    .sort((a, b) => a.url.localeCompare(b.url))
    .map(c => ({ label: categoryLabel(c), value: c.id as string | null }))
])

// Metadata editable in the top bar
const slug = ref('')
const categoryId = ref<string | null>(null)
const menuOrder = ref(0)
const theme = ref<PageTheme>('default')
const customCss = ref('')
// Original category id at load time — used to detect moves that also
// trigger an automatic slug-prefix rewrite on the server.
const originalCategoryId = ref<string | null>(null)
watchEffect(() => {
  if (data.value) {
    slug.value = data.value.page.slug
    categoryId.value = data.value.page.category_id
    originalCategoryId.value = data.value.page.category_id
    menuOrder.value = data.value.page.menu_order
    theme.value = data.value.page.theme ?? 'default'
    customCss.value = data.value.page.custom_css ?? ''
  }
})

const selectedCategory = computed(() =>
  categoryId.value ? categories.value.find(c => c.id === categoryId.value) : undefined
)

const isCategoryChanged = computed(() => categoryId.value !== originalCategoryId.value)

// Live preview of the full URL — re-derived from the (in-flight) leaf
// slug + selected category so the editor sees the new URL before they
// save. Used in the Slug field's helper text.
const previewFullUrl = computed(() => {
  const leaf = slug.value.trim().replace(/^\/+|\/+$/g, '')
  if (!leaf) return ''
  const prefix = selectedCategory.value?.url
  return prefix ? `${prefix}/${leaf}` : leaf
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
async function saveAll(statusOverride?: 'draft' | 'published', localeOverride?: string): Promise<boolean> {
  const locale = localeOverride ?? activeLocale.value
  const f = forms[locale]
  if (!f) return false
  if (!f.title.trim()) {
    toast.add({ title: 'Title is required', color: 'error' })
    return false
  }
  saving.value = true
  try {
    await $fetch(`/api/admin/pages/${pageId.value}`, {
      method: 'PATCH',
      body: {
        slug: slug.value,
        category_id: categoryId.value,
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
    return true
  } catch (e: any) {
    const status = e?.statusCode || e?.response?.status
    const detail = e?.data?.statusMessage || e?.data?.message || e?.statusMessage || e?.message
    toast.add({
      title: status ? `Save failed (${status})` : 'Save failed',
      description: detail || 'Unexpected error — please try again',
      color: 'error'
    })
    return false
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
const translateStatus = ref<'draft' | 'published'>('draft')
const translating = ref(false)

function openTranslateModal() {
  translateSource.value = 'en'
  translateTargets.value = ENABLED_LANGUAGES.map(l => l.code).filter(c => c !== 'en')
  translateOverwrite.value = false
  translateStatus.value = 'draft'
  translateModalOpen.value = true
}

async function runTranslate() {
  // Persist any unsaved edits in the source-locale tab first — the
  // translate endpoint reads from the DB, not from the in-memory form.
  const sourceForm = forms[translateSource.value]
  if (sourceForm && (sourceForm.dirty || !sourceForm.loaded)) {
    const ok = await saveAll(undefined, translateSource.value)
    if (!ok) return
  }
  translating.value = true
  try {
    const res = await $fetch<{ results: Array<{ locale: string; skipped?: boolean; error?: string }> }>(
      `/api/admin/pages/${pageId.value}/translate`,
      {
        method: 'POST',
        body: {
          sourceLocale: translateSource.value,
          targetLocales: translateTargets.value,
          overwrite: translateOverwrite.value,
          status: translateStatus.value
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

// ── Version history ─────────────────────────────────────────────
//
// Per-locale snapshot list. Loaded lazily when the drawer opens (or
// the active locale changes while it's open). Restoring a version
// hydrates the form fields with the old content and marks the form
// dirty — nothing hits the DB until the user clicks Save/Publish.

interface VersionSummary {
  id: string
  created: string
  status: 'draft' | 'published'
  source: 'admin-ui' | 'mcp' | 'deepl'
  title: string
  created_by: { id: string; name: string } | null
}

interface VersionDetail extends VersionSummary {
  body_json: Record<string, any>
  body_html: string
  excerpt: string | null
  featured_image: string | null
  meta_title: string | null
  meta_description: string | null
  og_image: string | null
}

const historyOpen = ref(false)
const versionsLoading = ref(false)
const versions = ref<VersionSummary[]>([])
const selectedVersionId = ref<string | null>(null)
const selectedVersion = ref<VersionDetail | null>(null)
const versionDetailLoading = ref(false)

async function loadVersions() {
  versionsLoading.value = true
  selectedVersionId.value = null
  selectedVersion.value = null
  try {
    const res = await $fetch<{ versions: VersionSummary[] }>(
      `/api/admin/pages/${pageId.value}/translations/${activeLocale.value}/versions`
    )
    versions.value = res.versions
  } catch (e: any) {
    toast.add({
      title: 'Could not load history',
      description: e?.data?.statusMessage || e?.message,
      color: 'error'
    })
    versions.value = []
  } finally {
    versionsLoading.value = false
  }
}

async function selectVersion(id: string) {
  if (selectedVersionId.value === id) return
  selectedVersionId.value = id
  selectedVersion.value = null
  versionDetailLoading.value = true
  try {
    selectedVersion.value = await $fetch<VersionDetail>(
      `/api/admin/pages/${pageId.value}/translations/${activeLocale.value}/versions/${id}`
    )
  } catch (e: any) {
    toast.add({
      title: 'Could not load version',
      description: e?.data?.statusMessage || e?.message,
      color: 'error'
    })
  } finally {
    versionDetailLoading.value = false
  }
}

function openHistory() {
  historyOpen.value = true
  loadVersions()
}

// Refetch when the editor switches locale tabs while the drawer is open.
watch(activeLocale, () => {
  if (historyOpen.value) loadVersions()
})

function loadVersionIntoEditor() {
  const v = selectedVersion.value
  if (!v) return
  const f = forms[activeLocale.value]
  if (!f) return
  f.title = v.title
  f.excerpt = v.excerpt ?? ''
  f.featured_image = v.featured_image ?? ''
  f.meta_title = v.meta_title ?? ''
  f.meta_description = v.meta_description ?? ''
  f.og_image = v.og_image ?? ''
  f.body_json = JSON.parse(JSON.stringify(v.body_json))
  f.dirty = true
  f.loaded = true
  historyOpen.value = false
  toast.add({
    title: 'Version loaded into editor',
    description: 'Click Save or Publish to apply.',
    color: 'success'
  })
}

const SOURCE_LABELS: Record<string, string> = {
  'admin-ui': 'Admin',
  mcp: 'MCP',
  deepl: 'DeepL'
}

function formatVersionTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch { return iso }
}
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

              <UButton
                block
                variant="ghost"
                color="neutral"
                icon="i-lucide-history"
                :disabled="!forms[activeLocale]?.loaded"
                @click="openHistory"
              >History</UButton>

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
              <UFormField
                label="Category"
                :description="isCategoryChanged ? 'Moving to a different category will change this page’s URL — the old URL will 404.' : 'Group this page under a category.'"
              >
                <USelect
                  v-model="categoryId"
                  :items="categoryItems"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="Slug"
                :description="previewFullUrl ? `Full URL: /${previewFullUrl}` : 'Leaf segment only — lowercase letters, digits, dashes.'"
              >
                <div v-if="selectedCategory" class="flex items-center gap-1 min-w-0">
                  <span class="shrink-0 text-(--ui-text-muted) font-mono text-sm truncate">{{ selectedCategory.url }}/</span>
                  <UInput v-model="slug" class="flex-1 min-w-0" />
                </div>
                <UInput v-else v-model="slug" class="w-full" />
              </UFormField>
              <UFormField label="Menu order" description="Position within the category sidebar.">
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

    <USlideover
      v-model:open="historyOpen"
      side="right"
      :title="`Version history · ${activeLocale}`"
      :ui="{ content: 'w-screen max-w-full sm:max-w-none sm:w-[80vw] lg:w-[70vw]' }"
    >
      <template #body>
        <div class="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] gap-4 h-full">
          <!-- Version list -->
          <div class="border border-(--ui-border) rounded-lg overflow-y-auto">
            <div v-if="versionsLoading" class="p-4 text-sm text-(--ui-text-muted)">
              Loading…
            </div>
            <div v-else-if="versions.length === 0" class="p-4 text-sm text-(--ui-text-muted)">
              No saved versions for this locale yet.
            </div>
            <ul v-else class="divide-y divide-(--ui-border)">
              <li
                v-for="v in versions"
                :key="v.id"
                :class="[
                  'p-3 cursor-pointer hover:bg-(--ui-bg-elevated) transition-colors',
                  selectedVersionId === v.id ? 'bg-(--ui-bg-elevated)' : ''
                ]"
                @click="selectVersion(v.id)"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs text-(--ui-text-muted)">{{ formatVersionTime(v.created) }}</span>
                  <UBadge
                    size="xs"
                    :color="v.status === 'published' ? 'success' : 'neutral'"
                    variant="subtle"
                  >{{ v.status }}</UBadge>
                </div>
                <div class="mt-1 text-sm font-medium truncate">{{ v.title || '(untitled)' }}</div>
                <div class="mt-0.5 text-xs text-(--ui-text-muted) flex items-center gap-1.5">
                  <span>{{ v.created_by?.name ?? 'System' }}</span>
                  <span>·</span>
                  <span>{{ SOURCE_LABELS[v.source] ?? v.source }}</span>
                </div>
              </li>
            </ul>
          </div>

          <!-- Preview pane -->
          <div class="border border-(--ui-border) rounded-lg overflow-y-auto">
            <div v-if="!selectedVersionId" class="p-6 text-sm text-(--ui-text-muted)">
              Select a version to preview.
            </div>
            <div v-else-if="versionDetailLoading" class="p-6 text-sm text-(--ui-text-muted)">
              Loading version…
            </div>
            <div v-else-if="selectedVersion" class="p-6 space-y-4">
              <div>
                <h2 class="text-lg font-semibold">{{ selectedVersion.title || '(untitled)' }}</h2>
                <div class="mt-1 text-xs text-(--ui-text-muted) flex flex-wrap items-center gap-1.5">
                  <UBadge
                    size="xs"
                    :color="selectedVersion.status === 'published' ? 'success' : 'neutral'"
                    variant="subtle"
                  >{{ selectedVersion.status }}</UBadge>
                  <span>·</span>
                  <span>{{ formatVersionTime(selectedVersion.created) }}</span>
                  <span>·</span>
                  <span>{{ selectedVersion.created_by?.name ?? 'System' }}</span>
                  <span>·</span>
                  <span>{{ SOURCE_LABELS[selectedVersion.source] ?? selectedVersion.source }}</span>
                </div>
              </div>

              <div v-if="selectedVersion.excerpt" class="text-sm text-(--ui-text-muted) italic border-l-2 border-(--ui-border) pl-3">
                {{ selectedVersion.excerpt }}
              </div>

              <div v-if="selectedVersion.body_html" class="version-body" v-html="selectedVersion.body_html"></div>
              <div v-else class="text-sm text-(--ui-text-muted)">(empty body)</div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="historyOpen = false">Close</UButton>
          <UButton
            color="primary"
            icon="i-lucide-rotate-ccw"
            :disabled="!selectedVersion"
            @click="loadVersionIntoEditor"
          >Load into editor</UButton>
        </div>
      </template>
    </USlideover>

    <UModal v-model:open="translateModalOpen" title="Translate with DeepL">
      <template #body>
        <div class="space-y-3">
          <UFormField label="Source locale">
            <USelect
              v-model="translateSource"
              :items="enabledLanguages.map(l => ({ label: l.nativeName, value: l.code }))"
            />
          </UFormField>
          <div>
            <p class="text-sm font-medium text-(--ui-text) mb-1">Target locales</p>
            <div class="flex flex-wrap gap-2">
              <UCheckbox
                v-for="l in enabledLanguages.filter(x => x.code !== translateSource)"
                :key="l.code"
                :model-value="translateTargets.includes(l.code)"
                :label="`${l.flag} ${l.nativeName}`"
                @update:model-value="checked => { if (checked) { translateTargets = Array.from(new Set([...translateTargets, l.code])) } else { translateTargets = translateTargets.filter(c => c !== l.code) } }"
              />
            </div>
          </div>
          <UFormField label="Save translations as">
            <USelect
              v-model="translateStatus"
              :items="[
                { label: 'Draft', value: 'draft' },
                { label: 'Published', value: 'published' }
              ]"
            />
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

<style scoped>
/* Mirror RichTextEditor's .tiptap-body rules so server-rendered Tiptap
   HTML in the version-history preview pane shows the same formatting
   as the editor — Tailwind Typography is not installed, so prose
   classes are inert. */
.version-body :deep(h1) { font-size: 1.875rem; font-weight: 700; margin: 1rem 0 0.5rem; }
.version-body :deep(h2) { font-size: 1.5rem;   font-weight: 700; margin: 1rem 0 0.5rem; }
.version-body :deep(h3) { font-size: 1.25rem;  font-weight: 600; margin: 1rem 0 0.5rem; }
.version-body :deep(p)  { margin: 0.5rem 0; }
.version-body :deep(ul) { list-style: disc;    padding-left: 1.5rem; }
.version-body :deep(ol) { list-style: decimal; padding-left: 1.5rem; }
.version-body :deep(blockquote) { border-left: 3px solid var(--ui-border); padding-left: 1rem; color: var(--ui-text-muted); }
.version-body :deep(code) { background: var(--ui-bg-elevated); padding: 0.1em 0.3em; border-radius: 0.25rem; }
.version-body :deep(a) { color: var(--ui-primary); text-decoration: underline; }
.version-body :deep(img) { max-width: 100%; height: auto; border-radius: 0.375rem; }
.version-body :deep(iframe) { max-width: 100%; }
.version-body :deep(strong) { font-weight: 700; }
.version-body :deep(em) { font-style: italic; }
.version-body :deep(hr) { margin: 1rem 0; border-color: var(--ui-border); }

/* Custom-node placeholders. renderTiptap outputs empty divs for
   UupgsList / GeneralResources (hydrated on the public page); show
   them as labeled blocks so editors can see "yes, a block lived here". */
.version-body :deep(.doxa-uupgs-list-slot),
.version-body :deep(.doxa-general-resources-slot) {
  display: block;
  margin: 0.75rem 0;
  padding: 0.75rem 1rem;
  border: 1px dashed var(--ui-border-accented, var(--ui-border));
  border-radius: 0.5rem;
  background: var(--ui-bg-elevated);
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  font-style: italic;
}
.version-body :deep(.doxa-uupgs-list-slot)::before { content: '[ UUPGs list ]'; }
.version-body :deep(.doxa-general-resources-slot)::before { content: '[ General resources ]'; }

/* Verse block — has real content, just needs framing. */
.version-body :deep(.doxa-verse) {
  position: relative;
  margin: 1rem 0;
  padding: 1rem 1rem 1rem 2.5rem;
  border-left: 4px solid var(--ui-primary);
  background: var(--ui-bg-elevated);
  border-radius: 0 0.375rem 0.375rem 0;
}
.version-body :deep(.doxa-verse)::before {
  content: '“';
  position: absolute;
  left: 0.5rem;
  top: 0.25rem;
  font-size: 2rem;
  color: var(--ui-primary);
  line-height: 1;
}
.version-body :deep(.doxa-verse[data-reference])::after {
  content: '— ' attr(data-reference);
  display: block;
  margin-top: 0.5rem;
  text-align: right;
  font-size: 0.8rem;
  font-style: italic;
  color: var(--ui-text-muted);
}
</style>
