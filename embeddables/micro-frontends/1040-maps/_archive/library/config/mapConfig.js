/**
 * Back-compat shim. The original mapConfig.js was renamed to mapDefaults.js
 * during the 1040-maps refactor (Round 1C), and mapDefaults.js later moved to
 * `constants/`. New code should import from '@map/constants/mapDefaults.js'
 * directly. This shim keeps existing imports of `mapDefaults` / `LAYER_ORDER`
 * from `../config/mapConfig.js` working.
 */
export { mapDefaults, LAYER_ORDER } from '../constants/mapDefaults.js';
export { default } from '../constants/mapDefaults.js';
