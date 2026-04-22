// Loads the <feedback-widget> web-component bundle and its host-page CSS.
// Mirrors the loader pattern used by useDoxaMap on the maps branch, but
// strips out mapbox/map-app since the parent site only needs the widget.

const FEEDBACK_WIDGET_JS = '/assets/feedback-widget/feedback-widget.iife.js'

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-feedback-widget="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === '1') return resolve()
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true })
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.dataset.feedbackWidget = src
    s.onload = () => { s.dataset.loaded = '1'; resolve() }
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

export function useFeedbackWidget() {
  useHead({
    link: [
      { rel: 'stylesheet', href: '/assets/feedback-widget/feedback-widget-slot.css' }
    ]
  })

  onMounted(() => {
    loadScript(FEEDBACK_WIDGET_JS).catch((err) => {
      console.error('[useFeedbackWidget] script load failed', err)
    })
  })
}
