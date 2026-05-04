import { requirePermission } from '../../../utils/rbac'
import { getSettings, SETTING_KEYS } from '../../../utils/site-settings'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.view')
  return await getSettings(SETTING_KEYS)
})
