/**
 * useStaticImage — Mapbox Static Images API wrapper with circuit breaker.
 *
 * Adapted from vue-geo-steward's `static-image-service.js` (1011 lines), kept
 * to ~280 lines by stripping polygon-specific subdivision/HD code. We keep:
 *
 *   • Web-Mercator aspect-ratio math (necessary for any bounded request)
 *   • Circuit breaker (errorCount → maxErrors → cooldown)
 *   • Bounded retries with exponential backoff
 *   • Optional GeoJSON polygon overlay
 *
 * Token resolution order:
 *   1. opts.token        (explicit)
 *   2. opts.injectToken()  (e.g. inject('mapboxToken'))
 *   3. window.MAPBOX_TOKEN
 *
 * @example
 *   const svc = useStaticImage({ injectToken: () => inject('mapboxToken') });
 *   const blob = await svc.fetchImage({
 *     style: 'mapbox/satellite-streets-v12',
 *     bounds: { minx, miny, maxx, maxy },
 *     widthPx: 1280, heightPx: 1280
 *   });
 */

import { ref, readonly } from 'vue';

const MAX_PX     = 1280;             // Mapbox Static API hard ceiling
const MAX_RETRY  = 3;
const RETRY_BASE = 400;              // ms

/**
 * @typedef {Object} BBox
 * @property {number} minx
 * @property {number} miny
 * @property {number} maxx
 * @property {number} maxy
 *
 * @typedef {Object} StaticImageRequest
 * @property {string}        style         e.g. "mapbox/satellite-streets-v12" or full mapbox:// URL
 * @property {BBox}          bounds
 * @property {number}        widthPx       requested px (capped at MAX_PX)
 * @property {number}        heightPx      requested px (capped at MAX_PX)
 * @property {Object}        [overlay]     optional GeoJSON-like { coordinates, color }
 * @property {boolean}       [retina]      use @2x suffix
 * @property {AbortSignal}   [signal]
 */

