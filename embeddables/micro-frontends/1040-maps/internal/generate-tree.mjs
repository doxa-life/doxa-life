#!/usr/bin/env node
/**
 * generate-tree.mjs — build the self-contained doxa-maps/ output tree.
 *
 * Runs AFTER the per-bundle vite builds (which emit app/doxa-maps/<bundle>/<bundle>.js).
 * It scans app-profiles/<bundle>/*.vue, pulls the OPTIONAL JSDoc header tags from the
 * top of each profile, reads the custom-element tag(s) each bundle registers in its
 * index.js, then WRITES, into the doxa-maps/ tree:
 *
 *   doxa-maps/
 *     index.html              ← staging root: every bundle, tab strip, links out
 *     manifest.json           ← machine-readable index of all bundles + profiles
 *     <bundle>/
 *       <bundle>.js           ← the IIFE bundle (already emitted by vite)
 *       index.html            ← bundle staging: lists this bundle's profiles
 *       <profile>/
 *         index.html          ← standalone embeddable profile page
 *
 * Every generated HTML page is SELF-CONTAINED: no fetch() for the manifest, no
 * dev-server staging.js dependency. The bundle list + profile list are inlined at
 * build time. The profile page loads Mapbox CDN + the parent bundle IIFE and mounts
 * the web component; the Mapbox token is fetched at runtime from window.MAP_TOKEN_URL
 * (configured via tokenUrl in vite.1040-maps-build-config.json).
 *
 * Destinations & name: both come from vite.1040-maps-build-config.json — `name` sets the output
 * folder name (default "doxa-maps", independent of this bundler folder's own name),
 * `paths` lists extra folders to copy the whole tree into. The tree is always written
 * to ./app/<name>/ plus <path>/<name>/ for every entry in `paths`.
 *
 * Run standalone:  bun generate-tree.mjs    (expects vite build already ran)
 * Wired into:      bun run build            (runs after the per-bundle vite builds)
 */
import {
  readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync,
  cpSync, rmSync,
} from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_PROFILES = resolve(__dirname, '..', 'app-profiles')
// The single build-config for this bundler (name, paths, embedBaseUrl, tokenUrl).
const BUILD_CONFIG_FILE = resolve(__dirname, '..', 'vite.1040-maps-build-config.json')
const SOURCES = resolve(__dirname, '..', 'library/api/sources.json')

// The single build-config (vite.1040-maps-build-config.json): `name` = output folder
// name (decoupled from this bundler folder, which stays 1040-maps); `paths` = extra
// copy destinations; `embedBaseUrl` = absolute base for embed snippets; `tokenUrl` =
// the token endpoint baked into every page. One file, read once here.
function readBuildConfig() {
  try {
    const cfg = JSON.parse(readFileSync(BUILD_CONFIG_FILE, 'utf8'))
    const name = (typeof cfg.name === 'string' && cfg.name.trim()) ? cfg.name.trim() : 'doxa-maps'
    const paths = Array.isArray(cfg.paths) ? cfg.paths.filter((p) => typeof p === 'string' && p.trim()) : []
    const embedBaseUrl = (typeof cfg.embedBaseUrl === 'string' ? cfg.embedBaseUrl.trim() : '').replace(/\/+$/, '')
    const tokenUrl = typeof cfg.tokenUrl === 'string' ? cfg.tokenUrl.trim() : ''
    // OPT-IN baked token (token ladder rung 3): a literal Mapbox token inlined into
    // every generated page. Empty by default — prefer tokenUrl (a URL, not a secret).
    // Only set this when you deliberately want the token to ship inside the folder.
    const token = typeof cfg.token === 'string' ? cfg.token.trim() : ''
    return { name, paths, embedBaseUrl, tokenUrl, token }
  } catch {
    return { name: 'doxa-maps', paths: [], embedBaseUrl: '', tokenUrl: '', token: '' }
  }
}
const DEST_CONFIG = readBuildConfig()
const TREE_NAME = DEST_CONFIG.name
// Driver 2026-07-11: the staging TOP must not mention deployment orgs (doxa/GO/...). The visible
// title is the PRODUCT title (config displayTitle, default org-free), never the deployment TREE_NAME
// (TREE_NAME stays in URLs/paths where it is a folder name, not branding).
const DISPLAY_TITLE = (typeof DEST_CONFIG.displayTitle === 'string' && DEST_CONFIG.displayTitle.trim())
  ? DEST_CONFIG.displayTitle.trim() : 'Sovereign Map Forge'
