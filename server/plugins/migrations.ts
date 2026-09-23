import { Migrator, type Migration, type MigrationProvider } from 'kysely'
import { promises as fs } from 'fs'
import * as path from 'path'
import { pathToFileURL } from 'url'
import { getDb } from '../utils/database'

// Migration files are TypeScript, and they are imported at runtime by absolute
// path — the bundler never sees them, so the server's own runtime has to be able
// to load .ts. Production runs under Bun, which can; `nuxt dev` runs Nitro under
// Node, which only strips types from 22.18 (or behind --experimental-strip-types
// before that) and otherwise throws ERR_UNKNOWN_FILE_EXTENSION. Shipping .js
// migrations wouldn't fix it either — layers bring their own .ts ones. So: try the
// native import, and fall back to jiti, which transpiles on the fly.
let jitiImport: ((path: string) => Promise<unknown>) | undefined

async function importMigration(fullPath: string): Promise<Migration> {
  try {
    return await import(/* @vite-ignore */ pathToFileURL(fullPath).href) as Migration
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== 'ERR_UNKNOWN_FILE_EXTENSION') throw err
    if (!jitiImport) {
      const { createJiti } = await import('jiti')
      const jiti = createJiti(import.meta.url)
      jitiImport = (path: string) => jiti.import(path)
    }
    return await jitiImport(fullPath) as Migration
  }
}

// Reads migration files from multiple folders (consumer + each layer's migrations/).
// Filenames are sorted globally for a stable order. Each layer prefixes its files
// (e.g. `oauth_001_*`) to avoid collision with the consumer's numeric-prefixed names.
class MultiFolderMigrationProvider implements MigrationProvider {
  constructor(private folders: string[]) {}

  async getMigrations(): Promise<Record<string, Migration>> {
    const all: Record<string, Migration> = {}
    for (const folder of this.folders) {
      let files: string[]
      try {
        files = await fs.readdir(folder)
      } catch {
        continue
      }
      for (const file of files) {
        if (!file.endsWith('.ts') && !file.endsWith('.js') && !file.endsWith('.mjs')) continue
        const name = file.replace(/\.(ts|js|mjs)$/, '')
        if (all[name]) {
          throw new Error(`Migration name collision: "${name}" appears in multiple layers. Rename one (use a layer prefix like \`oauth_001_*\`).`)
        }
        all[name] = await importMigration(path.join(folder, file))
      }
    }
    return all
  }
}

export default defineNitroPlugin(async () => {
  // Skip during build-time prerender — the builder isn't attached to the VPC,
  // so connecting to the private DB host would time out. Migrations run at runtime.
  if (import.meta.prerender) return

  const cfg = useRuntimeConfig()
  const databaseUrl = cfg.databaseUrl || process.env.DATABASE_URL
  if (!databaseUrl) {
    console.warn('DATABASE_URL not set, skipping migrations')
    return
  }

  const layerPaths = (cfg.layerMigrationPaths as string[] | undefined) ?? []
  const folders = layerPaths.length > 0
    ? layerPaths
    : [path.join(process.cwd(), 'migrations')]

  const migrator = new Migrator({
    db: getDb(),
    provider: new MultiFolderMigrationProvider(folders),
    // Layer-supplied migrations (e.g. `oauth_001_*`) sort alphabetically AFTER
    // the consumer's numeric-prefixed migrations, so any consumer migration
    // added after a layer migration was applied looks "out of order" to the
    // strict default checker. Allowing unordered execution is the correct
    // posture for this multi-folder setup — migrations are still run exactly
    // once each and must remain idempotent regardless of relative order.
    allowUnorderedMigrations: true
  })

  // Identify pending migrations so we can announce them before execution
  const all = await migrator.getMigrations()
  const pending = all.filter(m => !m.executedAt)

  if (pending.length === 0) {
    console.log('Migrations already up-to-date')
    return
  }

  console.log(`Running ${pending.length} pending migration(s)...`)
  for (const m of pending) {
    console.log(`  Migration: ${m.name}`)
  }

  const { error, results } = await migrator.migrateToLatest()

  results?.forEach(r => {
    if (r.status === 'Success') console.log(`✓ ${r.migrationName}`)
    if (r.status === 'Error') console.error(`✗ ${r.migrationName}`)
  })

  if (error) {
    console.error('Migration failed:', error)
    throw error
  }

  console.log('Migrations complete')
})
