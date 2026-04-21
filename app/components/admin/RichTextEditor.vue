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
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import Youtube from '@tiptap/extension-youtube'
import { uploadImage } from '~/composables/useImageUpload'

const props = withDefaults(defineProps<{
  modelValue: Record<string, any>
  placeholder?: string
}>(), {
  placeholder: 'Start writing…'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, any>): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
    Image,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    Color,
    Highlight,
    Typography,
    Subscript,
    Superscript,
    Youtube
  ],
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

function isActive(name: string, attrs?: Record<string, any>): boolean {
  return editor.value?.isActive(name, attrs) ?? false
}

function isActiveAttrs(attrs: Record<string, any>): boolean {
  return editor.value?.isActive(attrs) ?? false
}

function promptForLink() {
  const prev = editor.value?.getAttributes('link').href || ''
  const url = window.prompt('Link URL', prev)
  if (url === null) return
  if (url === '') {
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
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
  } catch (err: any) {
    window.alert(err?.message || 'Image upload failed')
  } finally {
    uploading.value = false
  }
}

function insertYoutube() {
  const url = window.prompt('YouTube URL')
  if (!url) return
  editor.value?.commands.setYoutubeVideo({ src: url })
}

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
      <UButton size="xs" variant="ghost" :color="isActiveAttrs({ textAlign: 'left' }) ? 'primary' : 'neutral'" icon="i-lucide-align-left" aria-label="Align left" @click="cmd(e => e.chain().focus().setTextAlign('left').run())" />
      <UButton size="xs" variant="ghost" :color="isActiveAttrs({ textAlign: 'center' }) ? 'primary' : 'neutral'" icon="i-lucide-align-center" aria-label="Align center" @click="cmd(e => e.chain().focus().setTextAlign('center').run())" />
      <UButton size="xs" variant="ghost" :color="isActiveAttrs({ textAlign: 'right' }) ? 'primary' : 'neutral'" icon="i-lucide-align-right" aria-label="Align right" @click="cmd(e => e.chain().focus().setTextAlign('right').run())" />
      <div class="w-px bg-(--ui-border) mx-1" />
      <UButton size="xs" variant="ghost" :color="isActive('link') ? 'primary' : 'neutral'" icon="i-lucide-link" aria-label="Link" @click="promptForLink" />
      <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-image" aria-label="Image" :loading="uploading" @click="insertImage" />
      <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-youtube" aria-label="YouTube" @click="insertYoutube" />
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
</style>
