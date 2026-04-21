// Site navigation items. Mirrors the primary/secondary/footer menus the
// WordPress theme renders via `wp_nav_menu()`. Hardcoded for now — a CMS
// menu editor can replace this later if needed.

export interface NavItem {
  key: string            // i18n lookup key (English source string)
  to?: string            // internal route (passed through localePath in components)
  href?: string          // external URL (no locale prefix)
  rel?: string           // e.g. 'noopener'
}

// Main header navigation (desktop). Minimal on purpose — the full list
// lives in the hamburger menu; this matches the live site layout.
export const PRIMARY_NAV: NavItem[] = [
  { key: 'Pray', to: '/pray' },
  { key: 'Adopt', to: '/adopt' }
]

// Footer navigation. Matches the live `#menu-footer` list exactly.
export const FOOTER_NAV: NavItem[] = [
  { key: 'Give', href: 'https://giving.ag.org/donate/600001-6C2327?utm_source=direct_link' },
  { key: 'Vision', to: '/about/vision' },
  { key: 'Adoption Resources', to: '/resources' },
  { key: 'Privacy Policy', to: '/privacy-policy', rel: 'privacy-policy' }
]

// Hamburger (secondary) menu — shown on mobile AND as the full nav for
// all viewports. Mirrors the live `#secondary-menu` list.
export const SECONDARY_NAV: NavItem[] = [
  { key: 'About', to: '/about' },
  { key: 'Research', to: '/research' },
  { key: 'Pray', to: '/pray' },
  { key: 'Adopt', to: '/adopt' },
  { key: 'Adoption Resources', to: '/resources' },
  { key: 'Give', href: 'https://giving.ag.org/donate/600001-6C2327?utm_source=direct_link' }
]
