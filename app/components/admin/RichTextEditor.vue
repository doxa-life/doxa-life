<script setup lang="ts">
// Minimal Tiptap editor for CMS body content. Extension set matches
// server/utils/renderTiptap.ts so content round-trips cleanly to the
// public renderer. v-model is the Tiptap JSON document (ProseMirror
// doc) — save straight into page_translations.body_json.
//
// Based on campaigns-sever's RichTextEditor.vue but slimmed down — no
// verse/spacer/bible extensions (not needed in marketing content) and
// no custom paste-transform (the WP → Nuxt migration scrape runs
// server-side via its own HTML → Tiptap conversion).

import { useEditor, EditorContent } from '@tiptap/vue-3'
import type { Editor, JSONContent } from '@tiptap/core'
import { Fragment, Slice } from '@tiptap/pm/model'
import type { Node as PmNode, Mark as PmMark } from '@tiptap/pm/model'
import { buildTiptapExtensions } from '~/utils/tiptapExtensions'
import { uploadImage } from '~/composables/useImageUpload'

// Best-effort paste cleanup. The server-side sanitizer in
// tiptapValidate is the authoritative line of defense; this just
// keeps the most common paste sources (Google Docs, Word, Evernote)
// from triggering "formatting was simplified" toasts on every paste.
function cleanFragment(frag: Fragment): Fragment {
  const out: PmNode[] = []
  frag.forEach((child) => {
    const cleaned = cleanNode(child)
    if (cleaned) out.push(cleaned)
  })
  return Fragment.from(out)
}

function cleanNode(node: PmNode): PmNode | null {
  // Drop inline image pastes (data:/blob:) — server would drop them anyway.
  if (node.type.name === 'image') {
    const src = node.attrs?.src
    if (typeof src === 'string' && /^(data|blob):/i.test(src.trim())) return null
  }

  // Strip fontFamily from textStyle marks (Word paste noise; we don't
  // render arbitrary fonts on the public site). If the mark has no
  // remaining meaningful attrs after the strip, drop the whole mark.
  const cleanedMarks: PmMark[] = []
  for (const mark of node.marks) {
    if (mark.type.name === 'textStyle' && mark.attrs?.fontFamily) {
      const next = { ...mark.attrs, fontFamily: null }
      const stillMeaningful = Object.entries(next).some(([k, v]) => k !== 'fontFamily' && v !== null && v !== undefined)
      if (!stillMeaningful) continue
      cleanedMarks.push(mark.type.create(next))
    } else {
      cleanedMarks.push(mark)
    }
  }

  const cleanedContent = node.content && node.content.size > 0
    ? cleanFragment(node.content)
    : node.content

  return node.copy(cleanedContent).mark(cleanedMarks)
}

