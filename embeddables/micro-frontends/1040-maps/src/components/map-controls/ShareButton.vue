<!--
  ShareButton.vue — Non-technical share modal for the map toolbar.

  Redesigned to match consumer-grade UX from YouTube, Spotify, Canva, and
  Google Maps. Two tabs:

    1. "Share Link" — clean URL display + one-click copy + social share icons
    2. "Add to Your Website" — friendly embed guidance with size presets

  The word "iframe" never appears in any user-visible text. The embed tab
  leads with a plain-English description, then shows the code below.

  Props:
    isDark — theme flag forwarded from parent

  Popover closes on:
    - Click outside (shadow-DOM-aware via composedPath)
    - Escape key
    - Re-click the share button
-->
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useShadowStyles } from '../../composables/useShadowStyles.js'
import MapControlButton from './MapControlButton.vue'

/* ------------------------------------------------------------------ */
/* Shadow-DOM styles                                                   */
/* ------------------------------------------------------------------ */
useShadowStyles(`
/* ---- popover shell ---- */
.share-pop{
  position:absolute;
  top:0;
  right:48px;
  width:380px;
  background:#1a1f2e;
  border:1px solid rgba(255,255,255,0.12);
  border-radius:14px;
  box-shadow:0 12px 40px rgba(0,0,0,0.42);
  padding:0;
  z-index:20;
  color:#e0e4ec;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  font-size:14px;
  overflow:hidden;
  opacity:0;
  transform:translateY(-4px) scale(0.98);
  animation:share-pop-in 0.18s ease-out forwards;
}
@keyframes share-pop-in{
  to{opacity:1;transform:translateY(0) scale(1);}
}
.share-pop.light{
  background:#ffffff;
  border:1px solid rgba(0,0,0,0.08);
  box-shadow:0 12px 40px rgba(0,0,0,0.16);
  color:#1a1a1a;
}

/* ---- header / close ---- */
.share-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:16px 20px 0 20px;
}
.share-title{
  font-size:17px;
  font-weight:700;
  letter-spacing:-0.01em;
}
.share-close{
  width:28px;height:28px;
  border:none;background:transparent;
  border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:inherit;opacity:0.5;
  transition:opacity 0.15s,background 0.15s;
}
.share-close:hover{opacity:1;background:rgba(255,255,255,0.08);}
.share-pop.light .share-close:hover{background:rgba(0,0,0,0.06);}

/* ---- tabs ---- */
.share-tabs{
  display:flex;
  gap:0;
  padding:0 20px;
  margin-top:14px;
  border-bottom:1px solid rgba(255,255,255,0.08);
}
.share-pop.light .share-tabs{border-bottom:1px solid rgba(0,0,0,0.08);}
.share-tab{
  padding:10px 0;
  margin-right:24px;
  font-size:13.5px;
  font-weight:600;
  background:none;border:none;
  color:inherit;opacity:0.5;
  cursor:pointer;
  border-bottom:2px solid transparent;
  transition:opacity 0.15s,border-color 0.2s;
  font-family:inherit;
  white-space:nowrap;
}
.share-tab:hover{opacity:0.75;}
.share-tab.active{
  opacity:1;
  border-bottom-color:#4a90d9;
}
.share-pop.light .share-tab.active{
  border-bottom-color:#1a73e8;
}

/* ---- tab body ---- */
.share-body{
  padding:18px 20px 20px 20px;
}

/* ---- Share Link tab ---- */
.share-url-box{
  display:flex;
  align-items:center;
  gap:0;
  background:rgba(0,0,0,0.22);
  border:1px solid rgba(255,255,255,0.08);
  border-radius:10px;
  overflow:hidden;
}
.share-pop.light .share-url-box{
  background:rgba(0,0,0,0.035);
  border:1px solid rgba(0,0,0,0.10);
}
.share-url-text{
  flex:1;
  padding:11px 14px;
  font-size:13px;
  color:#b0b8c8;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  -webkit-user-select:all;
  user-select:all;
}
.share-pop.light .share-url-text{color:#555;}

/* ---- primary CTA button ---- */
.share-primary-btn{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  width:100%;
  padding:12px 0;
  margin-top:14px;
  background:#4a90d9;
  border:none;
  border-radius:10px;
  color:#fff;
  font-size:14.5px;
  font-weight:600;
  cursor:pointer;
  transition:background 0.15s,transform 0.1s;
  font-family:inherit;
}
.share-primary-btn:hover{background:#3d7ec5;}
.share-primary-btn:active{transform:scale(0.98);}
.share-primary-btn.copied{
  background:#2ea44f;
}
.share-pop.light .share-primary-btn{
  background:#1a73e8;
}
.share-pop.light .share-primary-btn:hover{
  background:#1565c0;
}
.share-pop.light .share-primary-btn.copied{
  background:#2ea44f;
}

/* ---- social row ---- */
.share-social-row{
  display:flex;
  align-items:center;
  gap:10px;
  margin-top:16px;
  padding-top:14px;
  border-top:1px solid rgba(255,255,255,0.06);
}
.share-pop.light .share-social-row{
  border-top:1px solid rgba(0,0,0,0.06);
}
.share-social-label{
  font-size:12px;
  opacity:0.45;
  font-weight:500;
  margin-right:auto;
  white-space:nowrap;
}
.share-social-btn{
  width:36px;height:36px;
  border-radius:50%;
  border:1px solid rgba(255,255,255,0.10);
  background:rgba(255,255,255,0.06);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;
  color:inherit;
  transition:background 0.15s,border-color 0.15s;
}
.share-social-btn:hover{
  background:rgba(255,255,255,0.12);
  border-color:rgba(255,255,255,0.18);
}
.share-pop.light .share-social-btn{
  border:1px solid rgba(0,0,0,0.10);
  background:rgba(0,0,0,0.03);
}
.share-pop.light .share-social-btn:hover{
  background:rgba(0,0,0,0.07);
  border-color:rgba(0,0,0,0.16);
}

/* ---- Embed tab ---- */
.share-embed-desc{
  font-size:13.5px;
  line-height:1.55;
  opacity:0.72;
  margin-bottom:16px;
}

.share-size-pills{
  display:flex;
  gap:8px;
  margin-bottom:14px;
}
.share-size-pill{
  padding:6px 14px;
  border-radius:20px;
  border:1px solid rgba(255,255,255,0.12);
  background:transparent;
  color:inherit;
  font-size:12.5px;
  font-weight:500;
  cursor:pointer;
  transition:background 0.15s,border-color 0.15s;
  font-family:inherit;
}
.share-size-pill:hover{
  background:rgba(255,255,255,0.06);
}
.share-size-pill.active{
  background:rgba(74,144,217,0.18);
  border-color:rgba(74,144,217,0.45);
  color:#7ab8f5;
}
.share-pop.light .share-size-pill{
  border:1px solid rgba(0,0,0,0.12);
}
.share-pop.light .share-size-pill:hover{
  background:rgba(0,0,0,0.04);
}
.share-pop.light .share-size-pill.active{
  background:rgba(26,115,232,0.10);
  border-color:rgba(26,115,232,0.40);
  color:#1a73e8;
}

.share-code-box{
  background:rgba(0,0,0,0.28);
  border:1px solid rgba(255,255,255,0.06);
  border-radius:10px;
  padding:12px 14px;
  font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;
  font-size:11.5px;
  line-height:1.5;
  color:#a0aab8;
  word-break:break-all;
  white-space:pre-wrap;
  max-height:90px;
  overflow-y:auto;
  -webkit-user-select:all;
  user-select:all;
}
.share-pop.light .share-code-box{
  background:rgba(0,0,0,0.035);
  border:1px solid rgba(0,0,0,0.08);
  color:#444;
}

/* ---- copy code button (secondary style) ---- */
.share-secondary-btn{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  width:100%;
  padding:11px 0;
  margin-top:12px;
  background:rgba(255,255,255,0.08);
  border:1px solid rgba(255,255,255,0.12);
  border-radius:10px;
  color:#e0e4ec;
  font-size:14px;
  font-weight:600;
  cursor:pointer;
  transition:background 0.15s,border-color 0.15s,transform 0.1s;
  font-family:inherit;
}
.share-secondary-btn:hover{
  background:rgba(255,255,255,0.13);
  border-color:rgba(255,255,255,0.18);
}
.share-secondary-btn:active{transform:scale(0.98);}
.share-secondary-btn.copied{
  background:rgba(46,164,79,0.16);
  border-color:rgba(46,164,79,0.35);
  color:#5cd680;
}
.share-pop.light .share-secondary-btn{
  background:rgba(0,0,0,0.04);
  border:1px solid rgba(0,0,0,0.12);
  color:#333;
}
.share-pop.light .share-secondary-btn:hover{
  background:rgba(0,0,0,0.07);
}
.share-pop.light .share-secondary-btn.copied{
  background:rgba(46,164,79,0.10);
  border-color:rgba(46,164,79,0.30);
  color:#2ea44f;
}

/* ---- responsive ---- */
@media(max-width:767px){
  .share-pop{
    width:calc(100vw - 40px);
    max-width:400px;
    right:0;
    top:46px;
  }
}
`, 'share-button')

