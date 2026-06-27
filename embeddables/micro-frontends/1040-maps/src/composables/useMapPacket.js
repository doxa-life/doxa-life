/**
 * useMapPacket — render a multi-page "prayer packet" PDF for a map selection.
 *
 * A packet is one cohesive PDF whose:
 *   - Page 1 = the full-bleed map image (reuses useMapPoster.render(spec,'png')
 *     so the map raster, hidden-map spin-up, and Mapbox attribution path are
 *     identical to the poster export — single source of truth).
 *   - Pages 2..N = one clean "detail card" per people group, drawn with jsPDF
 *     vector primitives (setFontSize / text / rect / line) so the cards stay
 *     crisp at any zoom and add almost nothing to the file size.
 *
 * People-group field reads are DEFENSIVE: the same object may arrive as a
 * normalized record from useMapData (top-level `name`, `country`, `population`,
 * `peoplePraying`, …), as a backward-compat `peopleGroups[]` entry, or as a
 * GeoJSON-feature `.properties` bag. We probe the known keys in priority order
 * and fall back to an em-dash so a card never renders blank labels.
 *
 * Mapbox / OpenStreetMap attribution is rendered into every page footer —
 * non-negotiable (Mapbox ToS), mirroring useMapPoster's footer slot.
 *
 * @example
 *   const packet = useMapPacket(getMap);
 *   const blob = await packet.renderPacket(spec, peopleGroups, { source: 'Doxa Life' });
 *   download(blob, 'prayer-packet.pdf');
 *
 * // Deps (already in package.json): "jspdf": "^4.2.1"
 */

import { ref, readonly } from 'vue';
import { useMapPoster } from './useMapPoster.js';

/**
 * @param {() => any} getMap  function returning the live Mapbox map
 * @returns {{
 *   renderPacket: (spec: import('./useMapPoster.js').PosterSpec, peopleGroups: Array<Object>, meta?: Object) => Promise<Blob>,
 *   progress: import('vue').Ref<{ phase: string, completed: number, total: number, message: string }>,
 *   isRendering: import('vue').Ref<boolean>
 * }}
 */
