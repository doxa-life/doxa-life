// Process-level safety net for the production Bun runtime.
//
// @hono/node-server (pulled in via srvx) runs a request-body "drain" timer:
// when a response is sent without the request body being fully read, a
// setTimeout(forceClose) eventually calls incoming.socket.destroySoon().
// Under the Bun build that socket is a unenv polyfill whose destroySoon()
// calls this.destroy() — and unenv's getDuplex() loses the non-enumerable
// `destroy` method (Object.assign skips it), so the call throws
// `TypeError: this.destroy is not a function`. The throw originates in a
// detached timer with no try/catch, so it surfaces as an uncaughtException
// and Bun's default is to exit(1) — taking the whole server down and putting
// it into a deploy-restart crash loop. /mcp triggers it on every
// unauthenticated POST (it 401s before reading the body), so an MCP client's
// connect attempts alone keep killing the origin.
//
// This guard keeps the process alive when a detached timer throws. It is a
// containment net, not the cure — the real fix is to stop bundling unenv's
// node stubs under Bun so a native socket (with a working destroy) is used.
//
// Production runtime only: during the build-time prerender pass and in dev we
// want errors to surface (fail the build / show the crash) rather than be
// swallowed.
export default defineNitroPlugin(() => {
  if (import.meta.dev || import.meta.prerender) return

  process.on('uncaughtException', (err) => {
    console.error('[process-guard] uncaughtException (kept alive):', err)
  })
  process.on('unhandledRejection', (reason) => {
    console.error('[process-guard] unhandledRejection (kept alive):', reason)
  })
})
