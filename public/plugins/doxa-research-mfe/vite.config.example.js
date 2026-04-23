/**
 * vite.config.example.js — doxa-research-mfe
 * ─────────────────────────────────────────────────────────────────────────────
 * Reference example showing how to build this MFE into the plugin's own
 * `app/` folder, which is served by the parent Nuxt app at:
 *
 *   /plugins/doxa-research-mfe/app/research-map.iife.js
 *   /plugins/doxa-research-mfe/app/research-map.css
 *
 * The live config (vite.config.js) is already set up this way. This file
 * exists as a commented template if you need to copy the setup elsewhere.
 *
 * Mapbox GL is declared `external` — it is loaded as a CDN <script> in the
 * host page (window.mapboxgl) and intentionally NOT bundled. Keeps the IIFE
 * small and lets multiple embeds share the cached library.
 *
 * OPTIONAL: to also copy the bundle to additional targets after each build,
 * uncomment the deployToTargets() plugin below and add paths.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { fileURLToPath, URL } from 'node:url'
// import { copyFileSync, mkdirSync } from 'node:fs'

// ── OPTIONAL: extra deploy targets (uncomment + fill in to enable) ──────────
// const DEPLOY_TARGETS = [
//   // Example: '/path/to/other/public/bundles/research-map',
// ]

// function deployToTargets() {
//   return {
//     name: 'deploy-to-targets',
//     closeBundle() {
//       for (const target of DEPLOY_TARGETS) {
//         try {
//           mkdirSync(target, { recursive: true })
//           copyFileSync(resolve(__dirname, 'app/research-map.iife.js'), `${target}/research-map.iife.js`)
//           copyFileSync(resolve(__dirname, 'app/research-map.css'),     `${target}/research-map.css`)
//           console.log(`  ✅ deployed → ${target}`)
//         } catch (err) {
//           console.warn(`  ⚠️  Could not copy to ${target}: ${err.message}`)
//         }
//       }
//     }
//   }
// }

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag === 'doxa-map'
        }
      }
    })
    // deployToTargets(),
  ],

  define: {
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify('production')
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },

  build: {
    outDir: 'app',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/entry.js'),
      name: 'ResearchMap',
      fileName: 'research-map',
      formats: ['iife']
    },
    rollupOptions: {
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
    sourcemap: true,
    minify: 'terser'
  },

  server: {
    port: 5173,
    host: true,
    open: false
  }
})
