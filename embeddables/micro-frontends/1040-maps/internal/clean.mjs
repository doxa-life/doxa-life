#!/usr/bin/env node
/**
 * clean.mjs — wipe + recreate the default output tree root before a build.
 *
 * The output folder name is configurable (vite.1040-maps-build-config.json `name`, default
 * "doxa-maps"), so this reads the same config instead of hardcoding the name —
 * otherwise renaming the tree would leave a stale folder behind. Runs BEFORE the
 * per-bundle vite builds (which emit into app/<name>/); generate-tree.mjs runs after.
 */
import { readFileSync, rmSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function treeName() {
  try {
    const cfg = JSON.parse(readFileSync(resolve(__dirname, '..', 'vite.1040-maps-build-config.json'), 'utf8'))
    if (cfg && typeof cfg.name === 'string' && cfg.name.trim()) return cfg.name.trim()
  } catch { /* fall through */ }
  return 'doxa-maps'
}

const root = resolve(__dirname, '..', 'app', treeName())
rmSync(root, { recursive: true, force: true })
mkdirSync(root, { recursive: true })
console.log(`[clean] reset ${root}`)
