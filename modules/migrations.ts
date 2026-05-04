// Build-time module that walks all Nuxt layers and writes their migration folder
// paths into runtimeConfig. The Nitro plugin at server/plugins/migrations.ts reads
// from this list at boot and runs migrations from every layer that has one.
//
// Convention: layers prefix their migration filenames (e.g. `oauth_001_*`) so
// global filename sort produces a stable execution order across all layers and
// the consumer's own numeric-prefixed migrations.
import { defineNuxtModule } from '@nuxt/kit'
import path from 'node:path'
import { existsSync } from 'node:fs'

export default defineNuxtModule({
  meta: {
    name: 'layer-migrations'
  },
  setup(_, nuxt) {
    const paths = nuxt.options._layers
      .map(l => path.join(l.cwd, 'migrations'))
      .filter(p => existsSync(p))

    nuxt.options.runtimeConfig.layerMigrationPaths = paths
  }
})
