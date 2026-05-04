/**
 * useMapPoster — render a Mapbox GL map to a poster-grade PNG or PDF blob.
 *
 * Two render paths:
 *   1. Single-canvas (≤4096² output, fast):
 *      - Spin up a hidden map at the requested poster pixel size.
 *      - Override window.devicePixelRatio for the hidden map only.
 *      - Wait for `idle`, capture via getCanvas().toDataURL().
 *      - Composite overlay (title, legend, scale, north, footer) on a 2D canvas.
 *
 *   2. Tile-stitch (>4096², size-aware fallback):
 *      - Iterate an N×M grid of viewports on the hidden map at TILE_PX each.
 *      - For each tile: jumpTo, await idle, capture, paint into the master canvas.
 *      - Memory-bound — caller should be aware.
 *
 * If the requested pixel size > 4096 in either dimension AND the user requested
 * the single-canvas path, we auto-switch to tile-stitch with a console warning.
 *
 * Mapbox attribution is ALWAYS rendered into the footer slot — non-negotiable
 * (Mapbox ToS).
 *
 * @example
 *   const poster = useMapPoster(getMap);
 *   const blob = await poster.render(spec, 'png');
 *   download(blob, 'research-map.png');
 *
 * // TODO package.json deps when you wire this:
 * //   "jspdf": "^4.2.1",
 * //   "svg2pdf.js": "^2.5.0",
 * //   "pdf-lib": "^1.17.1",
 * //   "@pdf-lib/fontkit": "^1.1.1"
 */

import { ref, readonly } from 'vue';
import { computeLayout } from './usePosterLayout.js';

const MAX_SINGLE_CANVAS = 4096;       // WebGL safe ceiling for most hardware
const TILE_PX           = 2048;        // tile size for stitch path
const IDLE_TIMEOUT_MS   = 15000;

/**
 * @typedef {Object} PosterMargins
 * @property {number} top    inches
 * @property {number} right  inches
 * @property {number} bottom inches
 * @property {number} left   inches
 */

/**
 * @typedef {Object} PosterSlots
 * @property {Object}  [title]    { text, subtitle?, align? }
 * @property {Object}  [legend]   { rows: Array, type?: string }
 * @property {boolean} [scaleBar]
 * @property {boolean} [north]
 * @property {Object}  [footer]   { left?, right?, attribution? }
 */

/**
 * @typedef {Object} PosterSpec
 * @property {number}                widthIn
 * @property {number}                heightIn
 * @property {150|200|300}           dpi
 * @property {'portrait'|'landscape'} orientation
 * @property {PosterMargins}         margins
 * @property {number}                bleed         inches
 * @property {PosterSlots}           slots
 * @property {'auto'|'single'|'stitch'} [renderPath='auto']
 * @property {string}                [filename]
 * @property {AbortSignal}           [signal]
 */

/**
 * @param {() => any} getSourceMap  function returning the live Mapbox map
 * @returns {{
 *   render: (spec: PosterSpec, format: 'png'|'pdf') => Promise<Blob>,
 *   progress: import('vue').Ref<{ phase: string, completed: number, total: number, message: string }>,
 *   isRendering: import('vue').Ref<boolean>,
 *   cancel: () => void
 * }}
 */
