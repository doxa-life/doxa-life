/**
 * workflow-steps.js — Default workflow step definitions for the
 * geo-steward component library. Override per-profile by importing and
 * mutating; or pass your own array to useWorkflow().
 */

export const POLYGON_WORKFLOW_STEPS = [
  {
    id:    'select',
    title: 'Select polygons',
    description: 'Click polygons on the map or use the list to select.',
  },
  {
    id:    'review',
    title: 'Review selection',
    description: 'Confirm your selection before committing.',
  },
  {
    id:    'commit',
    title: 'Commit',
    description: 'Apply the action to selected polygons.',
  },
  {
    id:    'export',
    title: 'Export',
    description: 'Download GeoJSON or print the result.',
  },
];

export const TILESET_WORKFLOW_STEPS = [
  { id: 'choose-source', title: 'Choose source data' },
  { id: 'configure',     title: 'Configure recipe' },
  { id: 'upload',        title: 'Upload + build' },
  { id: 'verify',        title: 'Verify on map' },
];
