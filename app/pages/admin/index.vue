<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const { hasPermission } = usePermissions()
const toast = useToast()
const flushing = ref(false)

async function flushCache() {
  if (flushing.value) return
  if (!window.confirm('Flush every cached CMS page? Next visitor to each page will hit the DB + re-render.')) return
  flushing.value = true
  try {
    const res = await $fetch<{ ok: boolean; purged: number }>('/api/admin/cache/flush', { method: 'POST' })
    toast.add({
      title: 'Cache flushed',
      description: `${res.purged} cached page${res.purged === 1 ? '' : 's'} removed.`,
      color: 'success'
    })
  } catch (e: any) {
    toast.add({
      title: 'Flush failed',
      description: e?.statusMessage || e?.message || 'Unknown error',
      color: 'error'
    })
  } finally {
    flushing.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">Dashboard</h1>

    <section v-if="hasPermission('pages.write')" class="border border-(--ui-border) rounded-md p-4 max-w-xl">
      <h2 class="text-lg font-semibold mb-1">CMS cache</h2>
      <p class="text-sm text-(--ui-text-muted) mb-3">
        Every edit auto-purges the pages it touches. Use this when you've
        imported content directly or need a hard reset.
      </p>
      <UButton
        color="warning"
        variant="soft"
        icon="i-lucide-trash-2"
        :loading="flushing"
        @click="flushCache"
      >
        Flush all CMS cache
      </UButton>
    </section>
  </div>
</template>