// Base URL every intra-tree ref (manifest iframeUrl/scriptUrl) is built against.
// With embedBaseUrl set (e.g. "https://doxa.life/js"), refs are ABSOLUTE — the
// build-time override for known hosts / partner embeds. WITHOUT it, refs are
// RELATIVE to the tree root (".", i.e. "./bundle/profile/…") so the whole folder
// is POSITION-INDEPENDENT: file://, Cloudflare-Drop, a foreign subpath, or Railway
// all behave identically (drop-portability gate, internal/drop-portability-check.mjs).
// A leading-slash "/doxa-maps/…" was the Drop breakage — any subpath host resolves
// it against the host origin, not the tree, and every iframe/script 404s.
const EMBED_BASE = DEST_CONFIG.embedBaseUrl
  ? `${DEST_CONFIG.embedBaseUrl}/${TREE_NAME}`
  : '.'
const DEFAULT_ROOT = resolve(__dirname, '..', 'app', TREE_NAME)   // ./app/<name>

const HEADER_BYTES = 8192            // only scan the top of each file (header lives there)
const TAG_RE = /^\s*\*\s*@([\w-]+)\s+(.+?)\s*$/gm           // JSDoc `* @tag value` lines
const DEFINE_RE = /customElements\.define\(\s*['"]([^'"]+)['"]/g  // registered element tags

const isBundleDir = (name) => !name.startsWith('_') && !name.startsWith('.')

/** Pull the optional JSDoc header tags from the top of a .vue/.js file. */
function extractHeaderTags(filePath) {
  const head = readFileSync(filePath, 'utf8').slice(0, HEADER_BYTES)
  const tags = {}
  for (const m of head.matchAll(TAG_RE)) {
    const key = m[1]
    if (!(key in tags)) tags[key] = m[2]   // first occurrence wins
  }
  return tags
}

/** Element tag names a bundle registers, read from its index.js (order preserved). */
function extractElements(indexJsPath) {
  if (!existsSync(indexJsPath)) return []
  const src = readFileSync(indexJsPath, 'utf8')
  const tags = []
  for (const m of src.matchAll(DEFINE_RE)) if (!tags.includes(m[1])) tags.push(m[1])
  return tags
}

/**
 * Mapbox token source baked into every generated page. Returns a plain string that is
 * either a JS global name ("window.MAP_TOKEN_URL") or a literal URL. Resolved SAFELY as
 * DATA in the page — never eval'd — so a literal URL can't produce a SyntaxError.
 * Precedence: vite.1040-maps-build-config.json `tokenUrl` (the drop-anywhere absolute
 * URL — the ONE place a developer sets their token endpoint) → sources.json
 * `mapboxTokenUrl` → "window.MAP_TOKEN_URL". This single value flows into every
 * profile + instance index.html across the tree.
 */
function readTokenUrlExpr() {
  if (DEST_CONFIG.tokenUrl) return DEST_CONFIG.tokenUrl
  try {
    const src = JSON.parse(readFileSync(SOURCES, 'utf8'))
    const v = src?._meta?.mapboxTokenUrl || src?.mapboxTokenUrl
    if (typeof v === 'string' && v.trim()) return v.trim()
  } catch (_) { /* fall through */ }
  return 'window.MAP_TOKEN_URL'
}

// ── HTML escaping ────────────────────────────────────────────────────────────
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

// ── Shared theme (dark, gem frames) ──────────────────────────────────────────
const BASE_CSS = `
:root {
  --bg:#0a0e15; --surf:#121a27; --surf2:#0e1623; --line:#223047;
  --ink:#eef2f7; --mut:#9aa7b8; --dim:#6b7787; --cy:#46d4ff; --vi:#b9a6f5; --gold:#ffc24b; --grn:#5ee0a0;
  --sans:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  --mono:ui-monospace,SFMono-Regular,Menlo,monospace;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background:
    radial-gradient(1100px 480px at 82% -12%, rgba(70,212,255,.10), transparent 60%),
    radial-gradient(820px 460px at -8% 112%, rgba(185,166,245,.10), transparent 60%),
    var(--bg);
  color: var(--ink); font-family: var(--sans); min-height: 100%; -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
code { font-family: var(--mono); background:#1f2937; padding:1px 5px; border-radius:4px; color:var(--gold); }
header.forge { padding: 22px 28px 6px; }
header.forge h1 { font: 800 21px/1.2 var(--sans); letter-spacing:-.02em; }
header.forge h1 .ac { color: var(--cy); }
header.forge .sub { margin-top: 6px; font: 13px/1.55 var(--sans); color: var(--mut); max-width: 78ch; }
header.forge .crumb { margin-top: 10px; font: 12px/1 var(--mono); color: var(--dim); }
header.forge .crumb a { color: var(--cy); }
#count { display:block; margin-top:10px; color:var(--cy); font:12px/1 var(--mono); }
/* tab strip */
.tabstrip { position: sticky; top: 0; z-index: 5; display:flex; gap:10px;
  padding: 12px 28px; overflow-x:auto; scrollbar-width:thin;
  background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(8px);
  border-bottom:1px solid var(--surf2); }
.tabstrip::-webkit-scrollbar { height:8px; }
.tabstrip::-webkit-scrollbar-thumb { background:#243349; border-radius:8px; }
.tab { flex:0 0 auto; text-align:left; cursor:pointer; min-width:198px; display:block;
  background:var(--surf); border:1px solid var(--line); border-radius:12px; padding:11px 14px; color:inherit; transition:.15s; }
.tab:hover { border-color:#33455f; transform:translateY(-1px); }
.tab.active { border-color:var(--gem,var(--cy));
  background: color-mix(in srgb, var(--gem,var(--cy)) 12%, var(--surf));
  box-shadow: 0 0 0 1px var(--gem,var(--cy)) inset, 0 6px 20px rgba(0,0,0,.3); }
.tab .tname { font:700 13px/1.1 var(--sans); display:flex; align-items:center; gap:8px; }
.tab .dot { width:9px; height:9px; border-radius:50%; background:var(--gem,var(--cy)); box-shadow:0 0 8px var(--gem,var(--cy)); }
.tab .ttags { margin-top:6px; display:flex; flex-wrap:wrap; gap:4px; }
.tab .etag { font:9px/1 var(--mono); color:var(--vi); border:1px solid rgba(185,166,245,.4); border-radius:999px; padding:3px 7px; }
.tab .tfile { margin-top:6px; font:10px/1 var(--mono); color:var(--dim); }
/* gem grid */
.grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:18px; padding: 18px 28px 28px; }
.gem { --gem:var(--cy); --gem-rgb:70,212,255; position:relative; display:flex; flex-direction:column;
  padding:12px; background:var(--surf); border:1px solid var(--gem); border-radius:14px;
  box-shadow:0 0 26px rgba(var(--gem-rgb),.14); transition:.2s; }
.gem:hover { transform: translateY(-2px); box-shadow:0 0 34px rgba(var(--gem-rgb),.22); }
.gem .ghead { display:flex; align-items:center; gap:10px; padding:4px 6px 10px; }
.gem .gtag { font:800 14px/1 var(--mono); color:var(--gem); }
.gem .gkind { font:9px/1 var(--mono); color:var(--dim); border:1px solid var(--line); border-radius:999px; padding:3px 8px; }
.gem .gbody { border:1px solid var(--gem); border-radius:10px; background:#0d1622; padding:14px; min-height:96px; }
.gem .gbody .desc { font:12px/1.5 var(--sans); color:var(--mut); }
.gem .gbody .meta { margin-top:8px; font:10px/1.4 var(--mono); color:var(--dim); }
.gem .gcta { margin-top:12px; display:flex; gap:8px; }
.gem .gcta a { font:11px/1 var(--mono); color:var(--gem); border:1px solid var(--gem); border-radius:8px; padding:8px 12px; }
.gem .gcta a:hover { background: color-mix(in srgb, var(--gem) 14%, transparent); }
.empty { color:var(--dim); font:13px/1.6 var(--mono); padding: 30px 28px; }
.foot { padding:14px 28px 20px; font:11.5px/1.5 var(--mono); color:var(--dim); border-top:1px solid var(--surf2); }
.foot .scr { color: var(--vi); }
/* profile page: full-bleed map */
.mapwrap { position:fixed; inset:0; }
.mapwrap .bar { position:absolute; top:0; left:0; right:0; z-index:10; display:flex; align-items:center; gap:10px;
  padding:10px 16px; background: color-mix(in srgb, var(--bg) 80%, transparent); backdrop-filter: blur(8px);
  border-bottom:1px solid var(--surf2); font:12px/1 var(--mono); color:var(--mut); }
.mapwrap .bar a { color: var(--cy); }
.mapwrap .bar .tag { color: var(--gem, var(--cy)); font-weight:700; }
.mapwrap .slot { position:absolute; inset:0; }
.mapwrap .slot > * { position:absolute; inset:0; width:100%; height:100%; display:block; }
.mapwrap .err { position:absolute; inset:0; display:grid; place-items:center; padding:24px; text-align:center;
  color:#f87171; font:13px/1.6 var(--mono); }
`

const GEMS = ['#46d4ff', '#b9a6f5', '#5ee0a0', '#ffc24b', '#f472b6', '#f59e0b', '#34d399']
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) }

