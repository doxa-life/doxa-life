// Server-side cached proxy to campaigns-sever's `/api/people-groups/statistics`.
// The composable `usePrayerStatistics` calls this so the upstream is only hit
// once per cache window per server instance — and so the live `total` (all
// people groups, used by the pray/adopt denominators) and `total_unengaged`
// (the homepage count) can drive the numbers that used to be hardcoded as
// 2,085 in templates.

import { defineCachedEventHandler } from 'nitropack/runtime'

export interface PrayerStatisticsResponse {
  total: number
  total_unengaged: number
  total_population: number
  unengaged_population: number
  total_with_prayer: number
  total_with_full_prayer: number
  total_adopted: number
  people_committed: string
  committed_duration: string
}

export default defineCachedEventHandler(
  async (): Promise<PrayerStatisticsResponse> => {
    const config = useRuntimeConfig()
    const prayBaseUrl = String(config.public.prayBaseUrl || '').replace(/\/$/, '')
    const data = await $fetch<Partial<PrayerStatisticsResponse>>(
      `${prayBaseUrl}/api/people-groups/statistics`,
      { timeout: 10_000 }
    )
    return {
      total: Number(data.total || 0),
      total_unengaged: Number(data.total_unengaged || 0),
      total_population: Number(data.total_population || 0),
      unengaged_population: Number(data.unengaged_population || 0),
      total_with_prayer: Number(data.total_with_prayer || 0),
      total_with_full_prayer: Number(data.total_with_full_prayer || 0),
      total_adopted: Number(data.total_adopted || 0),
      people_committed: String(data.people_committed || '0'),
      committed_duration: String(data.committed_duration || '0')
    }
  },
  {
    maxAge: 60 * 60,
    swr: true,
    name: 'people-groups-statistics'
  }
)
