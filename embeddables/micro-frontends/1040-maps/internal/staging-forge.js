/**
 * staging-forge.js — the ONE-PAGE semantic staging environment (root + bundle pages).
 *
 * Driver design brief (2026-07-11, the merger of all prior staging files):
 *   - ONE page. No folder-hopping: the semantic tree IS the navigation.
 *   - Desktop: hierarchical tree SIDEBAR on the left (bundle → profile → instance,
 *     kind-badged, "where do I edit" hints) · selected map fills the stage on the right.
 *   - Mobile: tree on top, map below — scroll down to the map. Native responsive,
 *     no simulator toggle.
 *   - Token UX: resolve ?tk= → localStorage → none. If none, show a token bar
 *     (paste once, stored locally in the browser, never in files/links unless you
 *     use ?tk= on purpose). Maps must Just Work after one paste.
 *   - Auto-generated: whatever app-profiles exist, the tree detects and shows them.
 *
 * file:// contract: classic script, manifest inlined at build (window.FORGE.manifest),
 * fetch only as dev fallback. No import/export. The DEV-HMR block at the bottom is
 * stripped by generate-tree.mjs for built pages.
 */

/* global window, document */
const FORGE = window.FORGE || {}
const SCOPE = FORGE.scope || 'root'
const MODE = FORGE.mode || 'built'
const MANIFEST_URL = FORGE.manifestUrl || './manifest.json'
const HREF_BASE = FORGE.hrefBase || './'

const GEMS = ['#46d4ff', '#b9a6f5', '#ffc24b', '#5ee0a0', '#f97fb5', '#8ef0e4']
const $ = (sel) => document.querySelector(sel)

let tree = null
let flat = []          // flat list of selectable map nodes (profiles + instances)
let activeKey = null   // selected node key

// ── Token resolution (Driver ladder: ?tk= → localStorage → ask once) ─────────
const TK_STORE = 'MAPS_STAGING_TK'
function resolveToken() {
  const qp = new URLSearchParams(location.search).get('tk')
  if (qp) { try { localStorage.setItem(TK_STORE, qp) } catch (e) {} return qp }
  try { return localStorage.getItem(TK_STORE) || '' } catch (e) { return '' }
}
let TK = resolveToken()

function withTk(href) {
  if (!TK) return href
  return href + (href.includes('?') ? '&' : '?') + 'tk=' + encodeURIComponent(TK)
}

// ── Load the semantic tree (inline-first; fetch = dev fallback) ──────────────
async function loadTree() {
  if (FORGE.manifest) return FORGE.manifest
  const res = await fetch(MANIFEST_URL, { cache: 'no-cache' })
  if (!res.ok) throw new Error('manifest ' + res.status + ' from ' + MANIFEST_URL)
  return res.json()
}

const treeHref = (rel) => HREF_BASE + rel
const hexRgb = (hex) => {
  const h = hex.replace('#', '')
  return parseInt(h.slice(0,2),16) + ',' + parseInt(h.slice(2,4),16) + ',' + parseInt(h.slice(4,6),16)
}

function profileKind(p) {
  if (Array.isArray(p.instances) && p.instances.length) return 'parameterized'
  if (p.nested || /nested|tabs|web components/i.test(p.description || '')) return 'nested'
  return 'individual'
}