// ── The "Map Forge" staging shell ────────────────────────────────────────────
// ONE staging design, emitted at every tree level (root + each bundle). It is a
// thin HTML shell that loads the shared, org-agnostic renderer (staging-forge.js,
// inlined at build time below) with a `window.FORGE` config telling it which tree
// level it is + where the manifest is. The renderer reads the semantic-tree
// manifest and draws `bundle → profile → instance` tabs, live map tiles, an
// architecture showcase, a desktop/mobile viewport toggle, and seamless
// scroll-to-hide of the tree. NO org / bundle / profile names are hardcoded here.
const FORGE_CSS = readForgeAsset('internal/staging-forge.css')
const FORGE_JS  = readForgeAsset('internal/staging-forge.js')
  // Built pages inline this as a CLASSIC script — import.meta is a parse error there.
  .replace(/\/\* DEV-HMR-START[\s\S]*?DEV-HMR-END \*\//, '/* dev-hmr stripped for built pages */')

// `rel` is repo-root-relative (this script lives in internal/, one level down).
function readForgeAsset(rel) {
  try { return readFileSync(resolve(__dirname, '..', rel), 'utf8') }
  catch { return '' }
}

/**
 * The shared Sovereign-Forge staging page. Self-contained: CSS + renderer are
 * INLINED (no external fetch that could 404 on a static host), except the
 * manifest which the renderer fetches relative to the page.
 *
 * @param {object} o
 * @param {'root'|'bundle'} o.scope
 * @param {string}  o.title
 * @param {string}  o.subtitle
 * @param {string=} o.bundle       - when scope==='bundle'
 * @param {string=} o.crumbHref    - back link (bundle scope)
 * @param {string=} o.crumbLabel
 */
function forgeHtml(o) {
  const forgeConfig = {
    mode: 'built',
    scope: o.scope,
    // ONE manifest at the tree root is the single source of truth. Root page
    // reads ./manifest.json; a bundle page (one level deeper) reads ../manifest.json.
    manifestUrl: o.scope === 'root' ? './manifest.json' : '../manifest.json',
    bundle: o.bundle || null,
    // The tree links (open/view) in staging-forge are relative to the ROOT tree.
    // A bundle page sits one level in, so it must prefix root-relative hrefs with '../'.
    hrefBase: o.scope === 'root' ? './' : '../',
  }
  const crumb = o.crumbHref
    ? `<a class="ext" href="${esc(o.crumbHref)}">← ${esc(o.crumbLabel || 'back')}</a>`
    : ''
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(o.title)}</title>
  <link rel="icon" href="data:,">
  <style>${FORGE_CSS}</style>
</head>
<body>
  <header class="top">
    <h1>${esc(o.title.replace(' \u00b7 staging',''))}<span class="ac">${o.scope === 'root' ? '' : ' / ' + esc(o.bundle || '')}</span></h1>
    <div class="sub">${esc(o.subtitle)}</div>
  </header>
  <div class="strip" id="frameInfo">loading\u2026</div>
  <div id="tokenBar" class="hidden"></div>
  <div id="shell">
    <nav id="treeNav" aria-label="semantic tree"></nav>
    <main id="stage"></main>
  </div>

  <script>window.FORGE = ${JSON.stringify(forgeConfig).replace(/</g,'\\u003c')};
  /* file:// contract: manifest inlined at build \u2014 no fetch needed to render. */
  window.FORGE.manifest = ${JSON.stringify(o.inlineManifest || null).replace(/</g,'\\u003c')};</script>
  <script>${FORGE_JS}</script>
</body>
</html>
`
}

// ── Page templates ───────────────────────────────────────────────────────────

/** Root staging page — the Map Forge showing ALL bundles (scope='root'). */
function rootHtml(bundles, manifest) {
  return forgeHtml({
    inlineManifest: manifest,
    scope: 'root',
    title: `${DISPLAY_TITLE} · staging`,
    subtitle: 'one shared core → many self-contained, paste-anywhere map bundles',
  })
}

/** Bundle staging page — the Map Forge showing THIS bundle's profiles (scope='bundle'). */
function bundleHtml(b, index, manifest) {
  return forgeHtml({
    inlineManifest: manifest,
    scope: 'bundle',
    bundle: b.bundle,
    title: `${DISPLAY_TITLE} · ${b.bundle}`,
    subtitle: `${b.bundle} — one bundle, its profiles as paste-anywhere maps`,
    crumbHref: '../index.html',
    crumbLabel: 'all bundles',
  })
}

/**
 * Shared standalone map page — a BARE, full-page map (the shareable leaf of the tree).
 * Per Driver: profile/instance pages are NOT staging — no header, no tabstrip, no
 * chrome. The map custom element fills the viewport so the browser URL (location.href)
 * shares THE MAP directly. Loads Mapbox CDN + the parent bundle IIFE, resolves the
 * token via the ladder below, then mounts the web component with `config`.
 * Params:
 *   opts.title      page <title>
 *   opts.tag        custom-element tag
 *   opts.config     profile-config object (tk added at runtime; a hardcoded config.tk
 *                   is the ladder's top "prop" rung)
 *   opts.jsSrc      relative URL to the bundle IIFE (../ for profile, ../../ for instance)
 *   opts.apiBaseUrl optional — baked as window.MAP_APP_API_URL before the bundle loads
 *   opts.tokenUrlExpr sources.json mapboxTokenUrl value (data-safe URL or global name)
 *   opts.bakedToken opt-in literal token baked from build-config (ladder rung 3)
 */
function mapPageHtml(opts) {
  const { title, tag, config, jsSrc, apiBaseUrl, tokenUrlExpr, bakedToken } = opts
  const apiScript = apiBaseUrl
    ? `\n  <script>window.MAP_APP_API_URL = ${JSON.stringify(apiBaseUrl)};</script>`
    : ''
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <link rel="icon" href="data:,">
  <!-- Mapbox peer loaded ONCE here; the map custom element mounts in this page and
       uses window.mapboxgl directly (same realm → no cross-realm container errors). -->
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.24.0/mapbox-gl.css" rel="stylesheet" />
  <link href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.css" rel="stylesheet" />
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.24.0/mapbox-gl.js"></script>
  <script src="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v5.0.0/mapbox-gl-geocoder.min.js"></script>
  <style>
    /* BARE full-page map — no chrome. The custom element IS the page, so the
       browser URL shares the map itself (Driver: "Share shares THE MAP"). */
    html, body { height: 100%; margin: 0; background: #0a0e15; }
    #slot, ${esc(tag)} { position: fixed; inset: 0; width: 100%; height: 100%; display: block; }
    #status { position: fixed; inset: 0; z-index: 2; display: grid; place-items: center;
      padding: 24px; text-align: center; color: #9aa7b8;
      font: 13px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; }
    #status.err { color: #f87171; }
  </style>
</head>
<body>
  <div id="slot"></div>
  <div id="status">loading token…</div>
${apiScript}
  <!-- Bundle IIFE — registers the <${esc(tag)}> custom element. -->
  <script src="${esc(jsSrc)}"></script>

  <script>
    // Mapbox token resolution — the Driver's A3 ladder, in precedence order:
    //   1. prop            — a token hardcoded into this page's profile-config (config.tk)
    //   2. ?tk= URL param  — token carried in the shared link
    //   3. baked token     — opt-in literal token inlined at build time (build-config.token)
    //   A token from rungs 1-3 is used DIRECTLY (no network). Otherwise a token
    //   *endpoint* is resolved and fetched:
    //   4. window.MAP_TOKEN_URL override  5. configured TOKEN_SRC URL  6. same-origin /api/maps/token
    // TOKEN_SRC is treated as DATA, never eval'd: the literal "window.MAP_TOKEN_URL"
    // means "read that global"; anything else is used as a URL — so both a global
    // name and a plain URL are safe (no SyntaxError footgun).
    (function () {
      var slot = document.getElementById('slot');
      var status = document.getElementById('status');
      var BASE_CONFIG = ${JSON.stringify(config)};
      var TOKEN_SRC = ${JSON.stringify(tokenUrlExpr)};
      var BAKED_TOKEN = ${JSON.stringify(bakedToken || '')};
      var DEFAULT_TOKEN_URL = '/api/maps/token';

      function fail(msg) { if (status) { status.className = 'err'; status.textContent = '⚠ ' + msg; } }
      // No token anywhere on the ladder → ask ONCE, store locally, remount. No dead ends.
      function askToken() {
        if (!status) return;
        status.className = 'err';
        status.innerHTML = 'map needs a Mapbox token — ' +
          '<input id="tkIn" type="password" placeholder="paste pk.… (stays in this browser)" ' +
          'style="font:12px ui-monospace,monospace;padding:6px 8px;border-radius:6px;border:1px solid #223047;background:#0e1623;color:#eef2f7;width:min(320px,70vw)"> ' +
          '<button id="tkGo" style="font:700 11px ui-monospace,monospace;padding:7px 12px;border-radius:999px;border:0;cursor:pointer;background:linear-gradient(90deg,#46d4ff,#b9a6f5);color:#0a0e15">use it</button>';
        var go = document.getElementById('tkGo');
        if (go) go.addEventListener('click', function () {
          var v = (document.getElementById('tkIn').value || '').trim();
          if (!v) return;
          try { localStorage.setItem('MAPS_STAGING_TK', v); } catch (e) {}
          mount(v);
        });
      }
      function done() { if (status && status.parentNode) { status.parentNode.removeChild(status); } }

      function mount(token) {
        if (!token) { return askToken(); }
        try {
          var cfg = Object.assign({}, BASE_CONFIG, { tk: token });
          var el = document.createElement(${JSON.stringify(tag)});
          el.setAttribute('profile-config', JSON.stringify(cfg));
          slot.innerHTML = '';
          slot.appendChild(el);
          done();
        } catch (e) { fail(e && e.message ? e.message : String(e)); }
      }

      function qp(name) {
        try { return new URLSearchParams(location.search).get(name) || ''; }
        catch (e) { return ''; }
      }

      function extractToken(data) {
        if (typeof data === 'string') return data.trim();
        if (data && typeof data === 'object') return data.token || data.tk || data.accessToken || '';
        return '';
      }

      // Rungs 1-3b: an actual token → mount directly, no fetch.
      // 2b = localStorage: the paste-once store shared with the staging pages
      // (MAPS_STAGING_TK) — paste a token ONCE anywhere in the tree, every page uses it.
      var stored = '';
      try { stored = localStorage.getItem('MAPS_STAGING_TK') || ''; } catch (e) {}
      var urlTk = qp('tk');
      if (urlTk) { try { localStorage.setItem('MAPS_STAGING_TK', urlTk); } catch (e) {} }
      var directToken = (BASE_CONFIG && BASE_CONFIG.tk) || urlTk || stored || BAKED_TOKEN;
      if (directToken) { return mount(directToken); }

      // Rungs 4-6: resolve a token endpoint and fetch it.
      var tokenUrl =
        (window.MAP_TOKEN_URL) ||
        (TOKEN_SRC && TOKEN_SRC !== 'window.MAP_TOKEN_URL' ? TOKEN_SRC : '') ||
        DEFAULT_TOKEN_URL;

      fetch(tokenUrl)
        .then(function (r) {
          var ct = r.headers.get('content-type') || '';
          return ct.indexOf('json') !== -1 ? r.json() : r.text();
        })
        .then(function (data) { mount(extractToken(data)); })
        .catch(function (e) {
          fail('Token fetch failed from ' + tokenUrl + ' — set window.MAP_TOKEN_URL or pass ?tk=. (' + (e && e.message ? e.message : e) + ')');
        });
    })();
  </script>
</body>
</html>
`
}