export function useMapPacket(getMap) {
  const progress    = ref({ phase: 'idle', completed: 0, total: 0, message: '' });
  const isRendering = ref(false);

  function _setProgress(phase, completed, total, message) {
    progress.value = { phase, completed, total, message };
  }

  /**
   * Render the multi-page packet PDF.
   * @param {import('./useMapPoster.js').PosterSpec} spec  same shape useMapPoster uses
   * @param {Array<Object>} peopleGroups  normalized people-group objects
   * @param {Object} [meta]  { source?, date?, attribution? }
   * @returns {Promise<Blob>}
   */
  async function renderPacket(spec, peopleGroups, meta = {}) {
    if (isRendering.value) throw new Error('useMapPacket: already rendering');

    isRendering.value = true;
    const groups = Array.isArray(peopleGroups) ? peopleGroups : [];
    const total  = 1 + groups.length; // page 1 = map, then one page per group

    try {
      _setProgress('map', 0, total, 'rendering map page');

      // Page 1 raster — reuse the poster renderer so the map image, attribution,
      // and hidden-map machinery are identical to the poster export path.
      const mapBlob   = await useMapPoster(getMap).render(spec, 'png');
      const mapDataUrl = await _blobToDataUrl(mapBlob);

      _setProgress('pdf-init', 1, total, 'building PDF');

      // Lazy ESM import — keep jspdf out of the main bundle until a packet is
      // actually requested. Mirrors useMapPoster._toPdfBlob exactly.
      let jsPDFCtor;
      try {
        const mod = await import('jspdf');
        jsPDFCtor = mod.jsPDF || mod.default;
      } catch (_) {
        throw new Error('useMapPacket: jspdf not installed (npm i jspdf)');
      }

      const doc = new jsPDFCtor({
        orientation: spec.widthIn > spec.heightIn ? 'l' : 'p',
        unit: 'in',
        format: [spec.widthIn, spec.heightIn],
      });

      const pageW = spec.widthIn;
      const pageH = spec.heightIn;

      const footer = _footerText(meta);

      // ─── Page 1: full-page map image ──────────────────────────────────────
      doc.addImage(mapDataUrl, 'PNG', 0, 0, pageW, pageH);
      _drawFooter(doc, pageW, pageH, footer);

      // ─── Pages 2..N: one detail card per people group ────────────────────
      for (let i = 0; i < groups.length; i++) {
        const pg = groups[i] || {};
        doc.addPage();
        _drawDetailCard(doc, pageW, pageH, pg, footer);
        _setProgress('cards', 2 + i, total, `card ${i + 1}/${groups.length}`);
      }

      _setProgress('done', total, total, 'packet complete');
      return doc.output('blob');
    } finally {
      isRendering.value = false;
    }
  }

  return {
    renderPacket,
    progress: readonly(progress),
    isRendering: readonly(isRendering),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Detail-card drawing (module-private)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Draw a single people-group detail card onto the current PDF page.
 * Uses only jsPDF vector primitives so output is crisp and tiny.
 */
function _drawDetailCard(doc, pageW, pageH, pg, footer) {
  const margin = Math.min(pageW, pageH) * 0.08;
  const x = margin;
  let   y = margin;

  // Heading: people-group name
  const name = _pgName(pg);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(20, 20, 20);
  doc.text(name, x, y + 0.32);
  y += 0.7;

  // Underline rule beneath the heading
  doc.setDrawColor(146, 177, 149); // #92b195 — the Doxa accent green
  doc.setLineWidth(0.02);
  doc.line(x, y, pageW - margin, y);
  y += 0.45;

  // Field rows
  const rows = [
    ['Country',        _pgCountry(pg)],
    ['Population',     _pgPopulation(pg)],
    ['% Evangelical',  _pgPercent(pg, 'evangelical')],
    ['% Christian',    _pgPercent(pg, 'christian')],
    ['Prayer count',   _pgPrayerCount(pg)],
  ];

  const labelX = x;
  const valueX = x + 2.4;
  const rowH   = 0.5;

  doc.setFontSize(14);
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 110, 110);
    doc.text(String(label), labelX, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(String(value), valueX, y);

    // hairline separator under each row
    doc.setDrawColor(225, 225, 225);
    doc.setLineWidth(0.008);
    doc.line(labelX, y + 0.14, pageW - margin, y + 0.14);

    y += rowH;
  }

  _drawFooter(doc, pageW, pageH, footer);
}

/**
 * Footer line drawn on every page: source • date • Mapbox/OSM attribution.
 */
function _drawFooter(doc, pageW, pageH, footer) {
  const margin = Math.min(pageW, pageH) * 0.04;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(footer, margin, pageH - margin, { baseline: 'bottom' });
}

function _footerText(meta = {}) {
  const date = meta.date || new Date().toISOString().slice(0, 10);
  const attribution = meta.attribution || '© Mapbox © OpenStreetMap';
  const parts = [];
  if (meta.source) parts.push(String(meta.source));
  parts.push(String(date));
  parts.push(attribution);
  return parts.join('  •  ');
}

// ──────────────────────────────────────────────────────────────────────────
// Defensive people-group field reads
// ──────────────────────────────────────────────────────────────────────────
// People-group objects reach us in three shapes (see useMapData.js +
// PeopleGroupDetail.vue): the normalized record (top-level keys), the
// backward-compat peopleGroups[] entry, and a GeoJSON feature `.properties`
// bag. `_props` flattens those so a single probe order works for all three.

function _props(pg) {
  // Prefer an explicit GeoJSON `.properties`, fall back to the object itself.
  return (pg && pg.properties) ? pg.properties : (pg || {});
}

function _firstDefined(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function _pgName(pg) {
  const p = _props(pg);
  return _firstDefined(
    p.name,
    p.peopleName,
    p.PeopNameInCountry,
    p._raw?.PeopNameInCountry,
    p._raw?.peo_name,
    pg.name,
  ) ?? '—';
}

function _pgCountry(pg) {
  const p = _props(pg);
  return _firstDefined(
    p.countryName,
    p.countryIsoLabel,
    p.country,
    p.countryIso,
    p._raw?.Country,
    pg.country,
  ) ?? '—';
}

function _pgPopulation(pg) {
  const p = _props(pg);
  const raw = _firstDefined(
    p.population,
    p._raw?.Population,
    pg.population,
  );
  const n = Number(String(raw ?? '').replace(/,/g, ''));
  if (raw === undefined || Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

/**
 * Percent fields. The pray-tools / UUPG records expose evangelical &
 * Christian percentages under several historical keys; probe them all and
 * format as a percentage with one decimal.
 */
function _pgPercent(pg, kind) {
  const p = _props(pg);
  const candidates = kind === 'evangelical'
    ? [p.percentEvangelical, p.pctEvangelical, p.evangelical, p._raw?.PercentEvangelical, p._raw?.percent_evangelical]
    : [p.percentChristian, p.pctChristian, p.percentAdherents, p.christian, p._raw?.PercentChristianPC, p._raw?.percent_christian, p._raw?.PercentAdherents];
  const raw = _firstDefined(...candidates);
  if (raw === undefined) return '—';
  const n = Number(raw);
  if (Number.isNaN(n)) return '—';
  // Some sources store 0..1 fractions, others 0..100; normalize to percent.
  const pct = n > 0 && n <= 1 ? n * 100 : n;
  return `${pct.toFixed(1)}%`;
}

function _pgPrayerCount(pg) {
  const p = _props(pg);
  const raw = _firstDefined(
    p.peoplePraying,
    p._raw?.people_praying,
    pg.peoplePraying,
  );
  if (raw === undefined) return '—';
  const n = Number(raw);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

// ──────────────────────────────────────────────────────────────────────────
// Blob → dataURL
// ──────────────────────────────────────────────────────────────────────────

function _blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('useMapPacket: failed to read map blob'));
    reader.readAsDataURL(blob);
  });
}
