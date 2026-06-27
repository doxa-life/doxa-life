// staging.js — 1040-maps "Map Forge" staging showcase (dev only, no build step).
//
// loc-006. UX (per coder): the header showcases the single-build-process architecture (one
// shared core → one build → JS bundles → element tags → maps). A horizontal-scroll strip lists
// every JS bundle and the element tags it ships. Click a bundle → its profiles render as live
// GEM-FRAME maps below, and the WHOLE PAGE scrolls (nothing frozen over the maps). Design
// inspiration: the deprecated "Sovereign Map Forge" at
//   FARFAST10-nameless-exploits/Map-Framework/1040-maps/ — we keep its gem-frame showcase and
// PORT its WebGL-context discipline, but write fresh code.
//
// MAP MOUNT: the map's custom element is mounted DIRECTLY in this page (no iframe). index.html
// loads the Mapbox peer once; importing a bundle's index.js registers its custom element, then we
// drop a <tag profile-config> into the gem frame. (We do NOT iframe the map: Mapbox checks the
// map container with `instanceof HTMLElement`, which fails across realms — an iframe's element is
// not the parent realm's HTMLElement — so an iframe + reused parent Mapbox throws "container must
// be a String or HTMLElement". Same-page mounting keeps one realm and Just Works.)
//
// WebGL guard: tiles start as placeholders; an IntersectionObserver mounts a tile's map only when
// it scrolls into view and tears it down when it leaves; a hard MAX_LIVE cap LRU-evicts the
// oldest off-screen map; on eviction we force-lose each canvas's GL context (browsers cap WebGL
// contexts at ~8–16).
//
// LOCALIZATION: the language switch lives at the TOP (not on the maps). It sets the chosen
// language on every map as the `locale` PROP (profile-config.locale) and re-mounts.

// ── Discovery ───────────────────────────────────────────────────────────────────────────────
const indexRaw      = import.meta.glob('/app-profiles/*/index.js', { query: '?raw', import: 'default', eager: true })
const htmlRaw       = import.meta.glob('/app-profiles/*/index.html', { query: '?raw', import: 'default', eager: true })
const bundleLoaders = import.meta.glob('/app-profiles/*/index.js')   // lazy: importing registers the element
const profileFiles  = import.meta.glob('/app-profiles/*/*.vue')

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
const nameOf = (p) => p.split('/app-profiles/')[1].split('/')[0]

function tagsOf(src) {
  const re = /customElements\.define\(\s*['"]([^'"]+)['"]/g
  const out = []; let m
  while ((m = re.exec(typeof src === 'string' ? src : ''))) out.push(m[1])
  return out
}
function discover() {
  const byBundle = {}
  for (const [path, src] of Object.entries(indexRaw)) {
    const name = nameOf(path)
    byBundle[name] = { name, tags: tagsOf(src), tag: tagsOf(src)[0] || '', profiles: [], html: '' }
  }
  for (const [path, html] of Object.entries(htmlRaw)) {
    const name = nameOf(path)
    ;(byBundle[name] = byBundle[name] || { name, tags: [], tag: '', profiles: [], html: '' }).html = (typeof html === 'string' ? html : '')
  }
  for (const path of Object.keys(profileFiles)) {
    const name = nameOf(path)
    const file = path.split('/').pop().replace(/\.vue$/, '')
    ;(byBundle[name] = byBundle[name] || { name, tags: [], tag: '', profiles: [], html: '' }).profiles.push(file)
  }
  return Object.values(byBundle)
    .map((b) => ({ ...b, profiles: b.profiles.sort() }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ── Slots: how many distinct MAPS a bundle exposes ──────────────────────────────────────────
// A bundle's index.html declares its maps as `window.DOXA_SLOTS` (or static profile-config
// attrs). Parameterized bundles (e.g. doxa-simple-map) list ONE profile with several configs —
// Prayer / Adoption / Engagement — each a distinct map. Other bundles list several dev copies
// of the SAME map that differ only by instanceId (e.g. doxa-research-map's 3 demo instances) —
// those collapse to one. We parse the slots, then dedupe by config-minus-instanceId so distinct
// parameterizations are kept but duplicate instances are not.
function matchBracket(s, start) {
  let depth = 0, inStr = null
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (inStr) { if (c === inStr && s[i - 1] !== '\\') inStr = null; continue }
    if (c === "'" || c === '"' || c === '`') { inStr = c; continue }
    if (c === '[') depth++; else if (c === ']') { depth--; if (depth === 0) return s.slice(start, i + 1) }
  }
  return s.slice(start)
}
function rawSlots(b) {
  const html = b.html || ''
  const m = html.match(/window\.\w*SLOTS\s*=\s*\[/)
  if (m) {
    try {
      const arr = (new Function('return (' + matchBracket(html, html.indexOf('[', m.index)) + ')'))()
      if (Array.isArray(arr) && arr.length) return arr.map((s) => ({ profile: s.profile, label: s.label || s.profile, config: s.config || {} }))
    } catch (_) {}
  }
  const out = []
  const re = /profile-config\s*=\s*'([^']*)'/gi; let mm
  while ((mm = re.exec(html))) { try { const c = JSON.parse(mm[1]); if (c && c.profile) out.push({ profile: c.profile, label: c.profile, config: c }) } catch (_) {} }
  if (out.length) return out
  return (b.profiles.length ? b.profiles : ['(default)']).map((p) => ({ profile: p, label: p, config: {} }))
}
function slotsFor(b) {
  const seen = new Set(), out = []
  for (const s of rawSlots(b)) {
    const { instanceId, ...rest } = s.config || {}      // ignore instanceId when judging "distinct"
    const sig = s.profile + '|' + JSON.stringify(rest)
    if (seen.has(sig)) continue
    seen.add(sig); out.push(s)
  }
  return out
}

// Import (once, cached) a bundle's index.js so its custom element is registered.
const imported = {}
function loadBundle(name) {
  if (!imported[name]) {
    const key = Object.keys(bundleLoaders).find((k) => k.includes('/app-profiles/' + name + '/index.js'))
    imported[name] = key ? bundleLoaders[key]() : Promise.reject(new Error('bundle loader not found: ' + name))
  }
  return imported[name]
}

// ── Language ──────────────────────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'es', name: 'Español' }, { code: 'fr', name: 'Français' },
  { code: 'pt', name: 'Português' }, { code: 'ar', name: 'العربية' }, { code: 'ru', name: 'Русский' }
]
const LOCALE_KEY = '1040-maps:staging:locale'
const ACTIVE_KEY = '1040-maps:staging:bundle'
let currentLocale = localStorage.getItem(LOCALE_KEY) || 'en'
let activeBundle  = localStorage.getItem(ACTIVE_KEY) || ''

const GEMS = ['#46d4ff', '#b9a6f5', '#5ee0a0', '#ffc24b', '#f472b6', '#f59e0b', '#34d399']
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) }

