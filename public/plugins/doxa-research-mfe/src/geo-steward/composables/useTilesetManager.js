/**
 * useTilesetManager — upload, build, and poll Mapbox tileset status.
 *
 * Three phases: stage upload → start tileset job → poll status.
 * Uses Mapbox Tilesets API (https://docs.mapbox.com/api/maps/mapbox-tiling-service/).
 * Requires server-issued credentials when used from a browser.
 *
 * @example
 *   const tm = useTilesetManager({ user, token });
 *   await tm.upload(file);
 *   const job = await tm.startJob(recipe);
 *   const status = await tm.poll(job.id);
 */
import { ref } from 'vue';

export function useTilesetManager(opts = {}) {
  const user  = opts.user  || '';
  const token = opts.token || '';
  const baseUrl = opts.baseUrl || 'https://api.mapbox.com';

  const status   = ref('idle');
  const message  = ref('');
  const progress = ref(null);

  async function _signedFetch(path, init = {}) {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${baseUrl}${path}${sep}access_token=${encodeURIComponent(token)}`;
    const r = await fetch(url, init);
    if (!r.ok) throw new Error(`${init.method || 'GET'} ${path} → ${r.status}: ${await r.text()}`);
    return r.json();
  }

  async function getCredentials() {
    return _signedFetch(`/uploads/v1/${user}/credentials`, { method: 'POST' });
  }

  async function upload(file, onProgress) {
    status.value = 'uploading';
    const creds = await getCredentials();
    // S3 PUT (browsers can't sign properly; this is illustrative — real prod uses an
    // SDK or pre-signed POST policy; here we demonstrate the credential flow).
    await fetch(creds.url, { method: 'PUT', body: file });
    progress.value = 0.5;
    return creds;
  }

  async function startJob(tilesetSourceId, recipe) {
    status.value = 'building';
    return _signedFetch(`/tilesets/v1/${user}.${tilesetSourceId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipe, name: tilesetSourceId }),
    });
  }

  async function poll(tilesetId, { intervalMs = 5000, maxTries = 120 } = {}) {
    for (let i = 0; i < maxTries; i++) {
      const job = await _signedFetch(`/tilesets/v1/${user}.${tilesetId}/jobs`);
      const last = (job?.[0]) || {};
      message.value = last.stage || '';
      progress.value = last.stage === 'success' ? 1 : last.stage === 'processing' ? 0.5 : 0.2;
      if (last.stage === 'success') { status.value = 'ready'; return last; }
      if (last.stage === 'failed')  { status.value = 'error'; throw new Error(last.errors?.[0]?.message || 'Tileset job failed'); }
      await new Promise(r => setTimeout(r, intervalMs));
    }
    throw new Error('Tileset job timed out');
  }

  return { status, message, progress, upload, startJob, poll };
}