/**
 * Standalone profile page — the base parameterized profile (no preset props).
 * Lives at <bundle>/<profile>/index.html → bundle IIFE is one level up (../).
 */
function profileHtml(b, profile, tokenUrlExpr, bakedToken) {
  const tag = b.elements[0] || b.bundle
  return mapPageHtml({
    title: `${profile.profile} · ${b.bundle}`,
    tag,
    config: { profile: profile.profile, dataSource: 'pray-tools', instanceId: `${b.bundle}-${profile.profile}` },
    jsSrc: `../${b.bundle}.js`,
    tokenUrlExpr,
    bakedToken,
  })
}

/**
 * Preconfigured-instance page — one preset render of a parameterized profile.
 * Lives at <bundle>/<profile>/<instance>/index.html → bundle IIFE is two levels up
 * (../../). The instance's preset props + apiBaseUrl are baked in.
 */
function instanceHtml(b, profile, inst, tokenUrlExpr, bakedToken) {
  const tag = inst.element || b.elements[0] || b.bundle
  return mapPageHtml({
    title: `${inst.title} · ${b.bundle}`,
    tag,
    config: inst.props,
    jsSrc: `../../${b.bundle}.js`,
    apiBaseUrl: inst.apiBaseUrl || '',
    tokenUrlExpr,
    bakedToken,
  })
}