const props = withDefaults(defineProps<{
  modelValue: JSONContent
  placeholder?: string
}>(), {
  placeholder: 'Start writing…'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: JSONContent): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const linkPopoverOpen = ref(false)
const linkUrl = ref('')
const linkOpenInNewTab = ref(false)

const editor = useEditor({
  content: props.modelValue,
  extensions: buildTiptapExtensions(),
  editorProps: {
    transformPasted(slice) {
      const cleaned = cleanFragment(slice.content)
      return new Slice(cleaned, slice.openStart, slice.openEnd)
    }
  },
  onUpdate({ editor: e }) {
    emit('update:modelValue', e.getJSON())
  }
})

// External updates (DeepL translation refresh, locale tab switch) —
// replace editor content when the prop drifts from the editor state.
watch(
  () => props.modelValue,
  (value) => {
    const current = editor.value?.getJSON()
    if (!value || !editor.value) return
    if (JSON.stringify(current) === JSON.stringify(value)) return
    editor.value.commands.setContent(value, { emitUpdate: false })
  },
  { deep: true }
)

onBeforeUnmount(() => editor.value?.destroy())

function cmd(fn: (e: Editor) => void) {
  if (editor.value) fn(editor.value)
}

function isActive(name: string, attrs?: Record<string, unknown>): boolean {
  return editor.value?.isActive(name, attrs) ?? false
}

function setAlign(align: 'left' | 'center' | 'right') {
  const e = editor.value
  if (!e) return
  if (e.isActive('image')) {
    e.chain().focus().updateAttributes('image', { align }).run()
  } else {
    e.chain().focus().setTextAlign(align).run()
  }
}

function isAlignActive(align: 'left' | 'center' | 'right'): boolean {
  const e = editor.value
  if (!e) return false
  if (e.isActive('image')) {
    return e.getAttributes('image').align === align
  }
  return e.isActive({ textAlign: align })
}

function syncLinkState() {
  const attrs = editor.value?.getAttributes('link') ?? {}
  linkUrl.value = attrs.href || ''
  linkOpenInNewTab.value = attrs.target === '_blank'
}

function linkAttrs() {
  return linkOpenInNewTab.value
    ? { href: linkUrl.value, target: '_blank', rel: 'noopener noreferrer' }
    : { href: linkUrl.value, target: null, rel: null }
}

function applyLink() {
  const e = editor.value
  const url = linkUrl.value.trim()
  if (!e) return
  if (!url) {
    removeLink()
    return
  }
  linkUrl.value = url

  const isEmpty = e.state.selection.empty
  let chain = e.chain().focus().extendMarkRange('link').setLink(linkAttrs())
  if (isEmpty && !e.isActive('link')) {
    chain = chain.insertContent({ type: 'text', text: url })
  }
  chain.run()
  linkPopoverOpen.value = false
}

function removeLink() {
  editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
  linkUrl.value = ''
  linkPopoverOpen.value = false
}

function openLink() {
  if (!linkUrl.value) return
  window.open(linkUrl.value, '_blank', 'noopener,noreferrer')
}

function onLinkPopoverUpdate(open: boolean) {
  linkPopoverOpen.value = open
  if (open) syncLinkState()
}

async function insertImage() {
  fileInputRef.value?.click()
}

async function onFileChosen(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploading.value = true
  try {
    const { url } = await uploadImage(file)
    editor.value?.chain().focus().setImage({ src: url, alt: file.name }).run()
  } catch (err: unknown) {
    window.alert(err instanceof Error ? err.message : 'Image upload failed')
  } finally {
    uploading.value = false
  }
}

// Video embeds (YouTube + Vimeo) share one modal. The user pastes a URL,
// we detect the platform and dispatch to the matching insert command.
const videoModalOpen = ref(false)
const videoUrl = ref('')
const videoError = ref('')

function openVideoModal() {
  videoUrl.value = ''
  videoError.value = ''
  videoModalOpen.value = true
}

function detectVideoPlatform(url: string): 'youtube' | 'vimeo' | null {
  const u = url.toLowerCase()
  if (u.includes('youtube.com') || u.includes('youtu.be') || u.includes('youtube-nocookie.com')) return 'youtube'
  if (u.includes('vimeo.com')) return 'vimeo'
  return null
}

function insertVideo() {
  const url = videoUrl.value.trim()
  const e = editor.value
  if (!url || !e) return
  const platform = detectVideoPlatform(url)
  if (!platform) {
    videoError.value = 'Enter a valid YouTube or Vimeo URL.'
    return
  }
  const inserted = platform === 'youtube'
    ? e.chain().focus().setYoutubeVideo({ src: url }).run()
    : e.chain().focus().setVimeoVideo({ src: url }).run()
  if (!inserted) {
    videoError.value = `That doesn't look like a valid ${platform === 'youtube' ? 'YouTube' : 'Vimeo'} video URL.`
    return
  }
  videoModalOpen.value = false
}

// Clear the inline error as soon as the user edits the URL again.
watch(videoUrl, () => {
  if (videoError.value) videoError.value = ''
})

function insertUupgsList() {
  editor.value?.chain().focus().insertContent({ type: 'uupgsList' }).run()
}

function insertVerse() {
  editor.value?.chain().focus().insertContent({
    type: 'verse',
    content: [{ type: 'paragraph' }]
  }).run()
}

function insertGeneralResources() {
  editor.value?.chain().focus().insertContent({
    type: 'generalResources',
    attrs: { useDocuments: false, layout: 'on-sidebar-page' }
  }).run()
}

function toggleGeneralResourcesUseDocuments() {
  const e = editor.value
  if (!e) return
  const current = e.getAttributes('generalResources')
  e.chain().focus().updateAttributes('generalResources', {
    useDocuments: !current.useDocuments
  }).run()
}

function setGeneralResourcesLayout(layout: 'on-sidebar-page' | 'on-page') {
  editor.value?.chain().focus().updateAttributes('generalResources', { layout }).run()
}

function generalResourcesAttr<K extends 'useDocuments' | 'layout'>(key: K): unknown {
  return editor.value?.getAttributes('generalResources')?.[key]
}

const customNodeMenuItems = computed(() => [
  {
    label: 'UUPG list',
    icon: 'i-lucide-globe',
    onSelect: () => insertUupgsList()
  },
  {
    label: 'Verse',
    icon: 'i-lucide-book-open',
    onSelect: () => insertVerse()
  },
  {
    label: 'Adoption resources',
    icon: 'i-lucide-library',
    onSelect: () => insertGeneralResources()
  }
])

// Clicks on the padding area around the ProseMirror content don't move
// the cursor by default. Forward those clicks to the editor and focus
// at end-of-doc so the click anywhere inside the body area starts editing.
function onBodyClick(e: MouseEvent) {
  if (!editor.value) return
  const target = e.target as HTMLElement | null
  if (target?.closest('.ProseMirror')) return
  editor.value.chain().focus('end').run()
}
</script>

<template>
  <div class="rich-text-editor border border-(--ui-border) rounded-md bg-(--ui-bg)">
    <div v-if="editor" class="toolbar flex flex-wrap gap-1 border-b border-(--ui-border) p-2">
      <UButton size="xs" variant="ghost" :color="isActive('bold') ? 'primary' : 'neutral'" icon="i-lucide-bold" aria-label="Bold" @click="cmd(e => e.chain().focus().toggleBold().run())" />
      <UButton size="xs" variant="ghost" :color="isActive('italic') ? 'primary' : 'neutral'" icon="i-lucide-italic" aria-label="Italic" @click="cmd(e => e.chain().focus().toggleItalic().run())" />
      <UButton size="xs" variant="ghost" :color="isActive('strike') ? 'primary' : 'neutral'" icon="i-lucide-strikethrough" aria-label="Strike" @click="cmd(e => e.chain().focus().toggleStrike().run())" />
      <UButton size="xs" variant="ghost" :color="isActive('highlight') ? 'primary' : 'neutral'" icon="i-lucide-highlighter" aria-label="Highlight" @click="cmd(e => e.chain().focus().toggleHighlight().run())" />
      <div class="w-px bg-(--ui-border) mx-1" />
      <UButton size="xs" variant="ghost" :color="isActive('heading', { level: 1 }) ? 'primary' : 'neutral'" label="H1" @click="cmd(e => e.chain().focus().toggleHeading({ level: 1 }).run())" />
      <UButton size="xs" variant="ghost" :color="isActive('heading', { level: 2 }) ? 'primary' : 'neutral'" label="H2" @click="cmd(e => e.chain().focus().toggleHeading({ level: 2 }).run())" />
      <UButton size="xs" variant="ghost" :color="isActive('heading', { level: 3 }) ? 'primary' : 'neutral'" label="H3" @click="cmd(e => e.chain().focus().toggleHeading({ level: 3 }).run())" />
      <UButton size="xs" variant="ghost" :color="isActive('paragraph') ? 'primary' : 'neutral'" label="P" @click="cmd(e => e.chain().focus().setParagraph().run())" />
      <div class="w-px bg-(--ui-border) mx-1" />
      <UButton size="xs" variant="ghost" :color="isActive('bulletList') ? 'primary' : 'neutral'" icon="i-lucide-list" aria-label="Bullet list" @click="cmd(e => e.chain().focus().toggleBulletList().run())" />
      <UButton size="xs" variant="ghost" :color="isActive('orderedList') ? 'primary' : 'neutral'" icon="i-lucide-list-ordered" aria-label="Ordered list" @click="cmd(e => e.chain().focus().toggleOrderedList().run())" />
      <UButton size="xs" variant="ghost" :color="isActive('blockquote') ? 'primary' : 'neutral'" icon="i-lucide-quote" aria-label="Blockquote" @click="cmd(e => e.chain().focus().toggleBlockquote().run())" />
      <UButton size="xs" variant="ghost" :color="isActive('codeBlock') ? 'primary' : 'neutral'" icon="i-lucide-code" aria-label="Code block" @click="cmd(e => e.chain().focus().toggleCodeBlock().run())" />
      <div class="w-px bg-(--ui-border) mx-1" />
      <UButton size="xs" variant="ghost" :color="isAlignActive('left') ? 'primary' : 'neutral'" icon="i-lucide-align-left" aria-label="Align left" @click="setAlign('left')" />
      <UButton size="xs" variant="ghost" :color="isAlignActive('center') ? 'primary' : 'neutral'" icon="i-lucide-align-center" aria-label="Align center" @click="setAlign('center')" />
      <UButton size="xs" variant="ghost" :color="isAlignActive('right') ? 'primary' : 'neutral'" icon="i-lucide-align-right" aria-label="Align right" @click="setAlign('right')" />
      <div class="w-px bg-(--ui-border) mx-1" />
      <UPopover :open="linkPopoverOpen" :ui="{ content: 'p-3 w-80' }" @update:open="onLinkPopoverUpdate">
        <UButton size="xs" variant="ghost" :color="isActive('link') ? 'primary' : 'neutral'" icon="i-lucide-link" aria-label="Link" @click="syncLinkState" />

        <template #content>
          <div class="space-y-3">
            <UInput
              v-model="linkUrl"
              autofocus
              type="url"
              placeholder="https://example.com"
              @keydown.enter.prevent="applyLink"
            />

            <label class="flex items-center gap-2 text-sm text-(--ui-text)">
              <UCheckbox v-model="linkOpenInNewTab" />
              <span>Open in new tab</span>
            </label>

            <div class="flex items-center justify-between gap-2">
              <div class="flex gap-1">
                <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-external-link" aria-label="Open link" :disabled="!linkUrl" @click="openLink" />
                <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-trash-2" aria-label="Remove link" :disabled="!linkUrl && !isActive('link')" @click="removeLink" />
              </div>
              <UButton size="xs" color="primary" label="Apply" :disabled="!linkUrl.trim()" @click="applyLink" />
            </div>
          </div>
        </template>
      </UPopover>
      <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-image" aria-label="Image" :loading="uploading" @click="insertImage" />
      <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-video" aria-label="Insert video" @click="openVideoModal" />
      <UDropdownMenu :items="customNodeMenuItems">
        <UButton
          size="xs"
          variant="ghost"
          :color="isActive('uupgsList') || isActive('verse') || isActive('generalResources') ? 'primary' : 'neutral'"
          icon="i-lucide-plus"
          label="Insert"
          trailing-icon="i-lucide-chevron-down"
          aria-label="Insert custom block"
        />
      </UDropdownMenu>
      <template v-if="isActive('generalResources')">
        <div class="w-px bg-(--ui-border) mx-1" />
        <UButton
          size="xs"
          variant="ghost"
          :color="generalResourcesAttr('useDocuments') ? 'primary' : 'neutral'"
          :label="generalResourcesAttr('useDocuments') ? 'Documents list' : 'General resources'"
          aria-label="Toggle list type"
          @click="toggleGeneralResourcesUseDocuments"
        />
        <UButton
          size="xs"
          variant="ghost"
          :color="generalResourcesAttr('layout') === 'on-sidebar-page' ? 'primary' : 'neutral'"
          label="Sidebar"
          aria-label="Layout: on a sidebar page"
          @click="setGeneralResourcesLayout('on-sidebar-page')"
        />
        <UButton
          size="xs"
          variant="ghost"
          :color="generalResourcesAttr('layout') === 'on-page' ? 'primary' : 'neutral'"
          label="Full page"
          aria-label="Layout: on a full page"
          @click="setGeneralResourcesLayout('on-page')"
        />
      </template>
      <div class="w-px bg-(--ui-border) mx-1" />
      <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-undo-2" aria-label="Undo" @click="cmd(e => e.chain().focus().undo().run())" />
      <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-redo-2" aria-label="Redo" @click="cmd(e => e.chain().focus().redo().run())" />
    </div>

    <EditorContent
      :editor="editor"
      class="tiptap-body prose max-w-none p-4 min-h-64 focus:outline-none cursor-text"
      @click="onBodyClick"
    />

    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onFileChosen"
    >

    <UModal v-model:open="videoModalOpen" title="Insert video">
      <template #body>
        <UFormField
          label="Video URL"
          description="Paste a YouTube or Vimeo link."
          :error="videoError || undefined"
        >
          <UInput
            v-model="videoUrl"
            autofocus
            class="w-full"
            placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
            @keydown.enter.prevent="insertVideo"
          />
        </UFormField>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="videoModalOpen = false">Cancel</UButton>
          <UButton color="primary" :disabled="!videoUrl.trim()" @click="insertVideo">Insert</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.tiptap-body :deep(h1) { font-size: 1.875rem; font-weight: 700; margin: 1rem 0 0.5rem; }
.tiptap-body :deep(h2) { font-size: 1.5rem;   font-weight: 700; margin: 1rem 0 0.5rem; }
.tiptap-body :deep(h3) { font-size: 1.25rem;  font-weight: 600; margin: 1rem 0 0.5rem; }
.tiptap-body :deep(p)  { margin: 0.5rem 0; }
.tiptap-body :deep(ul) { list-style: disc;    padding-left: 1.5rem; }
.tiptap-body :deep(ol) { list-style: decimal; padding-left: 1.5rem; }
.tiptap-body :deep(blockquote) { border-left: 3px solid var(--ui-border); padding-left: 1rem; color: var(--ui-text-muted); }
.tiptap-body :deep(code) { background: var(--ui-bg-elevated); padding: 0.1em 0.3em; border-radius: 0.25rem; }
.tiptap-body :deep(a) { color: var(--ui-primary); text-decoration: underline; }
.tiptap-body :deep(img) { max-width: 100%; height: auto; border-radius: 0.375rem; }
.tiptap-body :deep(iframe) { max-width: 100%; }
.tiptap-body :deep(.ProseMirror:focus) { outline: none; }

.tiptap-body :deep(.doxa-uupgs-list-editor-chip),
.tiptap-body :deep(.doxa-general-resources-editor-chip) {
  display: block;
  margin: 0.75rem 0;
  padding: 0.75rem 1rem;
  border: 1px dashed var(--ui-border-accented, var(--ui-border));
  border-radius: 0.5rem;
  background: var(--ui-bg-elevated);
  color: var(--ui-text);
  user-select: none;
  cursor: grab;
}
.tiptap-body :deep(.doxa-uupgs-list-editor-chip.is-selected),
.tiptap-body :deep(.doxa-general-resources-editor-chip.is-selected) {
  outline: 2px solid var(--ui-primary);
  outline-offset: 1px;
}
.tiptap-body :deep(.doxa-uupgs-list-editor-chip__header),
.tiptap-body :deep(.doxa-general-resources-editor-chip__header) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
}
.tiptap-body :deep(.doxa-uupgs-list-editor-chip__icon),
.tiptap-body :deep(.doxa-general-resources-editor-chip__icon) { font-size: 1rem; }
.tiptap-body :deep(.doxa-uupgs-list-editor-chip__detail),
.tiptap-body :deep(.doxa-general-resources-editor-chip__detail) {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
  font-family: var(--ui-font-mono, ui-monospace, monospace);
}

