// Port of `get_uupg_list_translations()` from marketing-theme/functions.php.
// Returns the `t` object that the <UupgsList> component consumes.
// Each value is localized via the caller-supplied `$t` function.

export type UupgListT = ReturnType<typeof buildUupgListTranslations>

export function buildUupgListTranslations(t: (key: string) => string) {
  return {
    select: t('Select'),
    full_profile: t('Full Profile'),
    prayer_coverage: t('Intercessors'),
    adopted: t('Adopted'),
    not_adopted: t('Not Adopted'),
    loading: t('Loading results...'),
    load_more: t('Load More'),
    total: t('Total'),
    search: t('Search names, country/continent, religions...'),
    see_all: t('See All'),
    country: t('Country'),
    religion: t('Religion'),
    alternate_name: t('Alternate Names'),
    rop1: t('People Group'),
    wagf_region: t('WAGF Region'),
    wagf_block: t('WAGF Block'),
    show_filters: t('Show Filters'),
    hide_filters: t('Hide Filters'),
    clear_all: t('Clear All'),
    adopted_filter: t('Adopted'),
    engaged_filter: t('Engaged'),
    exact_filter: t('Exact'),
    type_to_search: t('Type to search...'),
    no_options: t('No options found')
  }
}
