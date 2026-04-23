/**
 * useMapboxStylesAPI — thin wrapper around the Mapbox Styles API for
 * dynamic style edits. Updates a style document at api.mapbox.com.
 *
 * Requires a SECRET token (`sk.…`) with `styles:write`. Never embed in a
 * client-only deployment — use a server-side proxy. This composable is
 * provided for build/admin workflows.
 *
 * @example
 *   const api = useMapboxStylesAPI({ user, token: secretToken });
 *   const style = await api.getStyle(styleId);
 *   style.layers.push(newLayer);
 *   await api.saveStyle(styleId, style);
 */
export function useMapboxStylesAPI(opts = {}) {
  const baseUrl = opts.baseUrl || 'https://api.mapbox.com/styles/v1';
  const user    = opts.user    || (typeof window !== 'undefined' && window.MAPBOX_USER) || '';
  const token   = opts.token   || '';

  if (!user)  console.warn('useMapboxStylesAPI: missing user (Mapbox username)');
  if (!token) console.warn('useMapboxStylesAPI: missing token');

  function _url(path) {
    return `${baseUrl}/${user}${path ? '/' + path : ''}?access_token=${encodeURIComponent(token)}`;
  }

  async function getStyle(styleId) {
    const r = await fetch(_url(styleId));
    if (!r.ok) throw new Error(`getStyle ${styleId} → ${r.status}`);
    return r.json();
  }

  async function saveStyle(styleId, style) {
    const r = await fetch(_url(styleId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(style),
    });
    if (!r.ok) throw new Error(`saveStyle ${styleId} → ${r.status}: ${await r.text()}`);
    return r.json();
  }

  async function listStyles() {
    const r = await fetch(_url(''));
    if (!r.ok) throw new Error(`listStyles → ${r.status}`);
    return r.json();
  }

  return { getStyle, saveStyle, listStyles };
}