.tiptap-body :deep(.doxa-verse--editor) {
  background-color: var(--color-surface-brand, var(--ui-primary));
  color: #fff;
  border-radius: 0.375rem;
  padding: 1rem;
  margin: 1rem 0;
}
.tiptap-body :deep(.doxa-verse__ref-bar) {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}
.tiptap-body :deep(.doxa-verse__ref-input) {
  flex: 1;
  max-width: 280px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 0.25rem;
  padding: 0.375rem 0.625rem;
  font: inherit;
  outline: none;
}
.tiptap-body :deep(.doxa-verse__ref-input::placeholder) {
  color: rgba(255, 255, 255, 0.6);
}
.tiptap-body :deep(.doxa-verse__ref-input:focus) {
  border-color: rgba(255, 255, 255, 0.6);
}
.tiptap-body :deep(.doxa-verse__content p) {
  text-align: center;
  color: #fff;
  margin: 0.5rem 0;
}
.tiptap-body :deep(.doxa-verse__content p:first-child) { margin-top: 0; }
.tiptap-body :deep(.doxa-verse__content p:last-child) { margin-bottom: 0; }
.tiptap-body :deep(.doxa-verse__citation) {
  text-align: right;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8rem;
  font-style: italic;
  margin-top: 0.5rem;
}
</style>
