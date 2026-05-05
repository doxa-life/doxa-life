<script setup lang="ts">
/**
 * /research/pplr-data-maps — multi-tab embed of the PPLR-validate-data-mfe
 * IIFE (built from Map-Framework/05-apps/PPLR-MAPS/PPLR-validate-data-mfe).
 *
 * Token comes from runtimeConfig.public.mapboxToken (sourced from
 * NUXT_PUBLIC_MAPBOX_TOKEN in .env). NEVER hardcoded — same pattern the
 * other map pages (/pray, /research) use, so GitHub secret-scanning
 * stays happy and tokens rotate via env on the host.
 *
 * Architecture: this page renders the gem-frame chrome + tabs natively
 * in Vue, then injects the iife bundle on mount. The iife defines the
 * <doxa-map> custom element; Vue's createElement-driven slot DOM
 * upgrades automatically once the bundle's customElements.define runs.
 *
 * Static data lives at /assets/data/* (committed in this repo). The
 * iife fetches them at runtime via relative paths; the <base href="/">
 * tag below ensures they resolve from site root, not /research/.
 */
import { onMounted, onBeforeUnmount } from 'vue'

const runtimeConfig = useRuntimeConfig()
const PPLR_TOKEN = (runtimeConfig.public as { mapboxToken?: string }).mapboxToken || ''

