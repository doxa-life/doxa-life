/**
 * GET /api/maps/token.json  — alias of GET /api/maps/token
 *
 * The drop-in maps' token ladder (public/js/doxa-maps-build/**) defaults its
 * rung-5 TOKEN_SRC to `/api/maps/token.json`, but the real endpoint is
 * `/api/maps/token` (no `.json`). Rather than editing every committed drop-in
 * artifact (which would be overwritten on the next drop-in refresh), we expose
 * the same handler under the `.json` path so the leaf maps
 * (engagement / prayer / adoption / …) resolve the token unchanged.
 *
 * See eco-dx/deployment-cycle/backlog.json → DXM-002.
 */
export { default } from './token.get'
