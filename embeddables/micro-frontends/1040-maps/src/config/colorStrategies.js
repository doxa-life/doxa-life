/**
 * Back-compat shim. The original colorStrategies.js was split into
 * config/color-strategies/<strategy>.js + a registry during the 1040-maps
 * refactor (Round 1C). New code should import from
 * './color-strategies/_registry.js' directly. This shim keeps existing
 * imports of COLOR_MODES / colorStrategies / getColorStrategy /
 * buildColorExpression / getFeatureColor / ENGAGEMENT_* / ADOPTION_* working.
 */

export {
    COLOR_MODES,
    colorStrategies,
    getColorStrategy,
    buildColorExpression,
    getFeatureColor
} from './color-strategies/_registry.js';

// Engagement palette + labels (now live in their split file)
export {
    ENGAGEMENT_COLORS,
    ENGAGEMENT_LABELS
} from './color-strategies/engagement.js';

// Adoption palette + labels (now live in their split file)
export {
    ADOPTION_COLORS,
    ADOPTION_LABELS
} from './color-strategies/adoption.js';
