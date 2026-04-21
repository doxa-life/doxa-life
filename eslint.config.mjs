// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

// Guardrail: Nuxt UI components (`<U*>`) and their CSS only load inside the
// admin layout. Using a `<U*>` component on a public page would render
// unstyled because `admin.css` isn't imported there. This rule blocks that
// at lint time. Admin pages/components are exempt via overrides below.
const forbidNuxtUI = {
  rules: {
    'vue/no-restricted-syntax': ['error', {
      selector: "VElement[rawName=/^U[A-Z]/]",
      message: 'Nuxt UI components (<U*>) are only allowed inside app/pages/admin/** and app/components/admin/**. Public pages must use ported SCSS components.'
    }]
  }
}

export default withNuxt(
  {
    files: ['app/pages/**/*.vue', 'app/components/**/*.vue', 'app/layouts/**/*.vue'],
    ...forbidNuxtUI
  },
  {
    files: [
      'app/pages/admin/**/*.vue',
      'app/components/admin/**/*.vue',
      'app/components/ThemeToggle.vue',
      'app/layouts/admin.vue',
      'app/layouts/auth.vue',
      'app/pages/login.vue',
      'app/pages/register.vue',
      'app/pages/reset-password.vue',
      'app/pages/dashboard.vue',
      'app/pages/profile.vue'
    ],
    rules: {
      'vue/no-restricted-syntax': 'off'
    }
  }
)
