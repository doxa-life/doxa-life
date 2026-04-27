import { Migrator, type Migration, type MigrationProvider } from 'kysely'
import { promises as fs } from 'fs'
import * as path from 'path'
import { pathToFileURL } from 'url'
import { getDb } from '../utils/database'

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
        const fullPath = path.join(folder, file)
        const mod = await import(pathToFileURL(fullPath).href)
        all[name] = mod
      }
    }
    return all
  }
}

export default defineNitroPlugin(async () => {
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
    provider: new MultiFolderMigrationProvider(folders)
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
