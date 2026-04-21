// Smooth-scroll anchor links with an 80px top offset (accounting for the
// sticky header). Port of the anchor-link handler in
// marketing-theme/js/theme.js. Call once from the public layout to attach
// a single delegated click listener; cleans up on unmount.

export function useSmoothScroll(offset = 80) {
  if (!import.meta.client) return

  const handler = (e: Event) => {
    const target = (e.target as Element | null)?.closest('a[href*="#"]:not([href="#"])') as HTMLAnchorElement | null
    if (!target) return
    const href = target.getAttribute('href') || ''
    const hashIndex = href.indexOf('#')
    if (hashIndex < 0) return

    // Same-page anchor only
    const pathname = location.pathname.replace(/^\//, '')
    const linkPathname = target.pathname.replace(/^\//, '')
    if (pathname !== linkPathname || location.hostname !== target.hostname) return

    const hash = href.substring(hashIndex)
    const selector = hash
    let el = document.querySelector(selector)
    if (!el) el = document.querySelector(`[name="${selector.slice(1)}"]`)
    if (!el) return

    e.preventDefault()
    const top = (el as HTMLElement).getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
  }

  onMounted(() => document.addEventListener('click', handler))
  onBeforeUnmount(() => document.removeEventListener('click', handler))
}
