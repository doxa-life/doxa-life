// https://nuxt.com/docs/api/configuration/nuxt-config
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { generateI18nLocales, ENABLED_LANGUAGE_CODES } from './config/languages'

const LAYERS_DIR = '.layers'

// Strip layer-level tsconfig.json files. Layers extracted from full Nuxt
// projects often ship a tsconfig.json that references ./.nuxt/tsconfig.*.json
// (only generated when the layer is opened as its own project). When the layer
// lives under node_modules, Vite's tsconfig walker skips it. When it lives at
// .layers/<name>, Vite picks it up and crashes on the missing references.
function stripLayerTsconfigs() {
  if (!existsSync(LAYERS_DIR)) return
  for (const name of readdirSync(LAYERS_DIR)) {
    const tsconfig = join(LAYERS_DIR, name, 'tsconfig.json')
    if (existsSync(tsconfig)) rmSync(tsconfig)
  }
}

stripLayerTsconfigs()

// Prerendered marketing pages are served as edge-cacheable HTML so first paint
// comes from Cloudflare rather than the origin. `max-age=0` keeps browsers
// revalidating (a deploy is visible immediately); `s-maxage` is the edge TTL;
// `stale-while-revalidate` lets the edge serve instantly while it refreshes. The
// deploy purge (server/plugins/cloudflare-purge.ts) evicts stale HTML so it can
// never reference content-hashed /_nuxt assets the new build replaced.
const MARKETING_HTML_CACHE = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=86400'
const MARKETING_PAGES = ['', '/adopt', '/pray', '/research', '/contact-us']
const MARKETING_LOCALE_PREFIXES = ['', ...ENABLED_LANGUAGE_CODES.filter(code => code !== 'en').map(code => `/${code}`)]
const marketingRouteRules = Object.fromEntries(
  MARKETING_LOCALE_PREFIXES.flatMap(prefix =>
    MARKETING_PAGES.map(page => [
      `${prefix}${page}` || '/',
      { prerender: true, headers: { 'cache-control': MARKETING_HTML_CACHE } }
    ])
  )
)

