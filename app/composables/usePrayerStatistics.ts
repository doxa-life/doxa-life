// Port of marketing-theme/js/components/src/main.ts (the
// `getPeopleGroupsStatistics` function). Fetches totals from our own
// server route `/api/people-groups/statistics` (which proxies+caches
// `pray.doxa.life/api/people-groups/statistics`) and exposes them as
// reactive refs plus a `reload()` method. Consumers render their own
// counters and progress bars; in the original source the DOM was updated
// imperatively via `#prayer-current-status`, `#adopted-current-status`
// etc. — we leave that imperative side-effect up to the page templates
// to keep the composable side-effect free.

export interface PrayerStatistics {
  total: number
  total_with_prayer: number
  total_with_full_prayer: number
  total_adopted: number
}

// Fallback denominator used only when the upstream API hasn't responded
// yet (first paint on a cold cache, or upstream failure). Prevents a
// divide-by-zero in the percent computeds.
const FALLBACK_TOTAL = 2085

export function usePrayerStatistics() {
  const { locale } = useI18n()

  const stats = useState<PrayerStatistics>('prayer-stats', () => ({
    total: 0,
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
      const data = await $fetch<PrayerStatistics>('/api/people-groups/statistics')
      stats.value = {
        total: Number(data.total || 0),
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

  // SSR-friendly loader: populates the shared `stats` state during the
  // server render via useAsyncData, so denominators render correctly on
  // first paint without a client-side flicker.
  async function ensureLoaded() {
    if (stats.value.total > 0) return
    await useAsyncData('prayer-stats', async () => {
      const data = await $fetch<PrayerStatistics>('/api/people-groups/statistics')
      stats.value = {
        total: Number(data.total || 0),
        total_with_prayer: Number(data.total_with_prayer || 0),
        total_with_full_prayer: Number(data.total_with_full_prayer || 0),
        total_adopted: Number(data.total_adopted || 0)
      }
      return stats.value
    })
  }

  const totalPeopleGroups = computed(() => stats.value.total || FALLBACK_TOTAL)
  // Use the active locale's grouping separator (e.g. "2.085" in de, "2 085"
  // in fr/ru) but force Latin digits via the `-u-nu-latn` numbering system so
  // the count matches the Western digits used everywhere else on the page —
  // the raw numerator counts and the numbers hardcoded in translated strings
  // (e.g. "144", "202"). Without this, ar would render Eastern-Arabic digits.
  const totalPeopleGroupsFormatted = computed(() =>
    totalPeopleGroups.value.toLocaleString(`${locale.value}-u-nu-latn`)
  )

  const prayerCoveragePercent = computed(
    () => Math.min(100, (stats.value.total_with_full_prayer / totalPeopleGroups.value) * 100)
  )
  const adoptedPercent = computed(
    () => Math.min(100, (stats.value.total_adopted / totalPeopleGroups.value) * 100)
  )

  return {
    stats: readonly(stats),
    loading: readonly(loading),
    error: readonly(error),
    totalPeopleGroups,
    totalPeopleGroupsFormatted,
    prayerCoveragePercent,
    adoptedPercent,
    reload,
    ensureLoaded
  }
}