function slotConfig(slot) {
  const cfg = Object.assign({ profile: slot.profile, tk: TOKEN, dataSource: 'pray-tools' }, slot.config || {})
  if (!cfg.instanceId) cfg.instanceId = 'stg-' + slot.profile + '-' + String(slot.label || '').replace(/\W+/g, '')
  if (currentLocale && currentLocale !== 'en') cfg.locale = currentLocale
  return cfg
}

// ── WebGL guard ───────────────────────────────────────────────────────────────────────────────
const MAX_LIVE = 4
const liveTiles = []
function loseGL(root) {
  if (!root) return
  root.querySelectorAll('canvas').forEach((c) => {
    for (const t of ['webgl2', 'webgl', 'experimental-webgl']) {
      let gl; try { gl = c.getContext(t) } catch (_) { gl = null }
      if (gl) { const e = gl.getExtension('WEBGL_lose_context'); if (e) { try { e.loseContext() } catch (_) {} } }
    }
  })
}
function evictSlot(slot) {
  if (!slot || !slot.__mounted) return
  const el = slot.firstElementChild
  if (el && el.shadowRoot) loseGL(el.shadowRoot)
  slot.innerHTML = '<div class="tile-loading">map paused — scroll to view</div>'
  slot.__mounted = false
  const i = liveTiles.indexOf(slot); if (i !== -1) liveTiles.splice(i, 1)
}
async function mountSlot(slot) {
  if (!slot || slot.__mounted || !slot.__mountFn) return
  while (liveTiles.length >= MAX_LIVE) {
    const victim = liveTiles.find((s) => !s.__visible && s !== slot) || liveTiles.find((s) => s !== slot)
    if (!victim) break
    evictSlot(victim)
  }
  slot.__mounted = true
  liveTiles.push(slot)
  try {
    const el = await slot.__mountFn()
    if (!slot.__mounted) return            // evicted while the bundle was importing
    slot.innerHTML = ''; slot.appendChild(el)
  } catch (e) {
    slot.__mounted = false
    const i = liveTiles.indexOf(slot); if (i !== -1) liveTiles.splice(i, 1)
    slot.innerHTML = '<div class="tile-error">⚠ ' + (e && e.message ? e.message : String(e)) + '</div>'
  }
}
const observer = ('IntersectionObserver' in window)
  ? new IntersectionObserver((entries) => entries.forEach((en) => {
      en.target.__visible = en.isIntersecting
      if (en.isIntersecting) mountSlot(en.target); else evictSlot(en.target)
    }), { rootMargin: '400px 0px', threshold: 0.01 })
  : null