// ── Build the flat selectable list + the sidebar tree ────────────────────────
// Selectable = anything that renders as ONE map page: individual/nested profiles
// and each instance of a parameterized profile.
function buildFlat() {
  flat = []
  ;(tree.bundles || []).forEach((b, bi) => { b.__gem = GEMS[bi % GEMS.length] })
  for (const b of tree.bundles || []) {
    for (const p of b.profiles || []) {
      const kind = profileKind(p)
      if (kind === 'parameterized') {
        for (const inst of p.instances) {
          flat.push({
            key: b.bundle + '/' + p.profile + '/' + inst.id,
            kind: 'instance', label: inst.title || inst.id,
            sub: p.profile + ' · preset "' + inst.id + '"',
            edit: b.bundle + '/' + p.profile + '.instances.json',
            href: treeHref(b.bundle + '/' + p.profile + '/' + inst.id + '/index.html'),
            bundle: b.bundle, element: p.element || (b.elements || [])[0], gem: b.__gem,
          })
        }
      } else {
        flat.push({
          key: b.bundle + '/' + p.profile,
          kind: kind === 'nested' ? 'nested' : 'profile',
          label: p.profile,
          sub: p.description || (kind === 'nested' ? 'embeds child web components' : 'one web component = one map'),
          edit: 'app-profiles/' + b.bundle + '/' + (p.file || p.profile + '.vue'),
          href: treeHref(b.bundle + '/' + p.profile + '/index.html'),
          bundle: b.bundle, element: p.element || (b.elements || [])[0], gem: b.__gem,
        })
      }
    }
  }
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

// Sidebar: bundles are <details> groups (open by default), each map node a row.
function renderSidebar() {
  const el = $('#treeNav')
  if (!el) return
  const parts = []
  const bundles = tree.bundles || []
  bundles.forEach((b, bi) => {
    const gem = b.__gem || GEMS[bi % GEMS.length]
    const rows = flat.filter((n) => n.bundle === b.bundle).map((n) => `
      <button class="node k-${n.kind}${n.key === activeKey ? ' active' : ''}" data-key="${esc(n.key)}" style="--gem:${gem}">
        <span class="nlabel">${esc(n.label)}</span>
        <span class="nsub">${esc(n.sub)}</span>
        <code class="nedit">${esc(n.edit)}</code>
      </button>`).join('')
    parts.push(`
      <details class="bgroup" open style="--gem:${gem}">
        <summary><span class="bdot"></span>${esc(b.bundle)}
          <span class="bmeta">${(b.profiles || []).length} profile${(b.profiles || []).length === 1 ? '' : 's'} · one .js</span>
        </summary>
        ${rows}
      </details>`)
  })
  el.innerHTML = parts.join('') || '<p class="empty">no bundles built yet</p>'
  el.querySelectorAll('.node').forEach((btn) =>
    btn.addEventListener('click', () => select(btn.dataset.key)))
}

// ── Stage: the ONE live map (iframe of the node's self-contained page) ───────
function renderStage() {
  const st = $('#stage')
  if (!st) return
  const nd = flat.find((n) => n.key === activeKey) || flat[0]
  if (!nd) { st.innerHTML = '<p class="empty">no maps in this tree</p>'; return }
  activeKey = nd.key
  const gem = nd.gem || '#46d4ff'
  st.style.setProperty('--gem', gem)
  st.style.setProperty('--gem-rgb', hexRgb(gem))
  st.innerHTML = `
    <div class="stage-head">
      <span class="sctag">&lt;${esc(nd.element || nd.label)}&gt;</span>
      <span class="sckind">${esc(nd.kind)}</span>
      <a class="popout" href="${esc(withTk(nd.href))}" target="_blank" rel="noopener">open ↗</a>
    </div>
    <div class="map-slot"><iframe allowfullscreen src="${esc(withTk(nd.href))}"></iframe></div>`
  // keep the sidebar highlight in sync
  document.querySelectorAll('#treeNav .node').forEach((b) =>
    b.classList.toggle('active', b.dataset.key === activeKey))
}

function select(key) {
  activeKey = key
  renderStage()
  // Mobile: after picking from the tree, bring the map into view (scroll down to it).
  if (window.matchMedia('(max-width: 899px)').matches) {
    $('#stage')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// ── Token bar: shown only while no token resolves; paste once, stored locally ─
function renderTokenBar() {
  const bar = $('#tokenBar')
  if (!bar) return
  if (TK) { bar.classList.add('hidden'); return }
  bar.classList.remove('hidden')
  bar.innerHTML = `
    <span>maps need a Mapbox token —</span>
    <input id="tkInput" type="password" placeholder="paste pk.… (stays in this browser only)" autocomplete="off" />
    <button id="tkSave">use it</button>`
  $('#tkSave').addEventListener('click', () => {
    const v = $('#tkInput').value.trim()
    if (!v) return
    TK = v
    try { localStorage.setItem(TK_STORE, v) } catch (e) {}
    bar.classList.add('hidden')
    renderStage()
  })
}

// ── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  const info = $('#frameInfo')
  try {
    tree = await loadTree()
    buildFlat()
    if (info) {
      info.innerHTML = '<span class="pat">semantic tree</span> — '
        + (tree.bundles || []).length + ' bundle(s) · ' + flat.length + ' map(s) · '
        + '<strong>' + esc(MODE) + '</strong>'
    }
    renderSidebar()
    renderTokenBar()
    if (flat.length) { activeKey = flat[0].key; renderStage() }
  } catch (e) {
    if (info) info.innerHTML = '<span class="err">failed to load semantic tree: ' + esc(e.message) + '</span>'
  }
}

boot()

/* DEV-HMR-START (stripped from built pages by generate-tree.mjs — import.meta is a
   parse error in the classic <script> the build inlines) */
if (import.meta && import.meta.hot) import.meta.hot.accept(() => location.reload())
/* DEV-HMR-END */
