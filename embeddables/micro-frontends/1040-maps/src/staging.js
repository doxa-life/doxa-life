// staging.js — auto-detecting 1040-maps staging dashboard (dev only, no build step).
//
// Cards 4de98dc4 + bt-1040m. The old root index.html hardcoded a list of bundles and drifted
// stale (it listed 3 of 4 app-profiles — doxa-countries-map was missing). This module is now
// loaded directly by index.html (the single staging page; the separate staging.html it was
// prototyped in was consolidated into index.html). It discovers everything at dev time via
// Vite's import.meta.glob, so adding an app-profile folder or a .vue profile shows up
// automatically with NO edits here and NO build.
//
// What it discovers:
//   /app-profiles/<name>/index.js        → one bundle  (registers a custom element)
//   /app-profiles/<name>/*.vue           → the profiles inside that bundle
//   /app-profiles/<name>/index.html      → that bundle's own live dev page (already works)
//
// HMR: import.meta.glob keys are real Vite module ids, so `pnpm run dev` hot-reloads any
// .vue change without a rebuild. We don't eagerly import the bundles (that would boot every
// Mapbox instance at once); each card mounts on demand via its own index.html in an iframe.

// `eager:false` → we get a map of path → () => import(). We only need the KEYS for
// discovery, but keeping the importers lets a future version lazy-mount inline.
const bundleMods = import.meta.glob('/app-profiles/*/index.js')
const profileMods = import.meta.glob('/app-profiles/*/*.vue')

// Group discovered .vue profiles by their app-profile folder name.
function discover() {
  const byBundle = {}
  for (const path of Object.keys(bundleMods)) {
    const name = path.split('/')[2]              // /app-profiles/<name>/index.js
    byBundle[name] = byBundle[name] || { name, profiles: [] }
  }
  for (const path of Object.keys(profileMods)) {
    const parts = path.split('/')                // /app-profiles/<name>/<file>.vue
    const name = parts[2]
    const file = parts[parts.length - 1].replace(/\.vue$/, '')
    byBundle[name] = byBundle[name] || { name, profiles: [] }
    byBundle[name].profiles.push(file)
  }
  return Object.values(byBundle).sort((a, b) => a.name.localeCompare(b.name))
}

// The production embed for a bundle: <script src=".../<name>.js"> + the custom element.
// Element tag = the folder name (matches how index.js registers it). Script tag auto-named
// from folder; profile-config picks one of the discovered .vue profiles by file name.
function embedSnippet(name, profile) {
  return `<script src="…/public/js/${name}.js"><\/script>\n`
       + `<${name} profile-config="${profile}"></${name}>`
}

function render() {
  const bundles = discover()
  const root = document.getElementById('app')
  document.getElementById('count').textContent =
    `${bundles.length} bundle(s), ${bundles.reduce((n, b) => n + b.profiles.length, 0)} profile(s) — auto-detected`

  root.innerHTML = bundles.map(b => `
    <section class="bundle">
      <header>
        <h2>${b.name}</h2>
        <a class="open" href="/app-profiles/${b.name}/" target="_blank" rel="noopener">open live ↗</a>
      </header>
      <div class="profiles">
        ${b.profiles.map(p => `
          <details class="profile">
            <summary><code>${p}</code> <span class="tag">&lt;${b.name} profile-config="${p}"&gt;</span></summary>
            <pre>${embedSnippet(b.name, p).replace(/</g, '&lt;')}</pre>
            <iframe loading="lazy" src="/app-profiles/${b.name}/" title="${b.name}/${p}"></iframe>
          </details>`).join('') || '<p class="empty">no .vue profiles found</p>'}
      </div>
    </section>`).join('')
}

render()

// Re-render on HMR so newly added/removed profiles/bundles refresh without a manual reload.
if (import.meta.hot) {
  import.meta.hot.accept(() => render())
}
