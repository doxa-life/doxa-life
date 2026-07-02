#!/usr/bin/env node
/**
 * generate-manifest.mjs — build a semantic index of every bundle + its profiles.
 *
 * Scans app-profiles/<bundle>/*.vue (flat — profiles live directly in the bundle
 * folder), pulls the OPTIONAL JSDoc header tags from the top of each profile
 * (`@description`, `@profile`, `@element`, …), reads the custom-element tag(s) each
 * bundle registers in its index.js, and writes a single manifest.json:
 *
 *   { bundles: [ { bundle, output, elements, profiles: [ { profile, description, … } ] } ] }
 *
 * The header is purely optional — a profile with no header still appears, just with
 * an empty description. Extraction is a zero-dependency regex over the first 8 KB of
 * each file (the WordPress-header convention: keep the header near the top).
 *
 * Output: ../../../public/js/manifest.json (next to the built bundles, so a host or
 * CDN can fetch the index the same way it fetches a bundle). Override with
 * MANIFEST_OUT=/some/path.json for testing without writing into the host dir.
 *
 * Run standalone:  node generate-manifest.mjs
 * Wired into:      npm run build  (runs after the per-bundle vite builds)
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_PROFILES = resolve(__dirname, 'app-profiles')
const DEFAULT_OUT = resolve(__dirname, '../../../public/js/manifest.json')
const OUT = process.env.MANIFEST_OUT ? resolve(process.env.MANIFEST_OUT) : DEFAULT_OUT

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

/** Element tag names a bundle registers, read from its index.js. */
function extractElements(indexJsPath) {
  if (!existsSync(indexJsPath)) return []
  const src = readFileSync(indexJsPath, 'utf8')
  const tags = []
  for (const m of src.matchAll(DEFINE_RE)) if (!tags.includes(m[1])) tags.push(m[1])
  return tags
}

function build() {
  if (!existsSync(APP_PROFILES)) {
    console.error(`[generate-manifest] no app-profiles/ at ${APP_PROFILES}`)
    process.exit(1)
  }

  const bundles = []
  for (const entry of readdirSync(APP_PROFILES).sort()) {
    const dir = join(APP_PROFILES, entry)
    if (!isBundleDir(entry) || !statSync(dir).isDirectory()) continue

    // Flat profiles: *.vue directly in the bundle folder (no profiles/ subfolder).
    const vueFiles = readdirSync(dir).filter((f) => f.endsWith('.vue')).sort()
    if (vueFiles.length === 0) continue

    const profiles = vueFiles.map((file) => {
      const tags = extractHeaderTags(join(dir, file))
      const { description, file: fileTag, ...rest } = tags
      return {
        profile: file.replace(/\.vue$/, ''),
        file,
        description: description || fileTag || '',
        ...rest,                       // any other header tags (@bundle, @dataSource, …)
      }
    })

    // Representative-profile ordering: the app-shell plugin SCAN derives a bundle's
    // default profile AND its production/prototype tag from profiles[0]. A dev-only
    // profile whose name matches /template|example|starter|sample|demo|clone/ (e.g.
    // "research-map-clone" inside the production my-upg-100-list bundle) would, if it
    // sorted first alphabetically, mis-tag the whole bundle as a prototype. Sort those
    // prototype-pattern profiles LAST (stable within each group) so the real production
    // profile represents the bundle. Mirrors the SCAN's own regex.
    const PROTOTYPE_RE = /template|example|starter|sample|demo|clone/i
    profiles.sort((a, b) =>
      (PROTOTYPE_RE.test(a.profile) ? 1 : 0) - (PROTOTYPE_RE.test(b.profile) ? 1 : 0))

    bundles.push({
      bundle: entry,
      output: `public/js/${entry}.js`,
      elements: extractElements(join(dir, 'index.js')),
      profiles,
    })
  }

  // ── Vendored (pre-built, harvested) bundles ──────────────────────────────
  // Real map MFEs harvested from elsewhere ship as ready-made IIFE files in
  // public/js (NOT generated from app-profiles/) — e.g. pplr-data-maps.iife.js.
  // List them in vendored-bundles.json so the app-shell plugin SCAN catalogs
  // them alongside the locally-built bundles. Same entry shape:
  // { bundle, output, elements, profiles:[{profile,file,description}] }.
  const VENDORED = resolve(__dirname, 'vendored-bundles.json')
  if (existsSync(VENDORED)) {
    try {
      const vend = JSON.parse(readFileSync(VENDORED, 'utf8'))
      for (const vb of (vend.bundles || [])) {
        if (!bundles.some((b) => b.bundle === vb.bundle)) bundles.push(vb)
      }
    } catch (e) {
      console.error('[generate-manifest] vendored-bundles.json parse error:', e.message)
    }
  }

  const manifest = {
    schema: 'doxa-1040-maps-manifest@1',
    generatedFrom: 'app-profiles/*/*.vue (+ vendored-bundles.json)',
    bundleCount: bundles.length,
    profileCount: bundles.reduce((n, b) => n + (b.profiles?.length || 0), 0),
    bundles,
  }

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`[generate-manifest] wrote ${OUT} — ${manifest.bundleCount} bundles, ${manifest.profileCount} profiles`)
}

build()
