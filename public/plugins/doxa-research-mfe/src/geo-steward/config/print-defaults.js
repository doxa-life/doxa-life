/**
 * print-defaults.js — Default print layout dimensions, fonts, margins.
 * Used by usePrintDialog and PrintDialog. Override per-profile.
 */

export const PRINT_DEFAULTS = {
  page: {
    size:    'letter',     // 'letter' | 'a4' | 'tabloid'
    orient:  'landscape',  // 'portrait' | 'landscape'
    marginIn: 0.5,
  },
  fonts: {
    title:  '18pt sans-serif',
    body:   '10pt sans-serif',
    legend: '8pt sans-serif',
  },
  layout: {
    showTitle:    true,
    showLegend:   true,
    showMetadata: true,
    titleHeightIn: 0.5,
    legendWidthIn: 1.5,
  },
};