// ── Tiles + chrome ──────────────────────────────────────────────────────────────────────────
function buildTile(b, sl, gem) {
  const tile = document.createElement('section')
  tile.className = 'tile'
  tile.style.setProperty('--gem', gem); tile.style.setProperty('--gem-rgb', hexRgb(gem))
  const showLabel = sl.label && sl.label !== sl.profile
  tile.innerHTML =
    '<div class="tile-header"><span class="sctag">&lt;' + (b.tag || '??') + '&gt;</span>'
    + '<span class="sckind">' + (showLabel ? sl.label : 'profile = "' + sl.profile + '"') + '</span>'
    + '<span class="idx">' + b.name + '.js' + (currentLocale !== 'en' ? ' · ' + currentLocale : '') + '</span></div>'
    + '<div class="map-slot"><div class="tile-loading">scroll to load…</div></div>'
  const slot = tile.querySelector('.map-slot')
  if (!b.tag) { slot.innerHTML = '<div class="tile-error">⚠ no custom-element tag found in index.js</div>'; return tile }
  slot.__mountFn = async () => {
    await loadBundle(b.name)                       // register the custom element (once, cached)
    const el = document.createElement(b.tag)
    el.setAttribute('profile-config', JSON.stringify(slotConfig(sl)))
    return el
  }
  if (observer) observer.observe(slot); else mountSlot(slot)
  return tile
}
function teardown() {
  liveTiles.slice().forEach(evictSlot); liveTiles.length = 0
  const sc = document.getElementById('showcase')
  if (observer) sc.querySelectorAll('.map-slot').forEach((s) => { try { observer.unobserve(s) } catch (_) {} })
  sc.innerHTML = ''
}

function renderLangBar() {
  const bar = document.getElementById('langbar'); if (!bar) return
  bar.innerHTML = '<label for="lang-select">Language — passed to every map as a <code>locale</code> prop:</label>'
    + '<select id="lang-select">'
    + LANGUAGES.map((l) => '<option value="' + l.code + '"' + (l.code === currentLocale ? ' selected' : '') + '>' + l.name + '</option>').join('')
    + '</select>'
  bar.querySelector('#lang-select').addEventListener('change', (e) => {
    currentLocale = e.target.value; localStorage.setItem(LOCALE_KEY, currentLocale); renderShowcase()
  })
}
function renderTabs(bundles) {
  const tabsEl = document.getElementById('bundleTabs'); if (!tabsEl) return
  tabsEl.innerHTML = bundles.map((b, i) => {
    const tags = (b.tags.length ? b.tags : ['??']).map((t) => '<span class="etag">&lt;' + t + '&gt;</span>').join('')
    const n = slotsFor(b).length || 1
    return '<button class="btab' + (b.name === activeBundle ? ' active' : '') + '" data-name="' + b.name + '" style="--gem:' + GEMS[i % GEMS.length] + '">'
      + '<span class="bname"><span class="dot"></span>' + b.name + '</span>'
      + '<span class="btags">' + tags + '</span>'
      + '<span class="bfile">' + b.name + '.js · ' + n + ' map' + (n === 1 ? '' : 's') + '</span></button>'
  }).join('')
  tabsEl.querySelectorAll('.btab').forEach((btn) => btn.addEventListener('click', () => select(btn.getAttribute('data-name'))))
}
function renderShowcase() {
  teardown()
  const bundles = discover()
  const i = bundles.findIndex((x) => x.name === activeBundle)
  const b = bundles[i]
  const sc = document.getElementById('showcase')
  if (!b) { sc.innerHTML = '<p class="empty">Pick a JS bundle above to see its maps.</p>'; return }
  const gem = GEMS[i % GEMS.length]
  slotsFor(b).forEach((sl) => sc.appendChild(buildTile(b, sl, gem)))
}
function select(name) {
  activeBundle = name; localStorage.setItem(ACTIVE_KEY, name)
  document.querySelectorAll('#bundleTabs .btab').forEach((btn) => btn.classList.toggle('active', btn.getAttribute('data-name') === name))
  window.scrollTo({ top: 0 })
  renderShowcase()
}
function render() {
  const bundles = discover()
  if (!bundles.some((b) => b.name === activeBundle)) activeBundle = bundles[0]?.name || ''
  const count = document.getElementById('count')
  if (count) {
    const totalMaps = bundles.reduce((n, b) => n + Math.max(slotsFor(b).length, 1), 0)
    count.textContent = bundles.length + ' JS bundle(s), ' + totalMaps + ' map(s) — scroll the strip, click a bundle'
  }
  renderLangBar(); renderTabs(bundles); renderShowcase()
}

render()
if (import.meta.hot) import.meta.hot.accept(() => render())
