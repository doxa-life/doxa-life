// https://nuxt.com/docs/api/configuration/nuxt-config
import { generateI18nLocales } from './config/languages'

export default defineNuxtConfig({
  modules: [
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

  ssr: false,

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
      redirectOn: 'root',
      alwaysRedirect: true
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
        { name: 'msapplication-TileImage', content: '/favicon/cropped-Favicon-light-doxa-01-270x270.png' }
      ]
    }
  },

  routeRules: {
    '/': { prerender: true },
    '/en/**': { redirect: '/**' }
  },

  runtimeConfig: {
    appName: process.env.APP_TITLE || 'My App',
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
    formApiKey: process.env.FORM_API_KEY || '',
    prayBaseUrl: process.env.NUXT_PRAY_BASE_URL || 'https://pray.doxa.life',
    deeplApiKey: process.env.DEEPL_API_KEY || '',
    deeplApiUrl: process.env.DEEPL_API_URL || 'https://api-free.deepl.com',
    public: {
      appName: process.env.APP_TITLE || 'My App',
      nodeEnv: process.env.NODE_ENV || '',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || '',
      prayBaseUrl: process.env.NUXT_PUBLIC_PRAY_BASE_URL || 'https://pray.doxa.life',
      mapboxToken: process.env.NUXT_PUBLIC_MAPBOX_TOKEN || ''
    }
  },

  compatibilityDate: '2025-01-15',

  vue: {
    compilerOptions: {
      isCustomElement: (tag: string) => ['doxa-map', 'feedback-widget'].includes(tag)
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
          isCustomElement: (tag: string) => ['doxa-map', 'feedback-widget'].includes(tag)
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
