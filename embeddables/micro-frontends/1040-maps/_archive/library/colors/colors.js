/**
 * Back-compat shim. The original colors.js was split into per-strategy files
 * (now `library/colors/<strategy>.js`) during the 1040-maps refactor
 * (Round 1C). New code should import from those files directly. This shim
 * keeps existing imports of LANGUAGE_FAMILY_COLORS / COLOR_MODES / etc. working.
 * (AFFINITY_BLOCK_* / RESOURCE_* / DOXA_REGION_* moved to research-only strategy
 * files under app-profiles/doxa-research-map/src/colors/ — registry-resolved.)
 *
 * Source of truth: doxa-research-mfe/src/config/colors.js (research wins).
 * canonicalFamilyName was simple-only at the time of split — now lives in
 * ./language-family.js.
 */

// COLOR_MODES is the canonical constant lookup; pulled from the strategy registry
export { COLOR_MODES } from './_registry.js';

// Resource palette + names + priority — EXTRACTED to app-profiles/doxa-research-map/
// src/colors/resource.js (research-only strategy). No longer re-exported from
// the shared shim; the research bundle loads it via its local src/colors glob
// into the registry. Consumers that need resource colors should read them from the
// registry (COLOR_MODES.RESOURCE) / their profile, not this shared shim.

// Doxa-region palette + helpers — EXTRACTED to app-profiles/doxa-research-map/
// src/colors/doxa-region.js (research-only strategy). No longer re-exported
// from the shared shim; research-map loads it via its local src/colors glob
// into the registry. Consumers that need region colors should read them from the
// registry / their profile, not this shared shim.

// Affinity-block palette + helpers — EXTRACTED to app-profiles/doxa-research-map/
// src/colors/affinity-block.js (research-only strategy). No longer re-exported
// from the shared shim; the research bundle loads it via its local src/colors
// glob into the registry. Consumers that need affinity-block colors should read them
// from the registry (COLOR_MODES.AFFINITY_BLOCK) / their profile, not this shared shim.

// Language-family palette + helpers (canonicalFamilyName lives here now)
export {
    PALETTE as LANGUAGE_FAMILY_COLORS,
    getLanguageFamilyColor,
    canonicalFamilyName,
    languageFamilyColors,
    defaultFamilyColor
} from './language-family.js';

// System-level dispatcher: getColor(system, key) — kept here because it spans
// multiple strategies. Imports the per-strategy lookups locally to dispatch.
// NOTE: region ('region'/'doxaRegion') and affinity-block ('affinityBlock') are now
// research-only strategies loaded via the research bundle's local src/colors
// glob; the shared dispatcher no longer resolves them (returns the default).
// Research code should resolve them through the registry / its own strategy.
import { getLanguageFamilyColor as _getLanguageFamilyColor } from './language-family.js';

export function getColor(system, key) {
    switch (system) {
        case 'languageFamily':
            return _getLanguageFamilyColor(key);
        default:
            return '#95a5a6';
    }
}
