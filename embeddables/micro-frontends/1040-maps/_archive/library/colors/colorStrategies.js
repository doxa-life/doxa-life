/**
 * Back-compat shim. The original colorStrategies.js was split into
 * per-strategy files (now `library/colors/<strategy>.js`) + a registry during
 * the 1040-maps refactor (Round 1C). New code should import from
 * './_registry.js' directly. This shim keeps existing
 * imports of COLOR_MODES / colorStrategies / getColorStrategy /
 * buildColorExpression / getFeatureColor / ENGAGEMENT_* / ADOPTION_* working.
 */

export {
    COLOR_MODES,
    colorStrategies,
    getColorStrategy,
    buildColorExpression,
    getFeatureColor
} from './_registry.js';

// Engagement palette + labels (now live in their split file)
export {
    ENGAGEMENT_COLORS,
    ENGAGEMENT_LABELS
} from './engagement.js';

// Adoption palette + labels (now live in their split file)
export {
    ADOPTION_COLORS,
    ADOPTION_LABELS
} from './adoption.js';