export function useStaticImage(opts = {}) {
  const isFetching = ref(false);
  const lastError  = ref(null);
  const breaker = ref({
    errorCount: 0,
    maxErrors: 10,
    isOpen: false,
    openedAt: 0,
    cooldownMs: 30_000,
  });

  function _resolveToken() {
    if (opts.token) return opts.token;
    if (typeof opts.injectToken === 'function') {
      try {
        const t = opts.injectToken();
        if (t) return t;
      } catch (_) { /* inject() outside setup throws — ignore */ }
    }
    if (typeof window !== 'undefined' && window.MAPBOX_TOKEN) return window.MAPBOX_TOKEN;
    return null;
  }

  function _checkBreaker() {
    if (!breaker.value.isOpen) return;
    if (Date.now() - breaker.value.openedAt > breaker.value.cooldownMs) {
      // cooldown elapsed — reset
      breaker.value = { ...breaker.value, errorCount: 0, isOpen: false, openedAt: 0 };
      return;
    }
    throw new Error('useStaticImage: circuit breaker open (too many recent errors)');
  }

  function _recordError(err) {
    lastError.value = err;
    const next = { ...breaker.value, errorCount: breaker.value.errorCount + 1 };
    if (next.errorCount >= next.maxErrors) {
      next.isOpen = true;
      next.openedAt = Date.now();
      // eslint-disable-next-line no-console
      console.error('[useStaticImage] circuit breaker tripped after', next.errorCount, 'errors');
    }
    breaker.value = next;
  }

  function _resetBreaker() {
    breaker.value = { ...breaker.value, errorCount: 0, isOpen: false, openedAt: 0 };
  }

  /**
   * Build the Static API URL.
   * @param {StaticImageRequest} req
   * @returns {string}
   */
  function buildUrl(req) {
    const token = _resolveToken();
    if (!token) throw new Error('useStaticImage: no Mapbox token (pass opts.token or inject mapboxToken)');

    const w = Math.min(req.widthPx  || MAX_PX, MAX_PX);
    const h = Math.min(req.heightPx || MAX_PX, MAX_PX);

    // Normalize style — accept "mapbox://styles/x/y" OR "x/y"
    let style = req.style || 'mapbox/streets-v12';
    style = style.replace(/^mapbox:\/\/styles\//, '');

    const { minx, miny, maxx, maxy } = req.bounds;
    const retina = req.retina ? '@2x' : '';

    if (req.overlay && req.overlay.coordinates) {
      const feature = {
        type: 'Feature',
        properties: {
          'fill': req.overlay.color || '#ff0000',
          'fill-opacity': req.overlay.fillOpacity ?? 0.05,
          'stroke': req.overlay.strokeColor || req.overlay.color || '#ff0000',
          'stroke-width': req.overlay.strokeWidth ?? 4,
          'stroke-opacity': req.overlay.strokeOpacity ?? 1,
        },
        geometry: { type: 'Polygon', coordinates: req.overlay.coordinates },
      };
      const fc = { type: 'FeatureCollection', features: [feature] };
      const enc = encodeURIComponent(JSON.stringify(fc));
      return `https://api.mapbox.com/styles/v1/${style}/static/geojson(${enc})/[${minx},${miny},${maxx},${maxy}]/${w}x${h}${retina}?access_token=${token}`;
    }

    return `https://api.mapbox.com/styles/v1/${style}/static/[${minx},${miny},${maxx},${maxy}]/${w}x${h}${retina}?access_token=${token}`;
  }

  /**
   * Fetch a single static image as a Blob, with retries + circuit breaker.
   * @param {StaticImageRequest} req
   * @returns {Promise<Blob>}
   */
  async function fetchImage(req) {
    _checkBreaker();
    isFetching.value = true;
    let attempt = 0;
    try {
      while (true) {
        attempt++;
        try {
          const url = buildUrl(req);
          const res = await fetch(url, { signal: req.signal });
          if (!res.ok) throw new Error(`Mapbox Static API ${res.status}: ${res.statusText}`);
          return await res.blob();
        } catch (err) {
          if (req.signal?.aborted) throw err;
          if (attempt >= MAX_RETRY) {
            _recordError(err);
            throw err;
          }
          await _sleep(RETRY_BASE * Math.pow(2, attempt - 1));
        }
      }
    } finally {
      isFetching.value = false;
    }
  }

  /**
   * Fetch a static image and return it as a data URL.
   * @param {StaticImageRequest} req
   * @returns {Promise<string>}
   */
  async function fetchDataUrl(req) {
    const blob = await fetchImage(req);
    return _blobToDataUrl(blob);
  }

  /**
   * Compute Web-Mercator-correct aspect ratio for a bbox. Use this to size
   * the requested pixels so the resulting image is undistorted.
   * @param {BBox} b
   */
  function webMercatorAspectRatio(b) {
    const proj = (lng, lat) => {
      const x = (lng + 180) / 360;
      const sinLat = Math.sin(lat * Math.PI / 180);
      const y = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI);
      return [x, y];
    };
    const [x1, y1] = proj(b.minx, b.miny);
    const [x2, y2] = proj(b.maxx, b.maxy);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    return { aspectRatio: w / h, projectedWidth: w, projectedHeight: h };
  }

  /**
   * Given a target height, return matching pixel dimensions for a bbox that
   * preserve the Web-Mercator aspect.
   * @param {BBox} bounds
   * @param {number} targetHeightPx
   */
  function pixelsForBounds(bounds, targetHeightPx = MAX_PX) {
    const { aspectRatio } = webMercatorAspectRatio(bounds);
    const h = Math.min(targetHeightPx, MAX_PX);
    const w = Math.min(Math.round(h * aspectRatio), MAX_PX);
    return { widthPx: w, heightPx: h, aspectRatio };
  }

  return {
    isFetching: readonly(isFetching),
    lastError:  readonly(lastError),
    breaker:    readonly(breaker),
    buildUrl,
    fetchImage,
    fetchDataUrl,
    webMercatorAspectRatio,
    pixelsForBounds,
    resetBreaker: _resetBreaker,
  };
}

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function _blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result);
    r.onerror   = () => reject(r.error || new Error('FileReader failed'));
    r.readAsDataURL(blob);
  });
}
