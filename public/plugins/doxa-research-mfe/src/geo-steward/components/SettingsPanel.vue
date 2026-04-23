<script setup>
/**
 * SettingsPanel — slot-driven settings panel with sections + save/reset
 * footer. Extracted from
 * `vue-geo-steward/src/components/dialogs/settings-dialog.js`
 * (~900 lines of Pinia + WP coupling). The host app supplies form
 * fields via slots; this shell tracks dirty state and emits actions.
 *
 * Props:
 *   visible (Boolean)
 *   title   (String)
 *   dirty   (Boolean)            — whether host has unsaved changes
 *   busy    (Boolean)            — disable buttons while saving
 *   sections({ id, title }[])    — optional tab list (left rail)
 *   activeId(String)             — current section id (v-model:activeId)
 *
 * Emits:
 *   close, save, reset, update:activeId
 *
 * Slots:
 *   default — single-section content
 *   section-{id} — per-section content when `sections` is supplied
 */
defineProps({
  visible: { type: Boolean, default: false },
  title:   { type: String, default: 'Settings' },
  dirty:   { type: Boolean, default: false },
  busy:    { type: Boolean, default: false },
  sections:{ type: Array, default: () => [] },
});
const activeId = defineModel('activeId', { type: String, default: null });
const emit = defineEmits(['close', 'save', 'reset']);
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="gs-settings" role="dialog" aria-modal="true">
      <div class="gs-settings__modal">
        <header class="gs-settings__header">
          <h2 class="gs-settings__title">{{ title }}</h2>
          <button type="button" class="gs-settings__close" aria-label="Close" @click="emit('close')">&times;</button>
        </header>

        <div class="gs-settings__body">
          <nav v-if="sections.length" class="gs-settings__nav">
            <button
              v-for="s in sections"
              :key="s.id"
              type="button"
              class="gs-settings__nav-item"
              :class="{ 'is-active': activeId === s.id }"
              @click="activeId = s.id"
            >{{ s.title }}</button>
          </nav>

          <section class="gs-settings__content">
            <template v-if="sections.length">
              <template v-for="s in sections" :key="s.id">
                <div v-if="activeId === s.id">
                  <slot :name="`section-${s.id}`" />
                </div>
              </template>
            </template>
            <slot v-else />
          </section>
        </div>

        <footer class="gs-settings__footer">
          <button type="button" class="gs-settings__btn"
                  :disabled="busy" @click="emit('reset')">Reset</button>
          <button type="button" class="gs-settings__btn gs-settings__btn--primary"
                  :disabled="busy || !dirty" @click="emit('save')">
            {{ busy ? 'Saving…' : 'Save' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gs-settings {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 10300;
  font-family: var(--gs-font, system-ui, sans-serif);
}
.gs-settings__modal {
  background: var(--gs-modal-bg, #ffffff);
  color:      var(--gs-modal-fg, #111827);
  width: min(820px, 96vw);
  max-height: 88vh;
  display: flex; flex-direction: column;
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0,0,0,.3);
  overflow: hidden;
}
.gs-settings__header {
  display: flex; align-items: center;
  padding: .75rem 1rem;
  background: var(--gs-modal-header-bg, #1e293b);
  color:      var(--gs-modal-header-fg, #f8fafc);
}
.gs-settings__title { margin: 0; font-size: 1rem; flex: 1; }
.gs-settings__close {
  background: none; border: none; color: inherit; cursor: pointer;
  font-size: 1.25rem; line-height: 1;
}
.gs-settings__body {
  display: flex; flex: 1; min-height: 0;
}
.gs-settings__nav {
  width: 180px;
  border-right: 1px solid var(--gs-modal-border, #e5e7eb);
  background: var(--gs-nav-bg, #f8fafc);
  display: flex; flex-direction: column;
  padding: .5rem 0;
}
.gs-settings__nav-item {
  background: none; border: none; text-align: left;
  padding: .5rem 1rem; cursor: pointer; color: inherit; font-size: .85rem;
}
.gs-settings__nav-item.is-active {
  background: var(--gs-nav-active, #e0f2fe);
  font-weight: 600;
}
.gs-settings__content { flex: 1; overflow: auto; padding: 1rem 1.25rem; }
.gs-settings__footer {
  display: flex; justify-content: flex-end; gap: .5rem;
  padding: .75rem 1rem;
  border-top: 1px solid var(--gs-modal-border, #e5e7eb);
  background: var(--gs-modal-footer-bg, #f8fafc);
}
.gs-settings__btn {
  padding: .45rem .9rem;
  background: var(--gs-btn-bg, #ffffff);
  color:      var(--gs-btn-fg, #111827);
  border: 1px solid var(--gs-input-border, #d1d5db);
  border-radius: 6px;
  cursor: pointer; font-size: .85rem;
}
.gs-settings__btn--primary {
  background: var(--gs-btn-primary-bg, #2563eb);
  color:      var(--gs-btn-primary-fg, #ffffff);
  border-color: transparent;
}
.gs-settings__btn:disabled { opacity: .5; cursor: not-allowed; }
</style>