export function useMapPoster(getSourceMap) {
  const progress    = ref({ phase: 'idle', completed: 0, total: 0, message: '' });
  const isRendering = ref(false);
  let   abortCtrl   = null;

  /**
   * Render the poster.
   * @param {PosterSpec} spec
   * @param {'png'|'pdf'} [format='png']
   * @returns {Promise<Blob>}
   */
  async function render(spec, format = 'png') {
    if (isRendering.value) throw new Error('useMapPoster: already rendering');
    const sourceMap = getSourceMap();
    if (!sourceMap) throw new Error('useMapPoster: no source map');

    abortCtrl = new AbortController();
    const signal = mergeSignals(spec.signal, abortCtrl.signal);

    isRendering.value = true;
    _setProgress('init', 0, 1, 'preparing render');

    try {
      const px         = posterPixels(spec);
      const renderPath = decidePath(spec.renderPath || 'auto', px);

      if (renderPath === 'single' && (px.width > MAX_SINGLE_CANVAS || px.height > MAX_SINGLE_CANVAS)) {
        // user explicitly requested single but exceeded WebGL ceiling — auto-switch
        // eslint-disable-next-line no-console
        console.warn(
          `[useMapPoster] requested single-canvas ${px.width}×${px.height}px > ${MAX_SINGLE_CANVAS}; ` +
          `auto-switching to tile-stitch.`
        );
      }

      const finalPath = (renderPath === 'single' &&
                         (px.width > MAX_SINGLE_CANVAS || px.height > MAX_SINGLE_CANVAS))
        ? 'stitch'
        : renderPath;

      const baseRaster = (finalPath === 'single')
        ? await _renderSingleCanvas(sourceMap, px, signal)
        : await _renderTileStitch(sourceMap, px, signal);

      _setProgress('compose', 0, 1, 'compositing overlay');
      const composed = await _composeOverlay(baseRaster, spec, px);

      _setProgress('encode', 0, 1, `encoding ${format.toUpperCase()}`);
      const blob = (format === 'pdf')
        ? await _toPdfBlob(composed, spec)
        : await _canvasToBlob(composed, 'image/png');

      _setProgress('done', 1, 1, 'render complete');
      return blob;
    } finally {
      isRendering.value = false;
      abortCtrl = null;
    }
  }

  function cancel() {
    if (abortCtrl) abortCtrl.abort();
  }

  function _setProgress(phase, completed, total, message) {
    progress.value = { phase, completed, total, message };
  }

  // ─── Single-canvas path ────────────────────────────────────────────────
  async function _renderSingleCanvas(sourceMap, px, signal) {
    _setProgress('hidden-map', 0, 1, 'creating hidden map');
    const { hiddenMap, restoreDpr, container } = await _spawnHiddenMap(sourceMap, px.width, px.height);
    try {
      _throwIfAborted(signal);
      await _waitForIdle(hiddenMap);
      _throwIfAborted(signal);
      _setProgress('capture', 0, 1, 'capturing canvas');
      const dataUrl = hiddenMap.getCanvas().toDataURL('image/png');
      const img = await _loadImage(dataUrl);
      const canvas = document.createElement('canvas');
      canvas.width  = px.width;
      canvas.height = px.height;
      canvas.getContext('2d').drawImage(img, 0, 0, px.width, px.height);
      return canvas;
    } finally {
      try { hiddenMap.remove(); } catch (_) { /* noop */ }
      if (container?.parentNode) container.parentNode.removeChild(container);
      restoreDpr();
    }
  }

  // ─── Tile-stitch path ──────────────────────────────────────────────────
  async function _renderTileStitch(sourceMap, px, signal) {
    const cols = Math.ceil(px.width  / TILE_PX);
    const rows = Math.ceil(px.height / TILE_PX);
    const total = cols * rows;
    _setProgress('hidden-map', 0, total, `creating hidden map (${cols}×${rows} tiles)`);

    // Build a hidden map sized exactly to ONE tile; we'll re-aim it per tile.
    const sourceBounds = sourceMap.getBounds();
    const sourceCenter = sourceMap.getCenter();
    const sourceZoom   = sourceMap.getZoom();
    const sourceBearing = sourceMap.getBearing();
    const sourcePitch  = sourceMap.getPitch();

    const { hiddenMap, restoreDpr, container } = await _spawnHiddenMap(sourceMap, TILE_PX, TILE_PX, {
      preserveBounds: true,
      bounds: sourceBounds,
    });

    try {
      const master = document.createElement('canvas');
      master.width  = px.width;
      master.height = px.height;
      const ctx = master.getContext('2d');

      // Compute the geographic span per tile by projecting the source's bounds
      // into a rectangle and slicing it. We keep the source's bearing/pitch.
      const ne = sourceBounds.getNorthEast();
      const sw = sourceBounds.getSouthWest();
      const lngSpan = ne.lng - sw.lng;
      const latSpan = ne.lat - sw.lat;
      const lngStep = lngSpan / cols;
      const latStep = latSpan / rows;

      let completed = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          _throwIfAborted(signal);
          const tileSw = [sw.lng + (c     * lngStep), ne.lat - ((r + 1) * latStep)];
          const tileNe = [sw.lng + ((c + 1) * lngStep), ne.lat - (r     * latStep)];
          hiddenMap.fitBounds([tileSw, tileNe], { padding: 0, animate: false, duration: 0 });
          await _waitForIdle(hiddenMap);
          const tileUrl = hiddenMap.getCanvas().toDataURL('image/png');
          const img = await _loadImage(tileUrl);

          // tile fills 0..TILE_PX, but the last col/row may have a partial tile.
          const dx = c * TILE_PX;
          const dy = r * TILE_PX;
          const dw = Math.min(TILE_PX, px.width  - dx);
          const dh = Math.min(TILE_PX, px.height - dy);
          ctx.drawImage(img, 0, 0, TILE_PX, TILE_PX, dx, dy, dw, dh);

          completed++;
          _setProgress('stitch', completed, total, `tile ${completed}/${total}`);
        }
      }

      // restore source map view (in case we share a token bucket etc.)
      sourceMap.jumpTo({ center: sourceCenter, zoom: sourceZoom, bearing: sourceBearing, pitch: sourcePitch });

      return master;
    } finally {
      try { hiddenMap.remove(); } catch (_) { /* noop */ }
      if (container?.parentNode) container.parentNode.removeChild(container);
      restoreDpr();
    }
  }

  // ─── Overlay compositing ──────────────────────────────────────────────
  async function _composeOverlay(baseCanvas, spec, px) {
    const layout = computeLayout(spec, px);
    const ctx = baseCanvas.getContext('2d');

    // Render slots as SVG strings → rasterize → drawImage onto base canvas.
    const slotSvgs = await _collectSlotSvgs(spec, layout);
    for (const slot of slotSvgs) {
      const img = await _svgStringToImage(slot.svg, slot.box.w, slot.box.h);
      ctx.drawImage(img, slot.box.x, slot.box.y, slot.box.w, slot.box.h);
    }
    return baseCanvas;
  }

  // Collects SVG markup for each enabled slot. Components render their own
  // SVG; here we just stub the strings — actual SVG building is mostly done
  // inside the slot components (PosterPreview path) or inline (server path).
  async function _collectSlotSvgs(spec, layout) {
    const out = [];
    if (spec.slots?.title)    out.push({ box: layout.title,    svg: _stubTitleSvg(spec, layout.title) });
    if (spec.slots?.legend)   out.push({ box: layout.legend,   svg: _stubLegendSvg(spec, layout.legend) });
    if (spec.slots?.scaleBar) out.push({ box: layout.scaleBar, svg: _stubScaleSvg(spec, layout.scaleBar) });
    if (spec.slots?.north)    out.push({ box: layout.north,    svg: _stubNorthSvg(spec, layout.north) });
    // Footer is ALWAYS present (attribution is mandatory).
    out.push({ box: layout.footer, svg: _stubFooterSvg(spec, layout.footer) });
    return out;
  }

  return {
    render,
    progress: readonly(progress),
    isRendering: readonly(isRendering),
    cancel,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers (module-private)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Convert a PosterSpec to its raster pixel dimensions, honoring orientation.
 * @param {PosterSpec} spec
 * @returns {{ width: number, height: number, dpi: number }}
 */
export function posterPixels(spec) {
  let w = spec.widthIn;
  let h = spec.heightIn;
  if (spec.orientation === 'landscape' && h > w) [w, h] = [h, w];
  if (spec.orientation === 'portrait'  && w > h) [w, h] = [h, w];
  const dpi = spec.dpi || 300;
  return {
    width:  Math.round(w * dpi),
    height: Math.round(h * dpi),
    dpi,
  };
}

function decidePath(requested, px) {
  if (requested === 'single' || requested === 'stitch') return requested;
  if (px.width > MAX_SINGLE_CANVAS || px.height > MAX_SINGLE_CANVAS) return 'stitch';
  return 'single';
}

/**
 * Spawn a hidden map sized to the requested pixel dimensions.
 * Restores window.devicePixelRatio after construction (the hidden map
 * captures the value at init; subsequent restoration is safe).
 */
async function _spawnHiddenMap(sourceMap, w, h, opts = {}) {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; top: -100000px; left: -100000px;
    width: ${w}px; height: ${h}px; pointer-events: none; visibility: hidden;
  `;
  document.body.appendChild(container);

  const originalDpr = window.devicePixelRatio;
  const restoreDpr  = () => { try { Object.defineProperty(window, 'devicePixelRatio', { value: originalDpr, configurable: true }); } catch (_) { /* noop in strict envs */ } };
  try {
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
  } catch (_) {
    // Some environments lock devicePixelRatio; fall back silently.
  }

  // Lazy-grab mapboxgl off the global — same pattern as useMapInstance.
  // eslint-disable-next-line no-undef
  const mapboxgl = (typeof window !== 'undefined' ? window.mapboxgl : null);
  if (!mapboxgl) throw new Error('useMapPoster: mapboxgl global not found');

  const styleObj = sourceMap.getStyle();

  const hiddenMap = new mapboxgl.Map({
    container,
    style: styleObj,
    center: sourceMap.getCenter(),
    zoom:   sourceMap.getZoom(),
    bearing: sourceMap.getBearing(),
    pitch:   sourceMap.getPitch(),
    interactive: false,
    attributionControl: false,
    preserveDrawingBuffer: true,
    fadeDuration: 0,
  });

  await new Promise((resolve, reject) => {
    let done = false;
    const t = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error('useMapPoster: hidden map style.load timeout'));
    }, IDLE_TIMEOUT_MS);
    hiddenMap.once('style.load', () => {
      if (done) return;
      done = true;
      clearTimeout(t);
      resolve();
    });
  });

  if (opts.preserveBounds && opts.bounds) {
    hiddenMap.fitBounds(opts.bounds, { padding: 0, animate: false, duration: 0 });
  }

  return { hiddenMap, restoreDpr, container };
}

function _waitForIdle(map) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const t = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('useMapPoster: hidden map idle timeout'));
    }, IDLE_TIMEOUT_MS);
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      requestAnimationFrame(() => resolve());
    };
    if (map.loaded() && !map.isMoving()) {
      finish();
    } else {
      map.once('idle', finish);
    }
  });
}

function _loadImage(srcOrBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = (e) => reject(new Error('image load failed: ' + (e?.message || 'unknown')));
    img.src = (typeof srcOrBlob === 'string')
      ? srcOrBlob
      : URL.createObjectURL(srcOrBlob);
  });
}

function _svgStringToImage(svgStr, w, h) {
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('svg load failed: ' + (e?.message || 'unknown')));
    };
    img.width  = w;
    img.height = h;
    img.src    = url;
  });
}

function _canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), type);
  });
}

async function _toPdfBlob(canvas, spec) {
  // Lazy ESM import — keeps jspdf out of the main bundle until poster is used.
  // jsPDF / svg2pdf must be added to package.json (see header).
  let jsPDFCtor;
  try {
    const mod = await import('jspdf');
    jsPDFCtor = mod.jsPDF || mod.default;
  } catch (_) {
    throw new Error('useMapPoster.toPdf: jspdf not installed (npm i jspdf svg2pdf.js)');
  }
  const dataUrl = canvas.toDataURL('image/png');
  const orient  = (canvas.width > canvas.height) ? 'l' : 'p';
  const pdf = new jsPDFCtor({
    orientation: orient,
    unit: 'in',
    format: [spec.widthIn, spec.heightIn],
  });
  pdf.addImage(dataUrl, 'PNG', 0, 0, spec.widthIn, spec.heightIn);
  return pdf.output('blob');
}

function _throwIfAborted(signal) {
  if (signal?.aborted) {
    throw new DOMException('useMapPoster: aborted', 'AbortError');
  }
}

function mergeSignals(...signals) {
  const ctrl = new AbortController();
  for (const s of signals) {
    if (!s) continue;
    if (s.aborted) { ctrl.abort(); break; }
    s.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  return ctrl.signal;
}

// ─── Stub SVG builders for the headless render path ───────────────────────
// These produce minimal SVG so the headless render still has *something* in
// each slot. Live preview uses the real Vue slot components instead.

function _stubTitleSvg(spec, box) {
  const t = (spec.slots?.title?.text || '').replace(/[<>&]/g, _esc);
  const s = (spec.slots?.title?.subtitle || '').replace(/[<>&]/g, _esc);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${box.w}" height="${box.h}" viewBox="0 0 ${box.w} ${box.h}">
      <rect width="100%" height="100%" fill="rgba(255,255,255,0.92)"/>
      <text x="20" y="${box.h * 0.55}" font-family="Inter, system-ui, sans-serif"
            font-size="${Math.min(box.h * 0.5, 64)}" font-weight="700" fill="#0a0a0a">${t}</text>
      ${s ? `<text x="20" y="${box.h * 0.85}" font-family="Inter, system-ui, sans-serif"
            font-size="${Math.min(box.h * 0.22, 28)}" fill="#444">${s}</text>` : ''}
    </svg>`;
}

function _stubLegendSvg(spec, box) {
  const rows = spec.slots?.legend?.rows || [];
  const items = rows.slice(0, 24).map((r, i) => {
    const y = 30 + i * 26;
    const c = (r.color || '#999').replace(/[<>&]/g, _esc);
    const l = (r.label || '').replace(/[<>&]/g, _esc);
    return `<g><rect x="14" y="${y - 14}" width="18" height="18" fill="${c}" stroke="#222" stroke-width="0.5"/><text x="42" y="${y}" font-family="Inter, sans-serif" font-size="14" fill="#111">${l}</text></g>`;
  }).join('');
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${box.w}" height="${box.h}" viewBox="0 0 ${box.w} ${box.h}">
      <rect width="100%" height="100%" fill="rgba(255,255,255,0.94)" stroke="#ccc"/>
      <text x="14" y="20" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#111">Legend</text>
      ${items}
    </svg>`;
}

function _stubScaleSvg(_spec, box) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${box.w}" height="${box.h}" viewBox="0 0 ${box.w} ${box.h}">
      <rect x="0" y="${box.h - 18}" width="${box.w * 0.9}" height="6" fill="#000"/>
      <text x="0" y="${box.h - 22}" font-family="Inter, sans-serif" font-size="12" fill="#111">scale</text>
    </svg>`;
}

function _stubNorthSvg(_spec, box) {
  const s = Math.min(box.w, box.h);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${box.w}" height="${box.h}" viewBox="0 0 ${s} ${s}">
      <polygon points="${s/2},4 ${s*0.65},${s*0.85} ${s/2},${s*0.7} ${s*0.35},${s*0.85}" fill="#111"/>
      <text x="${s/2}" y="${s*0.98}" text-anchor="middle" font-family="Inter, sans-serif" font-size="${s*0.18}" fill="#111">N</text>
    </svg>`;
}

function _stubFooterSvg(spec, box) {
  const left  = (spec.slots?.footer?.left  || '').replace(/[<>&]/g, _esc);
  const right = (spec.slots?.footer?.right || '').replace(/[<>&]/g, _esc);
  // Mapbox attribution is mandatory.
  const attribution = (spec.slots?.footer?.attribution || '© Mapbox © OpenStreetMap');
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${box.w}" height="${box.h}" viewBox="0 0 ${box.w} ${box.h}">
      <rect width="100%" height="100%" fill="rgba(255,255,255,0.92)"/>
      <text x="14" y="${box.h * 0.55}" font-family="Inter, sans-serif" font-size="12" fill="#222">${left}</text>
      <text x="${box.w / 2}" y="${box.h * 0.55}" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" fill="#222">${attribution}</text>
      <text x="${box.w - 14}" y="${box.h * 0.55}" text-anchor="end" font-family="Inter, sans-serif" font-size="12" fill="#222">${right}</text>
    </svg>`;
}

function _esc(ch) {
  return ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : '&amp;';
}
