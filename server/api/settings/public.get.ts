import { getSettings, PUBLIC_SETTING_KEYS } from '../../utils/site-settings'

export default defineEventHandler(async () => {
  return await getSettings(PUBLIC_SETTING_KEYS)
})
