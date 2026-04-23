<template>
  <div class="prayer-laps">
    <div class="plap-header">{{ t('prayerLaps.header') }}</div>
    <div class="plap-body">
      <div class="plap-left">
        <span class="plap-label">{{ t('prayerLaps.lap') }}</span>
        <span class="plap-icon">↻</span>
        <span class="plap-number">{{ lapNumber }}</span>
      </div>
      <div class="plap-divider"></div>
      <div class="plap-right">
        <span class="plap-label">{{ t('prayerLaps.upgs') }}</span>
        <span class="plap-count">
          <span class="plap-covered">{{ coveredCount }}</span>
          <span class="plap-sep">{{ t('prayerLaps.separator') }}</span>
          <span class="plap-total">{{ totalCount }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useShadowStyles } from '../composables/useShadowStyles.js'
// TODO: `checkHasPrayer` lives in DOXA's `config/prayerColors.js` and decides
// whether a feature counts as "covered". Replace with an injected predicate
// or a generic `coveredPredicate` prop so the component is data-source agnostic.
// import { checkHasPrayer } from '../config/prayerColors.js'

const { t } = useI18n()

useShadowStyles(`
.prayer-laps{background:#1a1a2e;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.25);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
.plap-header{background:#16213e;color:rgba(255,255,255,0.55);font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:6px 14px;border-bottom:1px solid rgba(255,255,255,0.08);}
.plap-body{display:flex;align-items:center;padding:10px 14px;gap:0;}
.plap-left{display:flex;align-items:baseline;gap:5px;flex:1;}
.plap-right{display:flex;align-items:baseline;gap:5px;flex:1;justify-content:flex-end;}
.plap-label{font-size:11px;color:rgba(255,255,255,0.5);font-weight:500;text-transform:uppercase;letter-spacing:0.5px;}
.plap-icon{font-size:16px;color:#3498db;line-height:1;}
.plap-number{font-size:22px;font-weight:700;color:#fff;line-height:1;}
.plap-divider{width:1px;height:32px;background:rgba(255,255,255,0.12);margin:0 12px;flex-shrink:0;}
.plap-count{font-size:14px;font-weight:600;color:#fff;}
.plap-covered{color:#2ecc71;}
.plap-sep{color:rgba(255,255,255,0.4);font-size:12px;font-weight:400;}
.plap-total{color:rgba(255,255,255,0.7);}
`, 'prayer-laps')

const props = defineProps({
  lapNumber: {
    type: Number,
    default: 1
  },
  /**
   * Predicate to count a feature as "covered". Defaults to a no-op (returns
   * false), so the covered count will be 0 until the consuming app provides
   * a real predicate (e.g. one based on the data source's prayer-status field).
   */
  coveredPredicate: {
    type: Function,
    default: () => false
  }
})

const dataStore = inject('dataStore')

// Count all people groups across all loaded data sources
const allPeopleGroups = computed(() => {
  const allSources = Object.values(dataStore?.sources || {})
  return allSources.flatMap(src => src?.features || [])
})

const totalCount = computed(() => allPeopleGroups.value.length)

const coveredCount = computed(() => {
  return allPeopleGroups.value.filter(item => {
    const props_ = item.properties || item
    return props.coveredPredicate(props_)
  }).length
})
</script>

<style scoped>
/* All runtime styles are injected via useShadowStyles above. */
</style>
