/**
 * 1040-maps Vite config — per-bundle IIFE build.
 * WHY? -> !!! EACH BUNDLE ONLY BUNDLES WHAT IT NEEDS BASED ON ITS APP PROFILE :)
 * Layout:
 *   src/                   ← shared library (components, composables, config, etc.)
 *   app-profiles/<name>/   ← bundle source folder
 *     ├── index.html       ← Vite html entry (staging page; loads index.js as a module in dev)
 *     ├── index.js         ← bundle entry — registers the custom element
 *     └── profiles/*.vue   ← profile components (auto-discovered via import.meta.glob)
 *   app/                   ← build outputs — exactly one <bundle>.js per app-profiles folder
 *
 * Build mode: each invocation builds ONE bundle (selected via BUNDLE env var) so we can
 * use IIFE format with inlineDynamicImports. The npm `build` script runs vite once per
 * app-profiles/<name>/ folder. This keeps `app/` flat — just .js files, no html/assets/.
 *
 * Dev mode (`npm run dev`): no BUNDLE selection — Vite serves all bundles at their html
 * paths under the dev server.
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { readdirSync, statSync, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const profilesDir = resolve(__dirname, 'app-profiles')

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
      `[1040-maps] Set BUNDLE=<name> for build, or use \`npm run build\` (loops all).\n` +
      `Available: ${allNames.join(', ') || '(none)'}`
    )
  }

  const buildEntries = isBuild
    ? { [target]: all[target].js }
    : Object.fromEntries(allNames.map(n => [n, all[n].html]))

  return {
    plugins: [vue(), cssInjectedByJsPlugin()],
    resolve: {
      alias: { '@map': resolve(__dirname, 'src') },
    },
    build: {
      outDir: resolve(__dirname, '../../../public/js'),
      emptyOutDir: false,
      cssCodeSplit: false,
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      sourcemap: false,
      assetsDir: '',                  // emit assets at app/ top level, no app/assets/
      chunkSizeWarningLimit: 2500,    // research-map is ~1.2 MB; tree-shaking already done
      rollupOptions: {
        input: buildEntries,
        output: isBuild ? {
          format: 'iife',
          name: `MapForge_${(target || '').replace(/[^a-zA-Z0-9_]/g, '_')}`,
          entryFileNames: '[name].js',
          assetFileNames: () => `${target}.[ext]`,
          inlineDynamicImports: true,
        } : {
          entryFileNames: '[name].js',
        },
      },
    },
  }
})
