/**
 * Back-compat shim. The original colors.js was split into
 * config/color-strategies/<strategy>.js during the 1040-maps refactor
 * (Round 1C). New code should import from those files directly. This shim
 * keeps existing imports of LANGUAGE_FAMILY_COLORS / AFFINITY_BLOCK_COLORS /
 * RESOURCE_COLORS / DOXA_REGION_COLORS / COLOR_MODES / etc. working.
 *
 * Source of truth: doxa-research-mfe/src/config/colors.js (research wins).
 * canonicalFamilyName was simple-only at the time of split — now lives in
 * color-strategies/language-family.js.
 */

// COLOR_MODES is the canonical constant lookup; pulled from the strategy registry
export { COLOR_MODES } from './color-strategies/_registry.js';

// Resource palette + names + priority list
export {
    PALETTE as RESOURCE_COLORS,
    RESOURCE_NAMES,
    RESOURCE_PRIORITY
} from './color-strategies/resource.js';

// Doxa-region palette + helpers
export {
    PALETTE as DOXA_REGION_COLORS,
    REGION_COLOR_ALIASES,
    getRegionColor
} from './color-strategies/doxa-region.js';

// Affinity-block palette + helpers (NAMES, lookups, getters)
export {
    AFFINITY_BLOCK_NAMES,
    PALETTE as AFFINITY_BLOCK_COLORS,
    AFFINITY_BLOCK_NAME_TO_CODE,
    AFFINITY_BLOCK_COLORS_BY_NAME,
    getAffinityBlockName,
    getAffinityBlockColorByCode,
    getAffinityBlockColor,
    getAffinityBlocksArray,
    getAffinityBlockData,
    affinityBlockCodeToName,
    affinityBlockCodeToColor,
    affinityBlockNameToCode,
    affinityBlockColors,
    affinityBlockCodeLookup
} from './color-strategies/affinity-block.js';

// Language-family palette + helpers (canonicalFamilyName lives here now)
export {
    PALETTE as LANGUAGE_FAMILY_COLORS,
    getLanguageFamilyColor,
    canonicalFamilyName,
    languageFamilyColors,
    defaultFamilyColor
} from './color-strategies/language-family.js';

// System-level dispatcher: getColor(system, key) — kept here because it spans
// multiple strategies. Imports the per-strategy lookups locally to dispatch.
import { getRegionColor as _getRegionColor } from './color-strategies/doxa-region.js';
import { getAffinityBlockColor as _getAffinityBlockColor } from './color-strategies/affinity-block.js';
import { getLanguageFamilyColor as _getLanguageFamilyColor } from './color-strategies/language-family.js';

export function getColor(system, key) {
    switch (system) {
        case 'region':
        case 'doxaRegion':
            return _getRegionColor(key);
        case 'affinityBlock':
            return _getAffinityBlockColor(key);
        case 'languageFamily':
            return _getLanguageFamilyColor(key);
        default:
            return '#95a5a6';
    }
}
