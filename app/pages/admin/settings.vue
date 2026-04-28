<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

interface SettingsResponse {
  'auth.public_registration_enabled'?: boolean
}

const { hasPermission } = usePermissions()
const toast = useToast()

const canView = computed(() => hasPermission('settings.view'))
const canEdit = computed(() => hasPermission('settings.edit'))

const { data, pending, error, refresh } = await useFetch<SettingsResponse>('/api/admin/settings', {
  default: () => ({} as SettingsResponse),
  immediate: canView.value
})

const registrationEnabled = computed({
  get: () => data.value?.['auth.public_registration_enabled'] ?? true,
  set: (val: boolean) => {
    // Replace the ref value rather than mutating in place — useFetch's data
    // ref doesn't reliably notify on property mutation, especially when the
    // key didn't exist on the initial default empty object.
    data.value = { ...(data.value ?? {}), 'auth.public_registration_enabled': val }
  }
})

const saving = ref(false)

const handleToggleRegistration = async (next: boolean) => {
  if (!canEdit.value || saving.value) return
  const previous = registrationEnabled.value
  registrationEnabled.value = next
  saving.value = true
  try {
    await $fetch('/api/admin/settings/auth.public_registration_enabled', {
      method: 'PATCH',
      body: { value: next }
    })
    toast.add({
      title: next ? 'Public registration enabled' : 'Public registration disabled',
      color: 'success'
    })
  } catch (err: any) {
    registrationEnabled.value = previous
    toast.add({
      title: 'Update failed',
      description: err?.data?.statusMessage || err?.message || 'Failed to update setting',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-6">Settings</h1>

    <div v-if="!canView" class="max-w-xl">
      <UAlert
        color="warning"
        variant="soft"
        title="No access"
        description="You don't have permission to view site settings."
      />
    </div>

    <template v-else>
      <UAlert v-if="error" color="error" :title="error.statusMessage || 'Failed to load settings'" class="mb-4" />

      <div v-if="pending" class="text-sm text-(--ui-text-muted)">Loading…</div>

      <section v-else class="max-w-2xl space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-shield-check" class="size-4 text-(--ui-text-muted)" />
              <h2 class="text-sm font-semibold uppercase tracking-wide text-(--ui-text-muted)">Authentication</h2>
            </div>
          </template>

          <div class="flex items-start justify-between gap-6">
            <div class="flex-1 min-w-0">
              <h3 class="font-medium">Public registration</h3>
              <p class="text-sm text-(--ui-text-muted) mt-1">
                When enabled, anyone can sign up at <span class="font-mono text-xs">/register</span>.
                When disabled, new users must be invited by an administrator.
              </p>
            </div>
            <USwitch
              :model-value="registrationEnabled"
              :disabled="!canEdit || saving"
              :loading="saving"
              @update:model-value="handleToggleRegistration"
            />
          </div>
        </UCard>

        <p v-if="canView && !canEdit" class="text-xs text-(--ui-text-muted)">
          You can view settings but not change them. Contact an administrator if you need to make changes.
        </p>
      </section>
    </template>
  </div>
</template>
