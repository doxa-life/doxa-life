<!--
  MapControlButton.vue — Shared base button for all map toolbar controls.

  Renders a single round button with consistent light/dark mode styling.
  Each specific button (ZoomIn, Location, etc.) wraps this component and
  supplies its own icon slot + service logic.

  Props:
    isDark   — mirrors the app theme; switches bg/border/shadow
    title    — tooltip text
    active   — optional pressed/active visual state (e.g. fullscreen on)
    disabled — disables interaction

  Emits:
    click    — forwarded from the native button element
-->
<script setup>
import { useShadowStyles } from '../../composables/useShadowStyles.js'

useShadowStyles(`
.mcb{
  width:var(--map-btn-size,40px);height:var(--map-btn-size,40px);
  background:#fff;
  border:none;
  border-radius:50%;
  cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 1px 4px rgba(0,0,0,0.14),0 2px 8px rgba(0,0,0,0.10);
  transition:background-color 0.2s,box-shadow 0.2s,transform 0.1s;
  color:#333;
  flex-shrink:0;
  outline:none;
}
.mcb:hover:not(:disabled){background:#f0f0f0;box-shadow:0 2px 8px rgba(0,0,0,0.18),0 4px 16px rgba(0,0,0,0.12);}
.mcb:active:not(:disabled){transform:scale(0.93);}
.mcb:disabled{opacity:0.4;cursor:not-allowed;}
.mcb.active{background:#e8f0fe;color:#1a73e8;}
/* dark */
.mcb.dark{background:#3b463d;color:#F3F3F1;border:1px solid rgba(255,255,255,0.14);box-shadow:0 1px 4px rgba(0,0,0,0.4);}
.mcb.dark:hover:not(:disabled){background:#4e594f;box-shadow:0 2px 8px rgba(0,0,0,0.5);}
.mcb.dark.active{background:#4e594f;color:#92b195;}
@media(max-width:767px){.mcb{width:36px;height:36px;}}
`, 'map-control-button')

defineProps({
  isDark:   { type: Boolean, default: false },
  title:    { type: String,  default: '' },
  active:   { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
})

defineEmits(['click'])
</script>

<template>
  <button
    class="mcb"
    :class="{ dark: isDark, active }"
    :title="title"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>
