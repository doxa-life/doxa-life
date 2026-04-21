<script setup lang="ts">
// Port of the video modal in marketing-theme/front-page.php + theme.js.
// Overlay + Vimeo iframe; opens on any element bound to the exposed
// `openVideo()`. Closes on overlay click, close button, Escape, or back
// navigation. Uses `data-state` attributes to match the existing SCSS
// (_video.scss).

const props = defineProps<{
  src: string        // Vimeo embed URL (without autoplay param)
}>()

const state = ref<'open' | 'closed'>('closed')
const iframeRef = ref<HTMLIFrameElement | null>(null)
const baseSrc = computed(() => props.src)

function open() {
  state.value = 'open'
  if (iframeRef.value) {
    // Append autoplay=1 when opening
    const sep = baseSrc.value.includes('?') ? '&' : '?'
    iframeRef.value.src = `${baseSrc.value}${sep}autoplay=1`
  }
  if (import.meta.client) history.pushState(null, '', '#playing-video')
}

function close() {
  state.value = 'closed'
  // Reset src to stop playback
  if (iframeRef.value) {
    iframeRef.value.src = ''
    iframeRef.value.src = baseSrc.value
  }
}

function onKeydown(e: KeyboardEvent) {
  if (state.value === 'open' && e.key === 'Escape') close()
}

function onPopState(e: PopStateEvent) {
  if (state.value === 'open') {
    e.preventDefault()
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('popstate', onPopState)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('popstate', onPopState)
})

// Expose open/close so parent templates can trigger from the hero button.
defineExpose({ open, close })
</script>

<template>
  <div>
    <div
      class="video-modal-overlay"
      :data-state="state"
      @click="close"
    />
    <div class="video-modal" :data-state="state">
      <button
        type="button"
        class="video-modal-close"
        aria-label="Close video"
        @click="close"
      >
        ×
      </button>
      <iframe
        ref="iframeRef"
        id="vimeo-player"
        :src="baseSrc"
        frameborder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowfullscreen
      />
    </div>
  </div>
</template>
