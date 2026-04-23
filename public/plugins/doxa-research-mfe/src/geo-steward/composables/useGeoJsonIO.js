/**
 * useGeoJsonIO — Import + export GeoJSON FeatureCollections, with
 * embedded metadata.
 *
 * Export wraps the FeatureCollection in a small envelope so workflow
 * metadata (timestamp, author, source) round-trips with the data.
 *
 * @example
 *   const io = useGeoJsonIO();
 *   await io.exportGeoJson(features, { filename: 'export.geojson', metadata: { author: 'me' } });
 *   const parsed = io.parseGeoJson(jsonText);
 */
export function useGeoJsonIO() {

  /**
   * Wrap features in a FeatureCollection with metadata.
   */
  function buildFeatureCollection(features, metadata = {}) {
    return {
      type: 'FeatureCollection',
      _metadata: {
        exportedAt: new Date().toISOString(),
        ...metadata,
      },
      features: features || [],
    };
  }

  /**
   * Parse a GeoJSON string. Accepts either a bare FeatureCollection or
   * an envelope produced by buildFeatureCollection.
   */
  function parseGeoJson(text) {
    let data;
    try { data = JSON.parse(text); }
    catch (e) { throw new Error('Invalid JSON: ' + e.message); }
    if (data.type === 'FeatureCollection') {
      return {
        features: data.features || [],
        metadata: data._metadata || {},
      };
    }
    if (data.type === 'Feature') {
      return { features: [data], metadata: {} };
    }
    throw new Error('Not a GeoJSON FeatureCollection or Feature');
  }

  /**
   * Trigger a browser download of features as GeoJSON.
   */
  async function exportGeoJson(features, opts = {}) {
    const filename = opts.filename || 'export.geojson';
    const fc = buildFeatureCollection(features, opts.metadata || {});
    const text = JSON.stringify(fc, null, 2);
    const blob = new Blob([text], { type: 'application/geo+json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { filename, byteLength: text.length };
  }

  return {
    buildFeatureCollection,
    parseGeoJson,
    exportGeoJson,
  };
}
