// Force IPv4 for ALL server-side fetches — this host's IPv6 route is dead.
//
// pray.doxa.life (Cloudflare) publishes both A (IPv4) and AAAA (IPv6) records.
// On this box the IPv6 path is unreachable: a raw TCP connect to the AAAA
// address fails instantly with ENETUNREACH, yet Node/undici's global `fetch`
// still attempts IPv6 and ends up `AggregateError { code: 'ETIMEDOUT' }` at
// `internalConnectMultiple` — which 500s every prayer-API route in dev
// (/api/countries, /api/people-groups/statistics, …). `curl -4` works from the
// same box, proving IPv4 is fine.
//
// VERIFIED what actually fixes it (Node 22):
//   - `dns.setDefaultResultOrder('ipv4first')`  → STILL ETIMEDOUT (undici ignores
//     the lookup order). This is why the same line in server/utils/countries.ts
//     was ineffective.
//   - undici Agent with `connect: { family: 4 }` → HTTP 200. ✅
//
// So we set a process-global undici dispatcher that forces IPv4 at the socket
// level, once, before any route fetch. `createRequire` keeps it synchronous (no
// startup race) and the try/catch makes it a safe no-op on runtimes without
// undici (e.g. the Bun production runtime, which has its own fetch and is not on
// the broken-IPv6 dev network anyway).
//
// The real cure is restoring this host's IPv6 route to Cloudflare; until then
// this is the dependency-light fix that unblocks local dev.
import { createRequire } from 'node:module'

export default defineNitroPlugin(() => {
  // Dev-only by design. In prod (Bun preset) this is already a no-op — Bun's fetch
  // is not undici and `require('undici')` won't resolve — but guard explicitly so a
  // future runtime change can never silently force IPv4-only on a healthy dual-stack
  // production host. `family: 4` is IPv4-ONLY at the socket layer, not a DNS reorder
  // (a reorder via dns.setDefaultResultOrder was tried and undici ignores it).
  if (!import.meta.dev) return
  try {
    const require = createRequire(import.meta.url)
    const { Agent, setGlobalDispatcher } = require('undici') as typeof import('undici')
    setGlobalDispatcher(new Agent({ connect: { family: 4 } }))
  } catch {
    // undici not available (non-Node runtime) — nothing to force; skip.
  }
})
