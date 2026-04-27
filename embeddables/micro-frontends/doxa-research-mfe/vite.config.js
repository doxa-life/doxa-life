import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'

/**
 * inlineCssIntoIife — after the IIFE bundle and its sibling .css have been
 * written, read the CSS, prepend a tiny runtime injector to the .iife.js
 * that adds a single <style> tag to document.head on first execution, then
 * delete the standalone .css file. End result: ONE deployable artifact
 * (research-map.iife.js) that brings its own styles. No extra <link> tag
 * needed in the host page.
 */
function inlineCssIntoIife({ jsName, cssName }) {
  return {
    name: 'inline-css-into-iife',
    apply: 'build',
    closeBundle() {
      const outDir = this.options?.dir
      const root = outDir || resolve(__dirname, '../../../public/js')
      const jsPath = resolve(root, jsName)
      const cssPath = resolve(root, cssName)
      if (!existsSync(jsPath) || !existsSync(cssPath)) return
      const css = readFileSync(cssPath, 'utf8')
      const js = readFileSync(jsPath, 'utf8')
      // JSON.stringify safely escapes backticks, backslashes, newlines, etc.
      const injector =
        '(function(){if(typeof document==="undefined")return;' +
        'var s=document.createElement("style");' +
        's.setAttribute("data-doxa-research-mfe","");' +
        's.textContent=' + JSON.stringify(css) + ';' +
        'document.head.appendChild(s);})();\n'
      writeFileSync(jsPath, injector + js, 'utf8')
      unlinkSync(cssPath)
      console.log('[inline-css] merged ' + cssName + ' into ' + jsName)
    }
  }
}

/**
 * vite.config.js — doxa-research-mfe
 *
 * Builds a single self-contained IIFE bundle that registers <doxa-map>
 * directly into the doxa-life Nuxt site's public/js/ folder, where the
 * page <script src>'s it like any other static asset. No intermediate
 * dist/ + copy-plugin step — outDir IS the publish target.
 *
 * Path is resolved relative to this config (../../../public/js) so the
 * build works on any machine and in CI without absolute paths.
 *
 * Output (in <repo>/doxa-life/public/js/):
 *   research-map.iife.js
 *   research-map.css
 *
 * Mapbox GL is loaded as a CDN <script> in the host page (window.mapboxgl)
 * and is intentionally NOT bundled — keeps the IIFE small and shares the
 * cached library across embeds on the same site.
 */
const PUBLIC_JS = resolve(__dirname, '../../../public/js')

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // <doxa-map> is a native custom element, not a Vue component
          isCustomElement: tag => tag === 'doxa-map'
        }
      }
    }),
    inlineCssIntoIife({
      jsName: 'research-map.iife.js',
      cssName: 'research-map.css'
    })
  ],

  define: {
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify('production')
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    dedupe: ['vue', 'vue-i18n', 'pinia']
  },

  build: {
    outDir: PUBLIC_JS,
    // Critical: outDir is shared with sibling MFE bundles (e.g.
    // doxa-simple-map.iife.js). Never empty it — that would nuke them.
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/entry.js'),
      name: 'ResearchMap',
      fileName: 'research-map',
      formats: ['iife']
    },
    rollupOptions: {
      // Mapbox GL stays external — provided by host page as window.mapboxgl
      external: ['mapbox-gl'],
      output: {
        globals: { 'mapbox-gl': 'mapboxgl' },
        inlineDynamicImports: true,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'research-map.css'
          return assetInfo.name
        }
      }
    },
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      }
    }
  },

  server: {
    port: 5173,
    host: true,
    open: false
  }
})
