/**
 * Back-compat shim. The original prayerColors.js was moved into
 * ./prayer-progress.js (this folder) during the 1040-maps refactor
 * (Round 1C). New code should import from
 * './prayer-progress.js' directly. This shim keeps existing
 * imports of PRAYER_COLORS / PRAYER_LABELS / FULL_PRAYER_THRESHOLD /
 * getPrayerLevel / getPrayerColor / checkHasPrayer / checkHasFullPrayer working.
 */

export {
    FULL_PRAYER_THRESHOLD,
    PRAYER_COLORS,
    PRAYER_LABELS,
    getPrayerLevel,
    getPrayerColor,
    checkHasPrayer,
    checkHasFullPrayer
} from './prayer-progress.js';
