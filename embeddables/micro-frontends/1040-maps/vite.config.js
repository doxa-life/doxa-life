/**
 * doxa-maps Vite config — per-bundle IIFE build.
 * WHY? -> !!! EACH BUNDLE ONLY BUNDLES WHAT IT NEEDS BASED ON ITS APP PROFILE :)
 * Layout:
 *   library/               ← shared library (components, composables, config, etc.; aliased as @map)
 *   app-profiles/<name>/   ← bundle source folder
 *     ├── index.html       ← Vite html entry (staging page; loads index.js as a module in dev)
 *     ├── index.js         ← bundle entry — registers the custom element (globs ./*.vue)
 *     └── *.vue            ← profile components at the bundle root (auto-discovered via import.meta.glob('./*.vue'))
 *   app/doxa-maps/         ← build output tree (see below)
 *
 * Build mode: each invocation builds ONE bundle (selected via BUNDLE env var) so we can
 * use IIFE format with inlineDynamicImports. The npm `build` script runs vite once per
 * app-profiles/<name>/ folder, emitting app/doxa-maps/<bundle>/<bundle>.js. After all
 * bundles are built, `generate-tree.mjs` writes the manifest + self-contained staging
 * HTML into the tree and copies the whole doxa-maps/ folder to every destination
 * (default ./app/ + each line in vite.destination.md).
 *
 * Dev mode (`npm run dev`): no BUNDLE selection — Vite serves all bundles at their html
 * paths under the dev server.
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const profilesDir = resolve(__dirname, 'app-profiles')

// The multi-MFE output folder name is configured in vite.1040-maps-build-config.json (`name`),
// so you can name the output tree (e.g. "doxa-maps") independently of this bundler
// folder's own name. Falls back to "doxa-maps" if the file is missing/unset.
function readMfeName() {
  try {
    const cfg = JSON.parse(readFileSync(resolve(__dirname, 'vite.1040-maps-build-config.json'), 'utf8'))
    if (cfg && typeof cfg.name === 'string' && cfg.name.trim()) return cfg.name.trim()
  } catch { /* fall through to default */ }
  return 'doxa-maps'
}
const MFE_NAME = readMfeName()

// Default output tree. generate-tree.mjs reads the same name + copies it onward.
const OUT_ROOT = resolve(__dirname, 'app', MFE_NAME)

function discoverBundles() {
  if (!existsSync(profilesDir)) return {}
  const entries = {}
  for (const name of readdirSync(profilesDir)) {
    if (name.startsWith('_') || name.startsWith('.')) continue
    const dir = resolve(profilesDir, name)
    if (!statSync(dir).isDirectory()) continue
    const html = resolve(dir, 'index.html')
    const js = resolve(dir, 'index.js')
    if (!existsSync(html) || !existsSync(js)) continue
    entries[name] = { html, js }
  }
  return entries
}

export default defineConfig(({ command }) => {
  const all = discoverBundles()
  const allNames = Object.keys(all)
  const target = process.env.BUNDLE
  const isBuild = command === 'build'

  if (isBuild && !target) {
    throw new Error(
      `[doxa-maps] Set BUNDLE=<name> for build, or use \`npm run build\` (loops all).\n` +
      `Available: ${allNames.join(', ') || '(none)'}`
    )
  }

  const buildEntries = isBuild
    ? { [target]: all[target].js }
    : Object.fromEntries(allNames.map(n => [n, all[n].html]))

  return {
    plugins: [vue(), cssInjectedByJsPlugin()],
    resolve: {
      alias: { '@map': resolve(__dirname, 'library') },
    },
    build: {
      // Each bundle lands in its own folder: app/doxa-maps/<bundle>/<bundle>.js.
      // generate-tree.mjs then fills in the index.html files + manifest and copies
      // the whole doxa-maps/ tree to the destinations in vite.destination.md.
      outDir: isBuild ? resolve(OUT_ROOT, target) : OUT_ROOT,
      emptyOutDir: false,
      cssCodeSplit: false,
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      sourcemap: false,
      assetsDir: '',                  // emit assets next to the .js, no assets/ subfolder
      chunkSizeWarningLimit: 2500,    // research-map is ~1.2 MB; tree-shaking already done
      rollupOptions: {
        input: buildEntries,
        // Externalize jspdf — it is used ONLY by the lazy poster/packet export
        // (`await import('jspdf')` in useMapPoster/useMapPacket). Because the IIFE
        // build uses inlineDynamicImports, that "lazy" import was being INLINED,
        // bloating every research/countries/upg bundle by ~0.6 MB (jspdf pulls in
        // html2canvas + canvg). Marking it external + mapping it to a CDN ESM URL
        // keeps it out of the bundle entirely; the browser fetches it at runtime
        // ONLY when the user actually exports a poster/packet. (Build-only — dev
        // still resolves jspdf from node_modules.)
        external: isBuild ? ['jspdf'] : [],
        output: isBuild ? {
          format: 'iife',
          name: `MapForge_${(target || '').replace(/[^a-zA-Z0-9_]/g, '_')}`,
          entryFileNames: '[name].js',
          assetFileNames: () => `${target}.[ext]`,
          inlineDynamicImports: true,
          // Resolve the externalized `import('jspdf')` to a CDN ESM module at runtime.
          paths: { jspdf: 'https://esm.sh/jspdf@4.2.1' },
        } : {
          entryFileNames: '[name].js',
        },
      },
    },
  }
})
