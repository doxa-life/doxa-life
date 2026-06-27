/**
 * Back-compat shim. apiBaseUrl.js moved into the `api-connections/` seam folder
 * during the seam-organization refactor (card #25). New code should import from
 * '@map/api-connections/_registry.js' (or '@map/api-connections/apiBaseUrl.js').
 * This shim keeps existing `@map/utils/apiBaseUrl.js` imports working.
 */
export { getApiBaseUrl } from '../api-connections/apiBaseUrl.js'
