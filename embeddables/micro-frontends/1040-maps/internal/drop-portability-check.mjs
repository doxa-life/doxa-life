#!/usr/bin/env node
/**
 * drop-portability-check.mjs — the executable half of the commit-2 DONE gate #1
 * (Driver 2026-07-11: "paste that folder into Cloudflare Drop and it would work").
 *
 * A dropped/subpath-hosted tree breaks on ROOT-RELATIVE references ("/doxa-maps/...",
 * src="/...", href="/...") — they resolve against the HOST origin, not the tree.
 * Position-independence = every intra-tree reference is RELATIVE (./ or ../).
 *
 * Usage:  node internal/drop-portability-check.mjs [treeDir]
 *         (default treeDir: app/<name> read from vite.1040-maps-build-config.json)
 * Exit 0 = PORTABLE (drop-safe) · Exit 1 = root-relative refs found (listed).
 *
 * Wired into package.json after `tree`:  "check:drop": "node internal/drop-portability-check.mjs"
 * TEST-THE-SEE: run BEFORE the relative-path fix -> must FAIL listing manifest.json refs;
 * after the fix -> PASS; a tree with only ./relative refs must stay PASS (benign case).
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const bundlerRoot = resolve(here, '..');

let treeDir = process.argv[2];
if (!treeDir) {
  let name = 'doxa-maps';
  const cfgPath = join(bundlerRoot, 'vite.1040-maps-build-config.json');
  if (existsSync(cfgPath)) {
    try { name = JSON.parse(readFileSync(cfgPath, 'utf8')).name || name; } catch {}
  }
  treeDir = join(bundlerRoot, 'app', name);
}
if (!existsSync(treeDir)) {
  console.error(`drop-portability-check: tree not found: ${treeDir} (run the build first)`);
  process.exit(1);
}

// Root-relative reference patterns that break under subpath hosting.
// Matches "/anything/... inside href/src/url attrs and JSON string values, but NOT
// protocol URLs (https://, //cdn) and NOT data:/#.
const ATTR_RE = /(?:src|href)\s*=\s*"(\/(?!\/)[^"]*)"/g;          // src="/..." href="/..."
const JSON_RE = /"(?:iframeUrl|scriptUrl|url|embedUrl|output)"\s*:\s*"(\/(?!\/)[^"]*)"/g;

const findings = [];
function scan(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) { scan(p); continue; }
    if (!/\.(html|json)$/.test(e)) continue;
    const text = readFileSync(p, 'utf8');
    const rel = relative(treeDir, p);
    for (const re of [ATTR_RE, JSON_RE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) findings.push({ file: rel, ref: m[1] });
    }
  }
}
scan(treeDir);

if (findings.length) {
  console.error(`DROP-PORTABILITY: FAIL — ${findings.length} root-relative ref(s); tree breaks under subpath hosting (Cloudflare-Drop class):`);
  const byFile = {};
  for (const f of findings) (byFile[f.file] ||= []).push(f.ref);
  for (const [file, refs] of Object.entries(byFile)) {
    console.error(`  ${file}  (${refs.length})`);
    for (const r of refs.slice(0, 4)) console.error(`     ${r}`);
    if (refs.length > 4) console.error(`     … +${refs.length - 4} more`);
  }
  console.error('FIX: make intra-tree refs RELATIVE (./bundle/profile/...); absolute embed snippets are computed at RUNTIME from location.');
  process.exit(1);
}
console.log(`DROP-PORTABILITY: PASS — no root-relative refs; tree is position-independent (file://, Drop, subpath, Railway all behave identically).`);
