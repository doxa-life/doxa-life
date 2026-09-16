/**
 * GET /api/maps/token.json  — alias of GET /api/maps/token
 *
 * The drop-in maps' token ladder (public/js/doxa-maps-build/**) defaults its
 * rung-5 TOKEN_SRC to `/api/maps/token.json`, but the real endpoint is
 * `/api/maps/token` (no `.json`). Rather than editing every committed drop-in
 * artifact (which would be overwritten on the next drop-in refresh), we expose
 * the same handler under the `.json` path so the leaf maps
 * (engagement / prayer / adoption / …) resolve the token unchanged.
 * Newer drop-ins try the canonical `/api/maps/token` first and fall back here,
 * so this alias mainly serves pages built before that change.
 */
export { default } from './token.get'