const { t } = useI18n()

const props = defineProps({
  isDark: { type: Boolean, default: false }
})

/* ---- state ---- */
const isOpen = ref(false)
const popoverEl = ref(null)
const btnEl = ref(null)
const activeTab = ref('link')          // 'link' | 'embed'
const linkCopied = ref(false)
const embedCopied = ref(false)
const embedSize = ref('medium')        // 'small' | 'medium' | 'large'

const sizePresets = {
  small:  { label: 'Small',  height: 400 },
  medium: { label: 'Medium', height: 600 },
  large:  { label: 'Large',  height: 800 }
}

/* ---- computed ---- */
const embedPath = '/research/doxa-research-map.html'

const shareUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.origin + embedPath
  }
  return 'https://doxa.life' + embedPath
})

const embedSnippet = computed(() => {
  const h = sizePresets[embedSize.value].height
  return '<iframe src="' + shareUrl.value + '" width="100%" height="' + h + '" style="border:none; border-radius:12px;" allowfullscreen></iframe>'
})

const emailShareHref = computed(() => {
  const subject = encodeURIComponent('Check out this interactive prayer map')
  const body = encodeURIComponent(shareUrl.value)
  return 'mailto:?subject=' + subject + '&body=' + body
})

const whatsappShareHref = computed(() => {
  const text = encodeURIComponent(shareUrl.value)
  return 'https://wa.me/?text=' + text
})

