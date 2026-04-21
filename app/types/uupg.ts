// Copied verbatim from marketing-theme/js/components/src/types/uupg.ts
// — plus the FilterOption type from filter-dropdown.ts so it lives with
// the data model types.

export interface ValueLabel {
  value: string
  label: string
  description?: string
}

export interface UupgMatch {
  key: string
  label: any
}

export interface Uupg {
  slug: string
  name: string
  wagf_region: ValueLabel
  wagf_region_label?: any
  wagf_block: ValueLabel
  wagf_member: ValueLabel
  country_code: ValueLabel
  country_label?: any
  rop1: ValueLabel
  rop1_label?: any
  location_description: string
  has_photo: boolean
  image_url: string
  picture_credit: any
  population: number
  religion: ValueLabel
  adopted_by_churches?: number
  people_praying?: number
  people_committed?: number
  imb_alternate_name?: string
  matches?: UupgMatch[]
}

export interface FilterOption {
  value: string
  label: string
  count: number
  type?: 'dropdown' | 'boolean'
}
