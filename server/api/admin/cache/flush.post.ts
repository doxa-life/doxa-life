// Admin: wipe every cached CMS page response (the entries written by
// defineCachedEventHandler in server/api/pages/[...slug].get.ts).
// Per-mutation purges keep the cache aligned in normal editor flows;
// this endpoint is the nuclear option for direct DB edits, imports,
// or any situation where the cache needs a hard reset.

import { defineEventHandler } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { purgeAllCmsCache } from '../../../utils/cmsCache'
import { logEvent } from '../../../utils/activity-logger'
import { getAuthUser } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'pages.manage')
  const user = await getAuthUser(event)
  const count = await purgeAllCmsCache()
  logEvent({
    eventType: 'CACHE_FLUSH',
    tableName: 'cache',
    userId: user?.userId,
    metadata: { scope: 'cms', purged: count }
  })
  return { ok: true, purged: count }
})
