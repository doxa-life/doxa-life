<script setup lang="ts">
// Port of the video modal markup in marketing-theme/front-page.php plus
// the open/close/escape/back behaviour from marketing-theme/js/theme.js.
// The template mirrors the PHP structure verbatim — .video-modal-overlay
// + .video-modal with the 41.89% padding wrapper, <iframe id="vimeo-player">,
// and the whiteX.png close button.

const props = defineProps<{
  src: string           // Vimeo embed URL (without autoplay param)
  title?: string        // <iframe title>
  closeLabel?: string   // alt text on the close icon
}>()

const state = ref<'open' | 'closed'>('closed')
const iframeRef = ref<HTMLIFrameElement | null>(null)

function open() {
  state.value = 'open'
  if (iframeRef.value) {
    const sep = props.src.includes('?') ? '&' : '?'
    iframeRef.value.src = `${props.src}${sep}autoplay=1`
  }
  if (import.meta.client) history.pushState(null, '', '#playing-video')
}

function close() {
  state.value = 'closed'
  if (iframeRef.value) {
    iframeRef.value.src = ''
    iframeRef.value.src = props.src
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
      <div style="padding:41.89% 0 0 0;position:relative;">
        <iframe
          id="vimeo-player"
          ref="iframeRef"
          :src="props.src"
          frameborder="0"
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          style="position:absolute;top:0;left:0;width:100%;height:100%;"
          :title="title ?? 'Doxa Video'"
        />
      </div>
      <button type="button" class="video-modal-close icon-button" @click="close">
        <img src="/assets/icons/whiteX.png" :alt="closeLabel ?? 'Close video'">
      </button>
    </div>
  </div>
</template>
