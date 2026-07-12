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
import { ref, computed, inject, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useShadowStyles } from '../../composables/useShadowStyles.js'
import MapControlButton from './MapControlButton.vue'

/* ------------------------------------------------------------------ */
/* Shadow-DOM styles                                                   */
/* ------------------------------------------------------------------ */
useShadowStyles(`
/* ---- popover shell ---- */
/* ---- popover shell (imitates SemanticTreeLegend .stl-inner) ---- */
.share-pop{
  position:absolute;
  top:0;
  right:48px;
  width:380px;
  background:#161b22;
  border:1px solid #30363d;
  border-radius:12px;
  box-shadow:0 6px 24px rgba(0,0,0,0.45);
  padding:0;
  z-index:1100;
  color:#e6edf3;
  font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  font-size:13px;
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
  border:1px solid #d8dee4;
  box-shadow:0 6px 24px rgba(0,0,0,0.16);
  color:#1f2328;
}

/* ---- header / close ---- */
/* ---- header (imitates .stl-titlebar: 32px min-height, slim) ---- */
.share-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:8px 12px;
  min-height:32px;
  border-bottom:1px solid #21262d;
}
.share-pop.light .share-header{border-bottom:1px solid #d8dee4;}
.share-title{
  font:600 10px ui-monospace,monospace;
  color:#73A17F;
  text-transform:uppercase;
  letter-spacing:0.07em;
}
.share-pop.light .share-title{color:#3b463d;}
.share-close{
  width:22px;height:20px;
  border:1px solid #30363d;
  background:rgba(110,118,129,0.12);
  border-radius:5px;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:#8b949e;
  padding:0;
  transition:color 0.1s,background 0.1s,border-color 0.1s;
}
.share-close:hover{color:#c9d1d9;background:rgba(59,70,61,0.18);border-color:#73A17F;}
.share-pop.light .share-close{background:rgba(208,215,222,0.4);border-color:#d0d7de;color:#57606a;}
.share-pop.light .share-close:hover{color:#3b463d;background:rgba(59,70,61,0.12);border-color:#3b463d;}

/* ---- tabs ---- */
.share-tabs{
  display:flex;
  gap:0;
  padding:0 16px;
  margin-top:8px;
  border-bottom:1px solid rgba(255,255,255,0.08);
}
.share-pop.light .share-tabs{border-bottom:1px solid rgba(0,0,0,0.08);}
.share-tab{
  padding:6px 0;
  margin-right:20px;
  font-size:12.5px;
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
  padding:12px 16px 14px 16px;
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

/* ---- responsive: align with MapToolbar's layout convention ----
   The research-map profile uses @media(max-width:767px) and positions the
   search bar at top:10, left:10, right:10. The geocoder pill renders ~60px
   tall on mobile, so its bottom edge is ~70px. MapToolbar sits at top:80
   (10px gap below search). We mirror MapToolbar exactly so the popover's
   top edge aligns with the top of the `+` button.
   right:52 = MapToolbar right(10) + button-width(36) + 6px breathing room. */
@media(max-width:767px){
  .share-pop{
    position:fixed;
    top:120px;
    left:10px;
    right:52px;
    width:auto;
    max-width:none;
    max-height:calc(100vh - 96px);
    overflow-y:auto;
    -webkit-overflow-scrolling:touch;
    z-index:9999;
  }
}
`, 'share-button')

const { t } = useI18n()

const props = defineProps({
  isDark: { type: Boolean, default: false },
  embedPath: { type: String, default: '' }
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
/* The standalone embed page this map is shared/iframed as. Resolution order:
   (1) the `embedPath` prop — the PROFILE owns an ID→URL table and passes the
       active instance's URL (parameterized profiles keyed by active tab id);
   (2) the map's app-profile config (provided by ProfileLoader as
       'profileConfig') via profile-config.shareEmbedPath;
   (3) the research-map page as a final fallback. */
const profileConfig = inject('profileConfig', null)
const embedPath = computed(() =>
  props.embedPath || profileConfig?.value?.shareEmbedPath || '/maps/doxa-research-map.html'
)

const shareUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.origin + embedPath.value
  }
  return 'https://doxa.life' + embedPath.value
})

const embedSnippet = computed(() => {
  const h = sizePresets[embedSize.value].height
  return '<iframe src="' + shareUrl.value + '" width="100%" height="' + h + '" style="border:none; border-radius:12px;" allowfullscreen></iframe>'
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

/* Copy that works EVERYWHERE (Driver bug 2026-07-11: on file:// the button did nothing —
   navigator.clipboard exists only in secure contexts (https/localhost). Fallback: the
   classic hidden-textarea + execCommand path, which insecure contexts still support. */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch { return false }
}

async function copyLink() {
  if (await copyText(shareUrl.value)) {
    linkCopied.value = true
    setTimeout(() => { linkCopied.value = false }, 2000)
  }
}

async function copyEmbed() {
  if (await copyText(embedSnippet.value)) {
    embedCopied.value = true
    setTimeout(() => { embedCopied.value = false }, 2000)
  }
}

/* ---- outside click / escape ---- */
function onClickOutside(e) {
  if (!isOpen.value) return
  const path = e.composedPath ? e.composedPath() : [e.target]
  if (popoverEl.value && path.some(el => el === popoverEl.value)) return
  if (btnEl.value && path.some(el => el === btnEl.value || el === btnEl.value.$el)) return
  /* Only close when the click lands on the bare map canvas — never when the
     user is interacting with the legend, toolbar, search bar, or any other
     overlay UI. This keeps the share menu open across unrelated UI actions. */
  const hitMapCanvas = path.some(el => el?.classList?.contains?.('mapboxgl-canvas'))
  if (!hitMapCanvas) return
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