/**
 * Read preconfigured instances declared in a `*.instances.json` next to a profile's
 * .vue. Returns [] when absent. Each instance becomes a nested standalone page. The
 * file shape: { profile, apiBaseUrl?, instances: [{ id, title?, props }] } where
 * `props` are merged into the profile-config (minus tk, which is fetched at runtime).
 */
function readInstances(dir, profileName, bundle, tag) {
  // Accept either <profileName>.instances.json or any *.instances.json in the folder.
  let file = join(dir, `${profileName}.instances.json`)
  if (!existsSync(file)) {
    const alt = readdirSync(dir).find((f) => f.endsWith('.instances.json'))
    if (!alt) return []
    file = join(dir, alt)
  }
  let cfg
  try {
    cfg = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    console.error(`[generate-tree] bad instances json ${file}: ${e.message}`)
    return []
  }
  const apiBaseUrl = typeof cfg.apiBaseUrl === 'string' ? cfg.apiBaseUrl : ''
  const list = Array.isArray(cfg.instances) ? cfg.instances : []
  return list
    .filter((i) => i && typeof i.id === 'string' && i.id.trim())
    .map((i) => {
      const id = i.id.trim()
      const iframeUrl = `${EMBED_BASE}/${bundle}/${profileName}/${id}/index.html`
      const iframeEmbed =
        `<iframe src="${iframeUrl}" width="100%" height="600" ` +
        `style="border:none;border-radius:12px;" allowfullscreen></iframe>`
      return {
        id,
        title: typeof i.title === 'string' ? i.title : id,
        apiBaseUrl,
        // profile-config props (tk added at runtime); profile name always included.
        props: { profile: profileName, ...(i.props && typeof i.props === 'object' ? i.props : {}) },
        element: tag,
        iframeUrl,
        embed: { iframe: iframeEmbed },
      }
    })
}

