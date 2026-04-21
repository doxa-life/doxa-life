// Global open/closed state for the mobile hamburger drawer.
// Mirrors the vanilla JS hamburger-menu-overlay + hamburger-menu pattern
// from marketing-theme/js/theme.js.

export function useMobileMenu() {
  const isOpen = useState<boolean>('mobile-menu-open', () => false)

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function close() {
    isOpen.value = false
  }

  function open() {
    isOpen.value = true
  }

  return { isOpen, toggle, close, open }
}
