import { IncomingMessage } from 'node-mock-http'

// Backfill the missing `destroy()` on node-mock-http's mock Socket.
//
// The bun preset serves via Bun.serve and fakes Node's HTTP API with
// node-mock-http. Its mock Socket exposes destroySoon() — which calls
// this.destroy() — but is missing destroy() itself: an
// Object.assign-over-non-enumerable-methods bug drops it from the prototype.
// The MCP SDK bridges requests through @hono/node-server, whose request-body
// drain calls socket.destroySoon() ~500ms after each request, so the missing
// destroy() throws `TypeError: this.destroy is not a function` and — coming
// from a detached timer — takes the whole process down (deploy-restart crash
// loop). 00-process-guards.ts is the backstop; this removes the crash at the
// source so it never fires.
//
// node-mock-http is already at its latest (1.0.4) and the MCP SDK pins
// @hono/node-server to 1.x (whose newest still calls destroySoon() unguarded),
// so there's no upgrade that fixes this — hence the runtime prototype patch.
// Purely additive (only fills in a missing method), so it's safe in every mode.
export default defineNitroPlugin(() => {
  const socketProto = Object.getPrototypeOf(new IncomingMessage().socket)
  if (socketProto && typeof socketProto.destroy !== 'function') {
    socketProto.destroy = function (this: { destroyed: boolean }) {
      this.destroyed = true
      return this
    }
  }
})
