/**
 * Back-compat shim. DataSourceManager.js moved into the `api-connections/` seam
 * folder during the seam-organization refactor (card #25). New code should
 * import from '@map/api-connections/_registry.js' (or
 * '@map/api-connections/DataSourceManager.js'). This shim keeps existing
 * `@map/utils/DataSourceManager.js` imports (3 app-profiles + the barrel)
 * working.
 */
export { DataSourceManager, dataSourceManager } from '../api-connections/DataSourceManager.js'
export { default } from '../api-connections/DataSourceManager.js'
