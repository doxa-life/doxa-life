<script setup lang="ts">
// Admin: recursive drag-and-drop tree of categories. Each level is its
// own vuedraggable list scoped to one set of siblings, so a drag can
// only reorder within a parent — never move a category to a different
// parent (re-parenting stays an explicit choice in the category editor).
// Mirrors the page reorder UX: a dedicated grip handle, autosave on
// drop, parent owns persistence. Uses :list mode so vuedraggable
// splices the (reactive) sibling array in place; @end then reports the
// new order up so the page can persist it.

import draggable from 'vuedraggable'

interface CategoryNode {
  id: string
  slug: string
  url: string
  parent_id: string | null
  translations: Array<{ locale: string; name: string }>
  page_count: number
  children: CategoryNode[]
}

defineOptions({ name: 'CategoryTree' })

const props = defineProps<{
  items: CategoryNode[]
  parentId: string | null
  depth: number
}>()

const emit = defineEmits<{
  reorder: [parentId: string | null, ids: string[]]
  delete: [node: CategoryNode]
}>()

const router = useRouter()

function englishName(node: CategoryNode): string {
  return node.translations.find(t => t.locale === 'en')?.name ?? node.slug
}

// Sortable fires @end on every drop, including drops that land in the
// same spot — skip those so we don't PATCH for a non-move.
function onEnd(evt: { oldIndex?: number; newIndex?: number }) {
  if (evt.oldIndex === evt.newIndex) return
  emit('reorder', props.parentId, props.items.map(n => n.id))
}
</script>

<template>
  <draggable
    :list="items"
    tag="ul"
    item-key="id"
    handle=".cat-drag-handle"
    animation="150"
    ghost-class="opacity-40"
    class="divide-y divide-(--ui-border)"
    @end="onEnd"
  >
    <template #item="{ element: node }">
      <li>
        <div
          class="flex items-center gap-3 py-2 px-2 hover:bg-(--ui-bg-elevated)"
          :style="{ paddingLeft: `${depth * 1.5 + 0.5}rem` }"
        >
          <button
            type="button"
            class="cat-drag-handle cursor-grab active:cursor-grabbing text-(--ui-text-muted) hover:text-(--ui-text) p-1 -m-1"
            aria-label="Drag to reorder"
          >
            <UIcon name="i-lucide-grip-vertical" class="size-4" />
          </button>
          <div
            class="flex-1 min-w-0 cursor-pointer"
            @click="router.push(`/admin/pages/categories/${node.id}`)"
          >
            <div class="text-sm truncate">
              <span v-if="depth > 0" class="text-(--ui-text-muted) mr-1">↳</span>
              {{ englishName(node) }}
            </div>
            <div class="text-xs text-(--ui-text-muted) font-mono truncate">/{{ node.url }}</div>
          </div>
          <div class="hidden sm:flex flex-wrap gap-1 max-w-40 justify-end">
            <UBadge
              v-for="t in node.translations"
              :key="t.locale"
              size="xs"
              variant="subtle"
              color="neutral"
            >
              {{ t.locale }}
            </UBadge>
          </div>
          <UBadge :color="node.page_count > 0 ? 'info' : 'neutral'" variant="subtle">
            {{ node.page_count }}
          </UBadge>
          <div class="flex gap-1">
            <UButton
              size="xs"
              variant="outline"
              icon="i-lucide-pencil"
              :to="`/admin/pages/categories/${node.id}`"
            >
              Edit
            </UButton>
            <UButton
              size="xs"
              variant="outline"
              color="error"
              icon="i-lucide-trash-2"
              :disabled="node.page_count > 0 || node.children.length > 0"
              :title="node.page_count > 0
                ? 'Move or delete member pages first'
                : (node.children.length > 0 ? 'Move or delete child categories first' : 'Delete category')"
              @click="emit('delete', node)"
            >
              Delete
            </UButton>
          </div>
        </div>
        <CategoryTree
          v-if="node.children.length"
          :items="node.children"
          :parent-id="node.id"
          :depth="depth + 1"
          @reorder="(p, ids) => emit('reorder', p, ids)"
          @delete="(n) => emit('delete', n)"
        />
      </li>
    </template>
  </draggable>
</template>
