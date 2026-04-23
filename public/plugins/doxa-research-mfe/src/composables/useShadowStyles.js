/**
 * useShadowStyles.js — Shadow DOM Style Injection
 *
 * Vue's defineCustomElement only injects styles from the ROOT component
 * into the Shadow DOM. Child components loaded via defineAsyncComponent
 * (import.meta.glob) have their <style> blocks silently dropped.
 *
 * This composable injects a child component's critical styles into the
 * shadow root so they actually take effect.
 *
 * Usage (in any child component):
 *   import { useShadowStyles } from '../composables/useShadowStyles.js'
 *
 *   // Call at setup() time — injects styles into shadow root on mount
 *   useShadowStyles(`
 *     .my-component { position: absolute; inset: 0; }
 *     .map-canvas   { position: absolute; inset: 0; }
 *   `)
 */

import { getCurrentInstance, onMounted } from 'vue'

/**
 * Injects a CSS string into the shadow root that contains this component.
 * Idempotent — uses a data-attribute key to avoid duplicate injection.
 *
 * @param {string} css      - Raw CSS text to inject
 * @param {string} [label]  - Optional label for the <style> tag (for debugging)
 */
export function useShadowStyles(css, label) {
  // Generate a stable key from the label or a hash of the CSS
  const key = label || hashCode(css)

  onMounted(() => {
    const instance = getCurrentInstance()
    if (!instance) return

    // Walk up from the component's root element to find the shadow root
    const el = instance.proxy?.$el
    if (!el) return

    const root = el.getRootNode()
    if (!(root instanceof ShadowRoot)) return  // light DOM — no injection needed

    // Skip if already injected (idempotent)
    if (root.querySelector(`style[data-shadow-styles="${key}"]`)) return

    const style = document.createElement('style')
    style.setAttribute('data-shadow-styles', key)
    style.textContent = css
    root.appendChild(style)
  })
}

/** Simple string hash for dedup key */
function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return 's' + Math.abs(hash).toString(36)
}