// ── Scan app-profiles → bundle records ───────────────────────────────────────
function scanBundles() {
  if (!existsSync(APP_PROFILES)) {
    console.error(`[generate-tree] no app-profiles/ at ${APP_PROFILES}`)
    process.exit(1)
  }
  const PROTOTYPE_RE = /template|example|starter|sample|demo|clone/i
  const bundles = []
  for (const entry of readdirSync(APP_PROFILES).sort()) {
    const dir = join(APP_PROFILES, entry)
    if (!isBundleDir(entry) || !statSync(dir).isDirectory()) continue

    const vueFiles = readdirSync(dir).filter((f) => f.endsWith('.vue')).sort()
    if (vueFiles.length === 0) continue

    // The custom-element tag this bundle registers (first one). Used in the
    // <script>-style embed snippet below.
    const bundleElements = extractElements(join(dir, 'index.js'))
    const tag = bundleElements[0] || entry

    const profiles = vueFiles.map((file) => {
      const tags = extractHeaderTags(join(dir, file))
      const { description, file: fileTag, ...rest } = tags
      const profileName = file.replace(/\.vue$/, '')

      // Absolute-or-root-relative URLs so the snippets are paste-anywhere.
      // iframeUrl → the standalone profile page; scriptUrl → the bundle IIFE.
      const iframeUrl = `${EMBED_BASE}/${entry}/${profileName}/index.html`
      const scriptUrl = `${EMBED_BASE}/${entry}/${entry}.js`

      // Two ready-to-paste embed forms (mirrors ShareButton's iframe approach +
      // the direct web-component approach). profileConfig token comes from the
      // host at runtime (window.MAP_TOKEN_URL); the tk placeholder is a reminder.
      const iframeEmbed =
        `<iframe src="${iframeUrl}" width="100%" height="600" ` +
        `style="border:none;border-radius:12px;" allowfullscreen></iframe>`
      const scriptEmbed =
        `<script src="${scriptUrl}"><\/script>\n` +
        `<${tag} profile-config='{"profile":"${profileName}","tk":"YOUR_MAPBOX_TOKEN"}'></${tag}>`

      // Preconfigured instances: ONE parameterized profile → N preset render
      // targets, declared in <something>.instances.json next to the .vue. Each
      // instance emits its own nested page (<profile>/<instance>/index.html) with
      // the preset props baked in. Distinct from tabs (many components → one el);
      // this splits one profile into many named, directly-embeddable variants.
      const instances = readInstances(dir, profileName, entry, tag)

      return {
        profile: profileName,
        file,
        description: description || fileTag || '',
        element: tag,
        iframeUrl,
        scriptUrl,
        embed: { iframe: iframeEmbed, script: scriptEmbed },
        ...(instances.length ? { instances } : {}),
        ...rest,
      }
    })

    // Representative-profile ordering (mirrors the app-shell SCAN): prototype-named
    // profiles sort LAST so the real production profile represents the bundle.
    profiles.sort((a, b) =>
      (PROTOTYPE_RE.test(a.profile) ? 1 : 0) - (PROTOTYPE_RE.test(b.profile) ? 1 : 0))

    bundles.push({
      bundle: entry,
      // Absolute-or-root-relative URL to the bundle IIFE (paste-anywhere).
      scriptUrl: `${EMBED_BASE}/${entry}/${entry}.js`,
      output: `${TREE_NAME}/${entry}/${entry}.js`,
      elements: bundleElements,
      profiles,
    })
  }
  return bundles
}

