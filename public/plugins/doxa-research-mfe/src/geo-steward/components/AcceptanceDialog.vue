<script setup>
/**
 * AcceptanceDialog — full-screen modal that requires explicit user
 * agreement before the host app proceeds. Generic version of
 * `vue-geo-steward/src/components/dialogs/eula-dialog.js` with all
 * hard-coded EULA copy moved into the default slot.
 *
 * Props:
 *   visible       (Boolean)
 *   title         (String)
 *   agreeLabel    (String)
 *   disagreeLabel (String)
 *   confirmText   (String)   — text shown in the "are you sure?" step
 *
 * Emits:
 *   agree    — user confirmed twice
 *   disagree — user declined or cancelled confirmation
 */
import { ref, watch } from 'vue';

const props = defineProps({
  visible:       { type: Boolean, default: false },
  title:         { type: String, default: 'Acceptance Required' },
  agreeLabel:    { type: String, default: 'I Agree' },
  disagreeLabel: { type: String, default: 'No' },
  confirmText:   { type: String, default: 'Are you sure?' },
});
const emit = defineEmits(['agree', 'disagree']);

const showConfirm = ref(false);

watch(() => props.visible, (v) => { if (!v) showConfirm.value = false; });

function step1Yes() { showConfirm.value = true; }
function step1No()  { showConfirm.value = false; emit('disagree'); }
function step2Yes() { showConfirm.value = false; emit('agree'); }
function step2No()  { showConfirm.value = false; }

function preventClose(e) { e.preventDefault(); e.stopPropagation(); }
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="gs-accept" role="dialog" aria-modal="true" @click="preventClose">
      <div class="gs-accept__modal" @click.stop>
        <header class="gs-accept__header">
          <h2 class="gs-accept__title">{{ title }}</h2>
        </header>

        <div class="gs-accept__body">
          <slot />
        </div>

        <footer class="gs-accept__footer">
          <template v-if="!showConfirm">
            <button type="button" class="gs-accept__btn gs-accept__btn--yes" @click="step1Yes">
              {{ agreeLabel }}
            </button>
            <button type="button" class="gs-accept__btn gs-accept__btn--no" @click="step1No">
              {{ disagreeLabel }}
            </button>
          </template>
          <template v-else>
            <p class="gs-accept__confirm">{{ confirmText }}</p>
            <button type="button" class="gs-accept__btn gs-accept__btn--yes" @click="step2Yes">Confirm</button>
            <button type="button" class="gs-accept__btn gs-accept__btn--no"  @click="step2No">Cancel</button>
          </template>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gs-accept {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 10500;
  font-family: var(--gs-font, system-ui, sans-serif);
}
.gs-accept__modal {
  background: var(--gs-modal-bg, #ffffff);
  color:      var(--gs-modal-fg, #111827);
  border-radius: 10px;
  width: min(640px, 92vw);
  max-height: 86vh;
  display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,.4);
  overflow: hidden;
}
.gs-accept__header {
  padding: 1rem 1.25rem;
  background: var(--gs-modal-header-bg, #1e293b);
  color:      var(--gs-modal-header-fg, #f8fafc);
}
.gs-accept__title { margin: 0; font-size: 1.1rem; }
.gs-accept__body  { padding: 1rem 1.25rem; overflow: auto; flex: 1; }
.gs-accept__footer {
  display: flex; gap: .5rem; align-items: center;
  padding: .75rem 1.25rem;
  border-top: 1px solid var(--gs-modal-border, #e5e7eb);
  background: var(--gs-modal-footer-bg, #f8fafc);
}
.gs-accept__confirm { margin: 0 auto 0 0; font-size: .9rem; color: var(--gs-muted, #475569); }
.gs-accept__btn {
  padding: .45rem .9rem; border: 1px solid transparent;
  border-radius: 6px; cursor: pointer; font-weight: 600; font-size: .85rem;
}
.gs-accept__btn--yes {
  background: var(--gs-accept-yes-bg, #16a34a); color: #fff;
}
.gs-accept__btn--no {
  background: var(--gs-accept-no-bg, #ffffff);
  color: var(--gs-accept-no-fg, #111827);
  border-color: var(--gs-input-border, #d1d5db);
}
</style>
