<!--
  ShareButton.vue — Share / embed popover for the map toolbar.

  Provides partners a ready-to-paste iframe embed snippet and a direct link
  to the research map. Both sections have one-click copy-to-clipboard with
  visual "Copied!" feedback that reverts after 2 seconds.

  The embed URL is computed at runtime from window.location so it works on
  both staging and production without any hardcoded domain.

  Props:
    isDark — theme flag forwarded from parent

  Popover closes on:
    - Click outside
    - Escape key
    - Re-click the share button
-->
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useShadowStyles } from '../../composables/useShadowStyles.js'
import MapControlButton from './MapControlButton.vue'

useShadowStyles(`
.share-pop{
  position:absolute;
  top:0;
  right:48px;
  width:340px;
  background:#1a1f2e;
  border:1px solid rgba(255,255,255,0.12);
  border-radius:12px;
  box-shadow:0 8px 32px rgba(0,0,0,0.36);
  padding:16px;
  z-index:20;
  color:#e8e8e8;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  font-size:13px;
}
.share-pop.light{
  background:#ffffff;
  border:1px solid rgba(0,0,0,0.10);
  box-shadow:0 8px 32px rgba(0,0,0,0.14);
  color:#333;
}
.share-section{margin-bottom:14px;}
.share-section:last-child{margin-bottom:0;}
.share-label{
  font-size:11px;
  font-weight:600;
  text-transform:uppercase;
  letter-spacing:0.5px;
  margin-bottom:6px;
  color:rgba(255,255,255,0.55);
}
.share-pop.light .share-label{color:rgba(0,0,0,0.45);}
.share-code{
  display:block;
  width:100%;
  min-height:60px;
  background:rgba(0,0,0,0.25);
  border:1px solid rgba(255,255,255,0.08);
  border-radius:8px;
  padding:8px 10px;
  color:#c8d0dc;
  font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;
  font-size:11.5px;
  line-height:1.45;
  resize:none;
  cursor:default;
}
.share-pop.light .share-code{
  background:rgba(0,0,0,0.04);
  border:1px solid rgba(0,0,0,0.10);
  color:#333;
}
.share-link-row{
  display:flex;
  align-items:center;
  gap:8px;
}
.share-link-url{
  flex:1;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  background:rgba(0,0,0,0.25);
  border:1px solid rgba(255,255,255,0.08);
  border-radius:8px;
  padding:7px 10px;
  font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;
  font-size:11.5px;
  color:#c8d0dc;
}
.share-pop.light .share-link-url{
  background:rgba(0,0,0,0.04);
  border:1px solid rgba(0,0,0,0.10);
  color:#333;
}
.share-copy-btn{
  flex-shrink:0;
  padding:6px 12px;
  background:rgba(255,255,255,0.10);
  border:1px solid rgba(255,255,255,0.14);
  border-radius:8px;
  color:#e8e8e8;
  font-size:12px;
  font-weight:500;
  cursor:pointer;
  transition:background 0.15s,color 0.15s;
  white-space:nowrap;
  font-family:inherit;
}
.share-copy-btn:hover{background:rgba(255,255,255,0.18);}
.share-pop.light .share-copy-btn{
  background:rgba(0,0,0,0.06);
  border:1px solid rgba(0,0,0,0.12);
  color:#333;
}
.share-pop.light .share-copy-btn:hover{background:rgba(0,0,0,0.10);}
.share-copy-btn.copied{
  background:rgba(52,199,89,0.20);
  border-color:rgba(52,199,89,0.30);
  color:#34c759;
}
.share-embed-row{
  display:flex;
  justify-content:flex-end;
  margin-top:8px;
}
@media(max-width:767px){
  .share-pop{
    width:calc(100vw - 80px);
    right:0;
    top:44px;
  }
}
`, 'share-button')

const { t } = useI18n()

const props = defineProps({
  isDark: { type: Boolean, default: false }
})

const isOpen = ref(false)
const popoverEl = ref(null)
const btnEl = ref(null)
const embedCopied = ref(false)
const linkCopied = ref(false)

const embedPath = '/research/doxa-research-map.html'

const embedUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.origin + embedPath
  }
  return 'https://doxa.life' + embedPath
})

const iframeSnippet = computed(() => {
  return '<iframe src="' + embedUrl.value + '" width="100%" height="600" style="border:none; border-radius:12px;" allowfullscreen></iframe>'
})

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

async function copyEmbed() {
  try {
    await navigator.clipboard.writeText(iframeSnippet.value)
    embedCopied.value = true
    setTimeout(() => { embedCopied.value = false }, 2000)
  } catch { /* clipboard unavailable in insecure context */ }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(embedUrl.value)
    linkCopied.value = true
    setTimeout(() => { linkCopied.value = false }, 2000)
  } catch { /* clipboard unavailable in insecure context */ }
}

function onClickOutside(e) {
  if (!isOpen.value) return
  // Walk the composed path to handle shadow DOM click targets
  const path = e.composedPath ? e.composedPath() : [e.target]
  if (popoverEl.value && path.some(el => el === popoverEl.value)) return
  if (btnEl.value && path.some(el => el === btnEl.value || el === btnEl.value.$el)) return
  close()
}

function onKeyDown(e) {
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside, true)
  document.addEventListener('keydown', onKeyDown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside, true)
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div style="position:relative;">
    <MapControlButton
      ref="btnEl"
      :is-dark="isDark"
      :active="isOpen"
      :title="t('buttons.shareEmbed')"
      @click="toggle"
    >
      <!-- Share icon: box with arrow pointing up -->
      <svg xmlns="http://www.w3.org/2000/svg"
           width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
      </svg>
    </MapControlButton>

    <!-- Popover -->
    <div
      v-if="isOpen"
      ref="popoverEl"
      class="share-pop"
      :class="{ light: !isDark }"
    >
      <!-- Embed section -->
      <div class="share-section">
        <div class="share-label">Embed</div>
        <textarea
          class="share-code"
          :value="iframeSnippet"
          readonly
          rows="3"
          @focus="$event.target.select()"
        />
        <div class="share-embed-row">
          <button
            class="share-copy-btn"
            :class="{ copied: embedCopied }"
            @click="copyEmbed"
          >{{ embedCopied ? 'Copied!' : 'Copy embed code' }}</button>
        </div>
      </div>

      <!-- Direct link section -->
      <div class="share-section">
        <div class="share-label">Direct Link</div>
        <div class="share-link-row">
          <div class="share-link-url">{{ embedUrl }}</div>
          <button
            class="share-copy-btn"
            :class="{ copied: linkCopied }"
            @click="copyLink"
          >{{ linkCopied ? 'Copied!' : 'Copy' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