// ── Write the tree into a root, then fan out to all destinations ─────────────
function readDestinations() {
  const dests = [DEFAULT_ROOT]
  // Each entry in vite.1040-maps-build-config.json `paths` is a folder that should CONTAIN
  // the <name>/ tree (so the full path is <entry>/<name>/).
  for (const p of DEST_CONFIG.paths) {
    dests.push(resolve(__dirname, '..', p, TREE_NAME))   // paths are relative to the BUNDLER ROOT (this script lives in internal/)
  }
  return dests
}

function writeManifestAndHtml(root, bundles, tokenUrlExpr, bakedToken) {
  const manifest = {
    schema: 'doxa-maps-manifest@1',
    generatedFrom: 'app-profiles/*/*.vue',
    // The base URL all embed/script/iframe URLs below are built against. Set
    // embedBaseUrl in vite.1040-maps-build-config.json to make these absolute; empty here
    // means they are root-relative (served from the site root).
    embedBase: EMBED_BASE,
    bundleCount: bundles.length,
    profileCount: bundles.reduce((n, b) => n + b.profiles.length, 0),
    bundles,
  }
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  writeFileSync(join(root, 'index.html'), rootHtml(bundles, manifest))
  bundles.forEach((b, i) => {
    const bundleDir = join(root, b.bundle)
    mkdirSync(bundleDir, { recursive: true })
    writeFileSync(join(bundleDir, 'index.html'), bundleHtml(b, i, { ...manifest, bundles: [b] }))
    for (const p of b.profiles) {
      const profDir = join(bundleDir, p.profile)
      mkdirSync(profDir, { recursive: true })
      writeFileSync(join(profDir, 'index.html'), profileHtml(b, p, tokenUrlExpr, bakedToken))
      // Preconfigured instances → one nested page each, props baked in.
      for (const inst of (p.instances || [])) {
        const instDir = join(profDir, inst.id)
        mkdirSync(instDir, { recursive: true })
        writeFileSync(join(instDir, 'index.html'), instanceHtml(b, p, inst, tokenUrlExpr, bakedToken))
      }
    }
  })
}

function main() {
  const bundles = scanBundles()
  const tokenUrlExpr = readTokenUrlExpr()
  const bakedToken = DEST_CONFIG.token   // opt-in literal token (ladder rung 3); '' by default

  // 1. Fill in manifest + HTML on the DEFAULT root (where vite already emitted the .js).
  writeManifestAndHtml(DEFAULT_ROOT, bundles, tokenUrlExpr, bakedToken)

  // 2. Copy the completed default tree to every extra destination.
  const dests = readDestinations()
  for (const dest of dests) {
    if (dest === DEFAULT_ROOT) continue
    rmSync(dest, { recursive: true, force: true })
    mkdirSync(dirname(dest), { recursive: true })
    cpSync(DEFAULT_ROOT, dest, { recursive: true })
    console.log(`[generate-tree] copied ${TREE_NAME}/ → ${dest}`)
  }

  console.log(`[generate-tree] ${bundles.length} bundle(s), ` +
    `${bundles.reduce((n, b) => n + b.profiles.length, 0)} profile(s) → ${dests.length} destination(s)`)
}

main()
