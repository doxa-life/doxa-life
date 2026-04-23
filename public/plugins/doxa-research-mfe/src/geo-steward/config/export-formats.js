/**
 * export-formats.js — Supported export formats for the geo-steward
 * component library. Each entry is a hint for the UI; the actual export
 * is handled by the matching composable.
 */

export const EXPORT_FORMATS = [
  { id: 'geojson', label: 'GeoJSON', mime: 'application/geo+json', extension: 'geojson', composable: 'useGeoJsonIO' },
  { id: 'svg',     label: 'SVG',     mime: 'image/svg+xml',         extension: 'svg',     composable: 'SvgExporter' },
  { id: 'png',     label: 'PNG',     mime: 'image/png',             extension: 'png',     composable: 'useMapCapture' },
  { id: 'pdf',     label: 'PDF',     mime: 'application/pdf',       extension: 'pdf',     composable: '(use jsPDF)' },
];
