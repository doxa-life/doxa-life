// Port of marketing-theme/js/components/src/main.ts (the
// `getPeopleGroupsStatistics` function). Fetches totals from
// `pray.doxa.life/api/people-groups/statistics` and exposes them as
// reactive refs plus a `reload()` method. Consumers render their own
// counters and progress bars; in the original source the DOM was updated
// imperatively via `#prayer-current-status`, `#adopted-current-status`
// etc. — we leave that imperative side-effect up to the page templates
// to keep the composable side-effect free.

export interface PrayerStatistics {
  total_with_prayer: number
  total_with_full_prayer: number
  total_adopted: number
}

const TOTAL_PEOPLE_GROUPS = 2085

export function usePrayerStatistics() {
  const config = useRuntimeConfig()
  const prayBaseUrl = config.public.prayBaseUrl as string

  const stats = useState<PrayerStatistics>('prayer-stats', () => ({
    total_with_prayer: 0,
    total_with_full_prayer: 0,
    total_adopted: 0
  }))
  const loading = useState<boolean>('prayer-stats-loading', () => false)
  const error = useState<Error | null>('prayer-stats-error', () => null)

  async function reload() {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${prayBaseUrl}/api/people-groups/statistics`)
      const data = await response.json()
      stats.value = {
        total_with_prayer: Number(data.total_with_prayer || 0),
        total_with_full_prayer: Number(data.total_with_full_prayer || 0),
        total_adopted: Number(data.total_adopted || 0)
      }
    } catch (e) {
      error.value = e as Error
      console.error('Error:', e)
    } finally {
      loading.value = false
    }
  }

  const prayerCoveragePercent = computed(
    () => Math.min(100, (stats.value.total_with_full_prayer / TOTAL_PEOPLE_GROUPS) * 100)
  )
  const adoptedPercent = computed(
    () => Math.min(100, (stats.value.total_adopted / TOTAL_PEOPLE_GROUPS) * 100)
  )

  return {
    stats: readonly(stats),
    loading: readonly(loading),
    error: readonly(error),
    prayerCoveragePercent,
    adoptedPercent,
    reload,
    TOTAL_PEOPLE_GROUPS
  }
}