export default defineNuxtConfig({
  // Embeddables (micro-frontends + web-components) have their own Vite builds —
  // Nuxt must not watch or scan their source trees.
  ignore: ['embeddables/**'],

  extends: [
    process.env.OAUTH_LAYER_PATH || ['github:corsacca/nuxt-blueprints/layers/oauth#master', {
      giget: { dir: `${LAYERS_DIR}/oauth`, forceClean: true }
    }],
    process.env.MCP_LAYER_PATH || ['github:corsacca/nuxt-blueprints/layers/mcp#master', {
      giget: { dir: `${LAYERS_DIR}/mcp`, forceClean: true }
    }]
  ],

  hooks: {
    'modules:before': stripLayerTsconfigs,
    // Workaround for https://github.com/nuxt/nuxt/issues/33987
    // `fontless` (via @nuxt/ui → @nuxt/fonts) spawns an esbuild service
    // it never disposes, so `nuxt build` finishes but the Node process
    // hangs forever waiting on the orphaned esbuild child. Force-exit
    // when the build's close hook fires.
    //
    // Guard: `nuxt prepare` also calls `nuxt.close()` mid-flight (right
    // after `prepare:types`) and the CLI then calls `writeTypes()` to
    // emit tsconfig.app.json/shared.json/node.json. Exiting here would
    // truncate that and the next `nuxt build` would fail with ENOENT
    // on tsconfig.app.json. Same for dev shutdown — let it clean up.
    close: (nuxt) => {
      if (nuxt.options._prepare || nuxt.options.dev) return
      process.exit(0)
    }
  },

  modules: [
    './modules/migrations',
    './modules/country-routes',
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/i18n',
    '@nuxtjs/turnstile'
  ],

  turnstile: {
    siteKey: process.env.NUXT_TURNSTILE_SITE_KEY || ''
  },

  components: [
    { path: '~/components', pathPrefix: false }
  ],

  devtools: {
    enabled: true
  },

  devServer: {
    port: 3033
  },

  ssr: true,

  ui: {
    theme: {
      colors: ['primary', 'secondary', 'info', 'success', 'warning', 'error', 'neutral']
    }
  },

  i18n: {
    locales: generateI18nLocales(),
    defaultLocale: 'en',
    langDir: 'locales',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'preferred_language',
      redirectOn: 'root'
    },
    vueI18n: './i18n.config.ts'
  },

  app: {
    head: {
      title: process.env.APP_TITLE || 'Doxa.Life – Global Partnership for the Unreached',
      link: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon/cropped-Favicon-light-doxa-01-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/favicon/cropped-Favicon-light-doxa-01-192x192.png' },
        { rel: 'apple-touch-icon', href: '/favicon/cropped-Favicon-light-doxa-01-180x180.png' }
      ],
      meta: [
        // Mobile viewport. `viewport-fit=cover` lets the map canvas extend
        // behind iOS notch/home-indicator safe areas. We intentionally do
        // NOT set `user-scalable=no` or `maximum-scale=1` — those break
        // pinch-zoom recovery if the page ever does get zoomed. The real
        // fix for "tapping the search input zooms the page" is keeping the
        // input's font-size >= 16px (handled in the geocoder shadow CSS).
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'msapplication-TileImage', content: '/favicon/cropped-Favicon-light-doxa-01-270x270.png' }
      ]
    }
  },

  routeRules: {
    // Content-hashed build assets never change under the same URL — cache forever.
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    // Fonts/images use stable filenames, so avoid `immutable`: a 7-day cache
    // still lets an overwritten asset propagate within a week.
    '/assets/**': { headers: { 'cache-control': 'public, max-age=604800' } },
    // Prerendered marketing pages (all enabled locales) — edge-cacheable HTML.
    ...marketingRouteRules,
    '/login': { ssr: false, prerender: false },
    '/register': { ssr: false, prerender: false },
    '/reset-password': { ssr: false, prerender: false },
    '/dashboard': { ssr: false, prerender: false },
    '/profile': { ssr: false, prerender: false },
    '/admin/**': { ssr: false, prerender: false },
    '/en/**': { redirect: '/**' }
  },

  nitro: {
    // DigitalOcean App Platform installs and runs with Bun (only bun.lock is
    // committed). The default node-server preset traces external deps with
    // node-file-trace and copies them into .output/server/node_modules, but
    // under Bun's install layout that copy comes out incomplete (e.g. undici
    // ships package.json without the index.js its `main` points at), so the
    // server crashes on boot. The bun preset builds the output for Bun's own
    // resolver. Run it with `bun run ./.output/server/index.mjs`.
    preset: 'bun',
    // Precompress public assets (JS/CSS/HTML/SVG/JSON) to .br and .gz at build
    // time; the server serves the compressed variant when the client supports it.
    compressPublicAssets: { brotli: true, gzip: true },
    // Dev-only: use in-memory cache for the payload mount. The default fs
    // driver can't represent both a leaf route ("/fr") and children of that
    // route ("/fr/adopt") simultaneously — the first visit writes a file at
    // `.nuxt/cache/nuxt/payload/fr`, the next hits ENOTDIR trying to create
    // `fr/adopt` underneath it. Production prerender uses a different path
    // scheme (`.output/public/fr/_payload.json`) so it's not affected.
    devStorage: {
      cache: { driver: 'memory' }
    },
    // Production: in-process memory driver. Railway runs a single
    // container and doesn't guarantee `./.cache/` persistence in a way
    // Nitro's fs driver can rely on — it behaves like a serverless fs
    // (writes succeed locally but reads silently miss), making
    // defineCachedEventHandler a no-op in prod. Memory is the simplest
    // correct driver for single-replica hosts: cache lives for the life
    // of the process, gets cleared on deploy (fine — content re-warms
    // on first visit). Swap to a shared driver (e.g. Redis on Railway)
    // if the service ever scales to >1 replica.
    storage: {
      cache: { driver: 'memory' }
    },
    prerender: {
      // CMS pages (catch-all [...slug]) are rendered live per request so
      // edits show up immediately. Only hand-coded Vue pages in the seed
      // list below are prerendered — they don't hit the DB.
      crawlLinks: false,
      routes: [
        '/', '/es', '/fr', '/pt', '/ar', '/ru',
        '/adopt', '/es/adopt', '/fr/adopt', '/pt/adopt', '/ar/adopt', '/ru/adopt',
        '/pray', '/es/pray', '/fr/pray', '/pt/pray', '/ar/pray', '/ru/pray',
        '/research', '/es/research', '/fr/research', '/pt/research', '/ar/research', '/ru/research',
        '/contact-us', '/es/contact-us', '/fr/contact-us', '/pt/contact-us', '/ar/contact-us', '/ru/contact-us'
      ]
    }
  },

  runtimeConfig: {
    appName: process.env.APP_TITLE || 'My App',
    mcpServerName: process.env.MCP_SERVER_NAME || 'doxa-cms',
    mcpServerVersion: process.env.MCP_SERVER_VERSION || '1.0.0',
    // ── MCP layer config (consumed by base-code/nuxt-blueprints/layers/mcp) ──
    // These keys are read at runtime by the MCP layer. If you rename
    // them or change shape the layer silently falls back to defaults
    // (no rate limiting, no read-scope classification) — guard them
    // when upgrading the layer.
    //   mcpReadScopes: tools whose scope is in this list are exempt
    //     from the per-token writes bucket. `pages.view` is the only
    //     read scope today.
    //   mcpRateLimits: per-token writes bucket is raised from the
    //     layer default (20/min) to 60/min — a "publish 9 locales of
    //     5 pages" Claude flow lands at 45 calls.
    mcpReadScopes: ['pages.view'],
    mcpRateLimits: {
      writesPerToken: { limit: 60, windowMs: 60_000 }
    },
    // OAuth layer reads this when DCR registrations omit `scope`.
    // Curated to the three CMS scopes; excludes admin/users/roles/
    // settings even though those exist in PERMISSIONS.
    oauthDcrDefaultScopes: ['pages.view', 'pages.write', 'pages.publish'],
    databaseUrl: process.env.DATABASE_URL || '',
    jwtSecret: process.env.JWT_SECRET || '',
    mailgunApiKey: process.env.MAILGUN_API_KEY || '',
    mailgunDomain: process.env.MAILGUN_DOMAIN || '',
    mailgunHost: process.env.MAILGUN_HOST || '',
    smtpFrom: process.env.SMTP_FROM || '',
    smtpFromName: process.env.SMTP_FROM_NAME || '',
    s3Endpoint: process.env.S3_ENDPOINT || '',
    s3Region: process.env.S3_REGION || '',
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    s3BucketName: process.env.S3_BUCKET_NAME || '',
    s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL || '',
    formApiKey: process.env.FORM_API_KEY || '',
    prayBaseUrl: process.env.NUXT_PRAY_BASE_URL || 'https://pray.doxa.life',
    // Mapbox key — server-only. Can be a public key (pk.*) or a secret
    // key (sk.*); the /api/maps/token endpoint passes pk.* through and
    // mints temporary tk.* tokens from sk.* via Mapbox Tokens API. If
    // unset, the endpoint falls back to public.mapboxToken below so
    // existing setups keep working with no config change.
    mapboxKey: process.env.NUXT_MAPBOX_KEY || '',
    deeplApiKey: process.env.DEEPL_API_KEY || '',
    deeplApiUrl: process.env.DEEPL_API_URL || 'https://api.deepl.com',
    // Cloudflare cache purge on deploy (server/plugins/cloudflare-purge.ts).
    // Token needs only Zone → Cache Purge for the doxa.life zone.
    cfApiToken: process.env.CF_API_TOKEN || '',
    cfZoneId: process.env.CF_ZONE_ID || '',
    public: {
      appName: process.env.APP_TITLE || 'My App',
      nodeEnv: process.env.NODE_ENV || '',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || '',
      prayBaseUrl: process.env.NUXT_PUBLIC_PRAY_BASE_URL || 'https://pray.doxa.life',
      mapboxToken: process.env.NUXT_PUBLIC_MAPBOX_TOKEN || '',
      feedbackApiBase: process.env.NUXT_PUBLIC_FEEDBACK_API_BASE || 'https://support.gospelambition.org',
      feedbackProjectId: process.env.NUXT_PUBLIC_FEEDBACK_PROJECT_ID || '',
      statinatorUrl: process.env.NUXT_PUBLIC_STATINATOR_URL || 'https://statinator.doxa.life',
      statinatorProjectId: process.env.NUXT_PUBLIC_STATINATOR_PROJECT_ID || 'doxa',
      statinatorEnabled: process.env.NUXT_PUBLIC_STATINATOR_ENABLED === 'true',
      statinatorCookieDomain: process.env.NUXT_PUBLIC_STATINATOR_COOKIE_DOMAIN || '.doxa.life'
    }
  },

  compatibilityDate: '2025-01-15',

  experimental: {
    // Disables @nuxt/nitro-server's per-event useAppConfig override. Without
    // this, both nitropack and @nuxt/nitro-server register a `useAppConfig`
    // server auto-import and unimport spams a "Duplicated imports" warning
    // on every reload. We don't call useAppConfig anywhere, so dropping the
    // override is a no-op for runtime behavior.
    serverAppConfig: false
  },

  vue: {
    compilerOptions: {
      isCustomElement: (tag: string) => ['doxa-map', 'doxa-research-map', 'feedback-web-component'].includes(tag)
    }
  },

  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit'
      ]
    },
    vue: {
      template: {
        compilerOptions: {
          isCustomElement: (tag: string) => ['doxa-map', 'doxa-research-map', 'feedback-web-component'].includes(tag)
        }
      }
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