useHead({
  title: 'PPLR data maps — Doxa.life',
  base: { href: '/' },  // bundle does fetch('assets/data/...') with relative paths
  link: [
    { rel: 'stylesheet', href: 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css' },
    { rel: 'stylesheet', href: 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css' },
  ],
  script: [
    { src: 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js' },
    { src: 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js' },
    { src: 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js' },
  ],
})

// Slot configuration — each entry becomes one gem-framed <doxa-map>.
// First 5 are primary tabs; rest live under "More ▾". `fixed: true` =
// pinned right-side tab. Add a profile by appending here.
const PPLR_SLOTS = [
  { profile: 'pplr-religion', label: 'Religion', gem: 'tourmaline',
    config: { instanceId: 'pplr-rel-1' } },
  { profile: 'pplr-rop-tree', label: 'ROP Tree', gem: 'citrine',
    config: { instanceId: 'pplr-tree-1' } },
  { profile: 'pplr-language-families', label: 'Language Families', gem: 'aquamarine',
    config: { instanceId: 'pplr-lf-1' } },
  { profile: 'pplr-semantic-trees', label: 'Semantic Trees', gem: 'amethyst',
    config: { instanceId: 'pplr-sem-1' } },
  { profile: 'pplr-translations', label: 'PG Name Locales', gem: 'sapphire',
    config: { instanceId: 'pplr-trans-1' } },
  { profile: 'pplr-d3-tree', label: 'ROP Sunburst (D3)', gem: 'onyx',
    config: { instanceId: 'pplr-d3-1' } },
  { profile: 'pplr-pins', label: 'All PG-in-country pins', gem: 'emerald',
    config: { instanceId: 'pplr-pins-1' } },
  { profile: 'pplr-rosetta-cards', label: 'Cross-system ID Rosetta', gem: 'topaz',
    config: { instanceId: 'pplr-rosetta-1' } },
  { profile: 'pplr-coverage', label: 'Translation coverage matrix', gem: 'amethyst',
    config: { instanceId: 'pplr-cov-1' } },
  { profile: 'pplr-index', label: 'Index', gem: 'sapphire',
    config: { instanceId: 'pplr-index-1' }, fixed: true },
]

let cleanupFns: Array<() => void> = []

onMounted(() => {
  // Globals the slot-rendering JS reads. Set BEFORE injecting the iife.
  ;(window as any).PPLR_TOKEN = PPLR_TOKEN
  ;(window as any).PPLR_SLOTS = PPLR_SLOTS

  setupShowcase()

  // Inject the iife — defines the <doxa-map> custom element. Any pre-built
  // doxa-map placeholders in the showcase upgrade automatically once
  // customElements.define('doxa-map', ...) runs.
  const existing = document.querySelector<HTMLScriptElement>('script[data-pplr-data-maps="1"]')
  if (!existing) {
    const s = document.createElement('script')
    s.src = '/js/pplr-data-maps.iife.js'
    s.async = false
    s.dataset.pplrDataMaps = '1'
    document.head.appendChild(s)
  }
})

onBeforeUnmount(() => {
  cleanupFns.forEach(fn => { try { fn() } catch {} })
  cleanupFns = []
})

// Verbatim port of the slot-rendering JS that lived in the original
// static index.html. Wrapped in a function so it runs on mount, AFTER
// the .topbar / #showcase / #zoomOutBtn elements exist in the DOM.
function setupShowcase() {
  const GEM_PALETTE: Record<string, { name: string; hex: string }> = {
    amethyst:   { name: 'amethyst',   hex: '#9333ea' },
    sapphire:   { name: 'sapphire',   hex: '#2563eb' },
    aquamarine: { name: 'aquamarine', hex: '#0891b2' },
    emerald:    { name: 'emerald',    hex: '#059669' },
    topaz:      { name: 'topaz',      hex: '#d97706' },
    citrine:    { name: 'citrine',    hex: '#ca8a04' },
    tourmaline: { name: 'tourmaline', hex: '#db2777' },
    onyx:       { name: 'onyx',       hex: '#1f2937' }
  }
  const GEM_CYCLE = ['amethyst', 'sapphire', 'aquamarine', 'emerald', 'topaz', 'citrine', 'tourmaline']
  const gemForIndex = (i: number) => GEM_PALETTE[GEM_CYCLE[((i % GEM_CYCLE.length) + GEM_CYCLE.length) % GEM_CYCLE.length]]
  const gemByName   = (n: string) => GEM_PALETTE[n] || GEM_PALETTE.onyx
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '')
    const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h
    return parseInt(f.slice(0, 2), 16) + ', ' + parseInt(f.slice(2, 4), 16) + ', ' + parseInt(f.slice(4, 6), 16)
  }

  const TK = (window as any).PPLR_TOKEN || ''
  const SLOTS: Array<any> = (window as any).PPLR_SLOTS || []
  const topbar   = document.getElementById('pplr-topbar') as HTMLElement
  const showcase = document.getElementById('pplr-showcase') as HTMLElement
  const STORAGE_KEY = 'pplr-data-maps:profile'
  if (!topbar || !showcase) return

  const FIXED_SLOTS    = SLOTS.filter(s => s.fixed)
  const FIXED_PROFILES = [...new Set(FIXED_SLOTS.map(s => s.profile))]
  const NON_FIXED      = SLOTS.filter(s => !s.fixed)
  const PROFILES: string[] = []
  NON_FIXED.forEach(s => { if (!PROFILES.includes(s.profile)) PROFILES.push(s.profile) })
  const PRIMARY_PROFILES   = PROFILES.slice(0, 5)
  const SECONDARY_PROFILES = PROFILES.slice(5)
  const MORE = '__more__'

  const saved = localStorage.getItem(STORAGE_KEY)
  let activeProfile = (saved && (PRIMARY_PROFILES.includes(saved) || FIXED_PROFILES.includes(saved)))
    ? saved : PRIMARY_PROFILES[0]

  function buildTabs() {
    Array.from(topbar.querySelectorAll('.profile-tab')).forEach(el => el.remove())
    const spacer  = topbar.querySelector('.spacer') as HTMLElement
    const zoomBtn = document.getElementById('pplr-zoomOutBtn') as HTMLElement

    PRIMARY_PROFILES.forEach(p => {
      const slot = NON_FIXED.find(s => s.profile === p)
      const btn = document.createElement('button')
      btn.className = 'profile-tab' + (p === activeProfile ? ' active' : '')
      btn.textContent = slot?.label || p.replace(/^pplr-/, '')
      btn.onclick = () => selectProfile(p)
      topbar.insertBefore(btn, spacer)
    })

    if (SECONDARY_PROFILES.length > 0) {
      const btn = document.createElement('button')
      btn.className = 'profile-tab' + (activeProfile === MORE ? ' active' : '')
      btn.textContent = 'More ▾'
      btn.onclick = () => selectProfile(MORE)
      topbar.insertBefore(btn, spacer)
    }

    FIXED_SLOTS.forEach(slot => {
      const p   = slot.profile
      const btn = document.createElement('button')
      btn.className = 'profile-tab' + (p === activeProfile ? ' active' : '')
      btn.textContent = slot.label || p.replace(/^pplr-/, '')
      btn.onclick = () => selectProfile(p)
      topbar.insertBefore(btn, zoomBtn)
    })
  }

  function makeSlotEl(slot: any, i: number) {
    const gem    = slot.gem ? gemByName(slot.gem) : gemForIndex(i)
    const gemRgb = hexToRgb(gem.hex)
    const config = Object.assign({}, slot.config, { profile: slot.profile, tk: TK })

    const el = document.createElement('div')
    el.className = 'gem-frame'
    el.id = 'frame-' + (slot.config?.instanceId || `${slot.profile}-${i}`)
    el.style.setProperty('--gem', gem.hex)
    el.style.setProperty('--gem-rgb', gemRgb)
    el.innerHTML = `
      <svg class="gem-bevel-svg" xmlns="http://www.w3.org/2000/svg">
        <line/><line/><line/><line/>
      </svg>
      <div class="gem-frame-content">
        <div class="gem-header">
          <span class="label">${slot.label}</span>
          <span class="gem-tag">${gem.name}</span>
          <span class="gem-index">#${i + 1}</span>
          <button class="gem-fs-btn" type="button" title="Fullscreen this gem (Esc to exit)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M4 9V4H9M15 4H20V9M20 15V20H15M9 20H4V15"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="gem-slot">
          <doxa-map profile-config='${JSON.stringify(config).replace(/'/g, '&#39;')}'></doxa-map>
        </div>
      </div>`
    const fsBtn = el.querySelector('.gem-fs-btn') as HTMLElement
    fsBtn?.addEventListener('click', () => {
      if (document.fullscreenElement === el) (document as any).exitFullscreen?.()
      else (el as any).requestFullscreen?.()
    })
    return el
  }

  function renderActive() {
    showcase.innerHTML = ''
    const isMore = activeProfile === MORE
    const slots  = isMore
      ? SLOTS.filter(s => SECONDARY_PROFILES.includes(s.profile))
      : SLOTS.filter(s => s.profile === activeProfile)

    showcase.classList.toggle('more-grid', isMore)
    slots.forEach((slot, i) => showcase.appendChild(makeSlotEl(slot, i)))
    requestAnimationFrame(updateBevels)
  }

  function updateBevels() {
    document.querySelectorAll('.gem-frame').forEach(frame => {
      const f = frame as HTMLElement
      const svg = f.querySelector('.gem-bevel-svg')
      if (!svg) return
      const w = f.offsetWidth, h = f.offsetHeight
      if (!w || !h) return
      const fw = parseInt(getComputedStyle(f).paddingTop) || 14
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
      svg.setAttribute('width', String(w))
      svg.setAttribute('height', String(h))
      const ls = svg.querySelectorAll('line')
      if (ls.length < 4) return
      ls[0].setAttribute('x1', '0'); ls[0].setAttribute('y1', '0'); ls[0].setAttribute('x2', String(fw)); ls[0].setAttribute('y2', String(fw))
      ls[1].setAttribute('x1', String(w)); ls[1].setAttribute('y1', '0'); ls[1].setAttribute('x2', String(w - fw)); ls[1].setAttribute('y2', String(fw))
      ls[2].setAttribute('x1', '0'); ls[2].setAttribute('y1', String(h)); ls[2].setAttribute('x2', String(fw)); ls[2].setAttribute('y2', String(h - fw))
      ls[3].setAttribute('x1', String(w)); ls[3].setAttribute('y1', String(h)); ls[3].setAttribute('x2', String(w - fw)); ls[3].setAttribute('y2', String(h - fw))
    })
  }
  const ro = new ResizeObserver(updateBevels)
  ro.observe(showcase)
  const onResize = () => updateBevels()
  window.addEventListener('resize', onResize)
  cleanupFns.push(() => ro.disconnect(), () => window.removeEventListener('resize', onResize))

  function selectProfile(p: string) {
    if (p === activeProfile) return
    activeProfile = p
    if (p !== MORE) localStorage.setItem(STORAGE_KEY, p)
    buildTabs()
    showcase.innerHTML = `
      <div class="reload-bridge" role="status" aria-live="polite">
        <svg class="reload-globe" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <radialGradient id="rb-grad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stop-color="#92b195" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="#3b463d" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="32" cy="32" r="26" fill="url(#rb-grad)" />
          <circle cx="32" cy="32" r="26" fill="none" stroke="#73A17F" stroke-width="2"/>
          <ellipse cx="32" cy="32" rx="26" ry="10" fill="none" stroke="#73A17F" stroke-width="1.4" opacity="0.7"/>
          <ellipse cx="32" cy="32" rx="14" ry="26" fill="none" stroke="#73A17F" stroke-width="1.4" opacity="0.7"/>
          <line x1="6" y1="32" x2="58" y2="32" stroke="#73A17F" stroke-width="1.2" opacity="0.45"/>
          <line x1="32" y1="6" x2="32" y2="58" stroke="#73A17F" stroke-width="1.2" opacity="0.45"/>
        </svg>
        <span class="reload-text">Reloading map</span>
      </div>`
    requestAnimationFrame(() => requestAnimationFrame(() => renderActive()))
  }

  ;(window as any).pplrToggleZoomOut = function () {
    const on = document.body.classList.toggle('zoom-out-all')
    document.getElementById('pplr-zoomOutBtn')?.classList.toggle('active', on)
    requestAnimationFrame(updateBevels)
    setTimeout(() => window.dispatchEvent(new Event('resize')), 350)
  }
  cleanupFns.push(() => { delete (window as any).pplrToggleZoomOut; document.body.classList.remove('zoom-out-all') })

  buildTabs()
  renderActive()

  const onSelectProfile = (e: Event) => {
    const p = (e as CustomEvent).detail?.profile
    if (p && (PROFILES.includes(p) || FIXED_PROFILES.includes(p))) selectProfile(p)
  }
  window.addEventListener('pplr-select-profile', onSelectProfile)
  cleanupFns.push(() => window.removeEventListener('pplr-select-profile', onSelectProfile))
}
</script>

<template>
  <div class="pplr-data-maps-page">
    <div class="hero">
      <h1>PPLR data maps</h1>
      <p>Many small displays — each one answers one validation question about the PPLR people-group data.
         Source: 6 parquets from the PPLR ArcGIS FeatureServer · 48,174 PG records · 17 locales.</p>
    </div>

    <header class="topbar" id="pplr-topbar">
      <div class="spacer" />
      <button class="overview-btn" id="pplr-zoomOutBtn"
              title="Zoom out so every slot is visible at once"
              @click="(window as any).pplrToggleZoomOut?.()">Overview</button>
    </header>

    <div id="pplr-showcase" />
  </div>
</template>

<style>
/* Unscoped on purpose: the iife creates .gem-frame elements via createElement
   so Vue's scoped-style attribute would never reach them. All selectors are
   prefixed under .pplr-data-maps-page or scoped to the dynamically-created
   gem-frame subtree to avoid colliding with the rest of doxa-life. */

.pplr-data-maps-page { background: #0b0f14; color: #e5e7eb; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
.pplr-data-maps-page * , .pplr-data-maps-page *::before, .pplr-data-maps-page *::after { box-sizing: border-box; }

.pplr-data-maps-page .hero { position: relative; padding: 28px 16px 18px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.pplr-data-maps-page .hero h1 { font-size: 22px; font-weight: 500; color: #60a5fa; letter-spacing: 0.02em; margin: 0; }
.pplr-data-maps-page .hero p  { font-size: 12px; color: #94a3b8; max-width: 720px; line-height: 1.6; margin: 0; }

.pplr-data-maps-page .topbar { position: sticky; top: 0; z-index: 100; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px 16px; background: #111827; border-bottom: 1px solid #1f2937; }
.pplr-data-maps-page .topbar .spacer { flex: 1; }
.pplr-data-maps-page .profile-tab,
.pplr-data-maps-page .overview-btn { padding: 8px 14px; background: transparent; border: 1px solid #334155; color: #94a3b8; font: 700 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; transition: border-color .15s, color .15s, background .15s; }
.pplr-data-maps-page .profile-tab:hover,
.pplr-data-maps-page .overview-btn:hover { border-color: #64748b; color: #e5e7eb; }
.pplr-data-maps-page .profile-tab.active,
.pplr-data-maps-page .overview-btn.active { border-color: #60a5fa; color: #60a5fa; background: rgba(96,165,250,.08); }

.pplr-data-maps-page #pplr-showcase { display: flex; flex-direction: column; gap: 24px; padding: 20px; max-width: 1500px; margin: 0 auto; }

.pplr-data-maps-page .gem-frame { --fw: 14px; --gem: #39ff80; --gem-rgb: 57, 255, 128; position: relative; padding: var(--fw); background: #1a2420; border: 2px solid var(--gem); box-shadow: 0 0 20px rgba(var(--gem-rgb), .12), inset 0 0 20px rgba(var(--gem-rgb), .04); transition: box-shadow .3s, transform .4s cubic-bezier(.22, 1, .36, 1); isolation: isolate; }
.pplr-data-maps-page .gem-frame:hover { box-shadow: 0 0 35px rgba(var(--gem-rgb), .2), inset 0 0 30px rgba(var(--gem-rgb), .06); }
.pplr-data-maps-page .gem-frame-content { border: 2px solid var(--gem); overflow: hidden; background: #142118; }
.pplr-data-maps-page .gem-bevel-svg { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 2; pointer-events: none; overflow: visible; }
.pplr-data-maps-page .gem-bevel-svg line { stroke: var(--gem); stroke-width: 1.5; opacity: .7; }
.pplr-data-maps-page .gem-frame:hover .gem-bevel-svg line { opacity: 1; }
.pplr-data-maps-page .gem-header { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(var(--gem-rgb), .04); border-bottom: 2px solid var(--gem); }
.pplr-data-maps-page .gem-header .label { font: 800 13px/1 ui-monospace, SFMono-Regular, Menlo, monospace; text-transform: uppercase; letter-spacing: .08em; color: #fff; }
.pplr-data-maps-page .gem-tag { display: inline-block; padding: 2px 8px; font: 10px/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--gem); background: rgba(var(--gem-rgb), .08); border: 1px solid var(--gem); border-radius: 999px; }
.pplr-data-maps-page .gem-index { margin-left: auto; font: 10px/1 ui-monospace, monospace; color: #64748b; letter-spacing: .1em; }
.pplr-data-maps-page .gem-fs-btn { background: transparent; border: 1px solid #30363d; border-radius: 6px; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; color: #8b949e; cursor: pointer; margin-left: 8px; transition: color .12s, border-color .12s, background .12s; }
.pplr-data-maps-page .gem-fs-btn:hover { color: #c9d1d9; border-color: #73A17F; background: rgba(115,161,127,0.08); }
.pplr-data-maps-page .gem-fs-btn svg { display: block; }
.pplr-data-maps-page .gem-slot { position: relative; width: 100%; aspect-ratio: 16 / 9; }
.pplr-data-maps-page .gem-frame:fullscreen,
.pplr-data-maps-page .gem-frame:-webkit-full-screen { width: 100vw; height: 100vh; background: #0d1117; padding: 0; border: none; }
.pplr-data-maps-page .gem-frame:fullscreen .gem-frame-content,
.pplr-data-maps-page .gem-frame:-webkit-full-screen .gem-frame-content { width: 100%; height: 100%; display: flex; flex-direction: column; }
.pplr-data-maps-page .gem-frame:fullscreen .gem-slot,
.pplr-data-maps-page .gem-frame:-webkit-full-screen .gem-slot { aspect-ratio: auto; flex: 1; min-height: 0; }
.pplr-data-maps-page .gem-frame:fullscreen .gem-bevel-svg,
.pplr-data-maps-page .gem-frame:-webkit-full-screen .gem-bevel-svg { display: none; }
@media (max-width: 768px) {
  .pplr-data-maps-page .gem-slot { aspect-ratio: 9 / 19.5; min-height: 70vh; }
}
.pplr-data-maps-page doxa-map { display: block; position: absolute; inset: 0; width: 100%; height: 100%; }
.pplr-data-maps-page doxa-map:fullscreen,
.pplr-data-maps-page doxa-map:-webkit-full-screen { position: fixed; inset: 0; width: 100vw; height: 100vh; }

body.zoom-out-all .pplr-data-maps-page #pplr-showcase { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
body.zoom-out-all .pplr-data-maps-page .gem-slot { aspect-ratio: 1 / 1; }
body.zoom-out-all .pplr-data-maps-page .gem-frame { --fw: 10px; }
body.zoom-out-all .pplr-data-maps-page .gem-header { padding: 5px 8px; }
body.zoom-out-all .pplr-data-maps-page .gem-header .label { font-size: 10px; letter-spacing: .06em; }
body.zoom-out-all .pplr-data-maps-page .gem-tag { font-size: 9px; padding: 1px 6px; }

.pplr-data-maps-page #pplr-showcase.more-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
.pplr-data-maps-page #pplr-showcase.more-grid .gem-slot { aspect-ratio: 16 / 9; }

.pplr-data-maps-page .reload-bridge { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; width: 100%; min-height: 60vh; color: #c9d1d9; font: 600 12px ui-monospace, monospace; letter-spacing: 0.08em; text-transform: uppercase; }
.pplr-data-maps-page .reload-globe { width: 64px; height: 64px; animation: pplr-reload-spin 1.6s linear infinite; filter: drop-shadow(0 4px 14px rgba(115,161,127,0.35)); }
@keyframes pplr-reload-spin { to { transform: rotate(360deg); } }
.pplr-data-maps-page .reload-text { color: #73A17F; opacity: 0.85; }
</style>