/* ---- actions ---- */
function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    activeTab.value = 'link'
    linkCopied.value = false
    embedCopied.value = false
  }
}

function close() {
  isOpen.value = false
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    linkCopied.value = true
    setTimeout(() => { linkCopied.value = false }, 2000)
  } catch { /* clipboard unavailable in insecure context */ }
}

async function copyEmbed() {
  try {
    await navigator.clipboard.writeText(embedSnippet.value)
    embedCopied.value = true
    setTimeout(() => { embedCopied.value = false }, 2000)
  } catch { /* clipboard unavailable in insecure context */ }
}

/* ---- outside click / escape ---- */
function onClickOutside(e) {
  if (!isOpen.value) return
  const path = e.composedPath ? e.composedPath() : [e.target]
  if (popoverEl.value && path.some(el => el === popoverEl.value)) return
  if (btnEl.value && path.some(el => el === btnEl.value || el === btnEl.value.$el)) return
  close()
}

function onKeyDown(e) {
  if (e.key === 'Escape' && isOpen.value) close()
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
      <!-- Share icon: box with upward arrow (iOS / Material standard) -->
      <svg xmlns="http://www.w3.org/2000/svg"
           width="18" height="18" viewBox="0 0 24 24"
           fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/>
        <polyline points="16 6 12 2 8 6"/>
        <line x1="12" y1="2" x2="12" y2="15"/>
      </svg>
    </MapControlButton>

    <!-- =================== Popover =================== -->
    <div
      v-if="isOpen"
      ref="popoverEl"
      class="share-pop"
      :class="{ light: !isDark }"
    >
      <!-- Header -->
      <div class="share-header">
        <span class="share-title">Share</span>
        <button class="share-close" @click="close" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
               stroke="currentColor" stroke-width="2"
               stroke-linecap="round">
            <line x1="2" y1="2" x2="12" y2="12"/>
            <line x1="12" y1="2" x2="2" y2="12"/>
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="share-tabs">
        <button
          class="share-tab"
          :class="{ active: activeTab === 'link' }"
          @click="activeTab = 'link'"
        >Share Link</button>
        <button
          class="share-tab"
          :class="{ active: activeTab === 'embed' }"
          @click="activeTab = 'embed'"
        >Add to Your Website</button>
      </div>

      <!-- ===== Tab 1: Share Link ===== -->
      <div v-if="activeTab === 'link'" class="share-body">
        <!-- URL display -->
        <div class="share-url-box">
          <div class="share-url-text">{{ shareUrl }}</div>
        </div>

        <!-- Copy Link primary CTA -->
        <button
          class="share-primary-btn"
          :class="{ copied: linkCopied }"
          @click="copyLink"
        >
          <!-- Copy / Check icon -->
          <svg v-if="!linkCopied" width="16" height="16" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {{ linkCopied ? 'Copied!' : 'Copy Link' }}
        </button>

        <!-- Social share -->
        <div class="share-social-row">
          <span class="share-social-label">Share via</span>
          <!-- Email -->
          <a class="share-social-btn" :href="emailShareHref"
             title="Share via email" aria-label="Share via email">
            <svg width="18" height="18" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <polyline points="22,4 12,13 2,4"/>
            </svg>
          </a>
          <!-- WhatsApp -->
          <a class="share-social-btn" :href="whatsappShareHref"
             target="_blank" rel="noopener noreferrer"
             title="Share on WhatsApp" aria-label="Share on WhatsApp">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
        </div>
      </div>

      <!-- ===== Tab 2: Add to Your Website ===== -->
      <div v-if="activeTab === 'embed'" class="share-body">
        <!-- Friendly description -->
        <div class="share-embed-desc">
          Paste this code into your website builder (WordPress, Squarespace, Wix, or any site that accepts HTML widgets).
        </div>

        <!-- Size presets -->
        <div class="share-size-pills">
          <button
            v-for="(preset, key) in sizePresets"
            :key="key"
            class="share-size-pill"
            :class="{ active: embedSize === key }"
            @click="embedSize = key"
          >{{ preset.label }}</button>
        </div>

        <!-- Code box -->
        <div class="share-code-box">{{ embedSnippet }}</div>

        <!-- Copy Code button -->
        <button
          class="share-secondary-btn"
          :class="{ copied: embedCopied }"
          @click="copyEmbed"
        >
          <svg v-if="!embedCopied" width="15" height="15" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <svg v-else width="15" height="15" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {{ embedCopied ? 'Copied!' : 'Copy Code' }}
        </button>
      </div>
    </div>
  </div>
</template>
