/**
 * Back-compat shim. The original mapConfig.js was renamed to mapDefaults.js
 * during the 1040-maps refactor (Round 1C). New code should import from
 * './mapDefaults.js' directly. This shim keeps existing imports of
 * `mapDefaults` / `LAYER_ORDER` from `../config/mapConfig.js` working.
 */
export { mapDefaults, LAYER_ORDER } from './mapDefaults.js';
export { default } from './mapDefaults.js';
