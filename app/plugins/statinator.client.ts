import { ENABLED_LANGUAGE_CODES } from '~~/config/languages'

declare global {
  interface Window {
    goStats?: {
      track: (eventType: string, options?: Record<string, unknown>) => void
      pageview: (options?: Record<string, unknown>, callback?: (resp: unknown) => void) => void
    }
  }
}

const EXCLUDED_PREFIXES = [
  '/admin',
  '/dashboard',
  '/profile',
  '/login',
  '/register',
  '/reset-password',
  '/accept-invite',
  '/oauth'
]

const NON_DEFAULT_LOCALES = ENABLED_LANGUAGE_CODES.filter(code => code !== 'en')
const LOCALE_PREFIX_RE = new RegExp(`^/(?:${NON_DEFAULT_LOCALES.join('|')})(?=/|$)`)

function stripLocale(path: string): string {
  return path.replace(LOCALE_PREFIX_RE, '') || '/'
}

function isExcluded(path: string): boolean {
  const stripped = stripLocale(path)
  return EXCLUDED_PREFIXES.some(prefix => stripped === prefix || stripped.startsWith(prefix + '/'))
}

export default defineNuxtPlugin(() => {
  const { statinatorEnabled, statinatorUrl, statinatorProjectId, statinatorCookieDomain } = useRuntimeConfig().public
  if (!statinatorEnabled) return
  const url = String(statinatorUrl || '').replace(/\/$/, '')
  const projectId = String(statinatorProjectId || '')
  const cookieDomain = String(statinatorCookieDomain || '')
  if (!url || !projectId) return

  // The plugin owns when pageviews fire (data-auto-pageview="false"),
  // so SPA route changes and the initial load go through one code path.
  let scriptReady: Promise<void> | null = null

  function injectScript(): Promise<void> {
    if (scriptReady) return scriptReady
    scriptReady = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = `${url}/api/script.js`
      script.async = true
      script.setAttribute('data-project', projectId)
      script.setAttribute('data-storage', 'cookie')
      script.setAttribute('data-cookie-name', 'doxa_vid')
      if (cookieDomain) script.setAttribute('data-cookie-domain', cookieDomain)
      script.setAttribute('data-auto-pageview', 'false')
      script.addEventListener('load', () => resolve())
      script.addEventListener('error', () => reject(new Error('statinator script failed to load')))
      document.head.appendChild(script)
    })
    return scriptReady
  }

  function firePageview() {
    injectScript().then(() => window.goStats?.pageview()).catch(() => {})
  }

  if (!isExcluded(useRoute().path)) firePageview()

  const router = useRouter()
  router.afterEach((to, from) => {
    if (to.fullPath === from.fullPath) return
    if (isExcluded(to.path)) return
    firePageview()
  })
})
