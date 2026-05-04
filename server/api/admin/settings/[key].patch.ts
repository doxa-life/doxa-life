import { readBody, getRouterParam, getHeader } from 'h3'
import { requirePermission } from '../../../utils/rbac'
import { logEvent } from '../../../utils/activity-logger'
import { getSetting, setSetting, isSettingKey } from '../../../utils/site-settings'

export default defineEventHandler(async (event) => {
  const admin = await requirePermission(event, 'settings.edit')

  const key = getRouterParam(event, 'key')
  if (!key || !isSettingKey(key)) {
    throw createError({ statusCode: 404, statusMessage: 'Unknown setting key' })
  }

  const body = await readBody(event)
  if (body === null || typeof body !== 'object' || !('value' in body)) {
    throw createError({ statusCode: 400, statusMessage: 'Body must include a `value` field' })
  }

  const previous = await getSetting(key)
  const previousReturned = await setSetting(key, body.value)

  await logEvent({
    eventType: 'admin_setting_changed',
    tableName: 'site_settings',
    recordId: key,
    userId: admin.userId,
    userAgent: getHeader(event, 'user-agent') || undefined,
    metadata: { key, from: previousReturned ?? previous, to: body.value }
  })

  return { key, value: await getSetting(key) }
})
