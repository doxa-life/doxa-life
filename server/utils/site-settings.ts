import { z } from 'zod'
import { sql } from 'kysely'
import { db } from './database'

// Single source of truth for valid keys, value shapes, defaults, and which
// keys are public-readable. Add a row here to introduce a new setting.
const settingDefs = {
  'auth.public_registration_enabled': {
    schema: z.boolean(),
    default: true,
    public: true,
  },
} as const

export type SettingKey = keyof typeof settingDefs
export type SettingValue<K extends SettingKey> = z.infer<typeof settingDefs[K]['schema']>

export const SETTING_KEYS = Object.keys(settingDefs) as SettingKey[]

export const PUBLIC_SETTING_KEYS = SETTING_KEYS.filter(k => settingDefs[k].public)

export function isSettingKey(value: string): value is SettingKey {
  return value in settingDefs
}

const CACHE_TTL_MS = 30_000

interface CacheEntry {
  value: unknown
  expiresAt: number
}
const cache = new Map<SettingKey, CacheEntry>()

function readCache(key: SettingKey): unknown | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return undefined
  }
  return entry.value
}

function writeCache(key: SettingKey, value: unknown) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

function parseOrDefault<K extends SettingKey>(key: K, raw: unknown): SettingValue<K> {
  const def = settingDefs[key]
  const result = def.schema.safeParse(raw)
  if (result.success) return result.data as SettingValue<K>
  return def.default as SettingValue<K>
}

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const cached = readCache(key)
  if (cached !== undefined) return parseOrDefault(key, cached)

  const row = await db
    .selectFrom('site_settings')
    .select('value')
    .where('key', '=', key)
    .executeTakeFirst()

  const raw = row?.value
  writeCache(key, raw)
  return parseOrDefault(key, raw)
}

export async function getSettings<K extends SettingKey>(
  keys: readonly K[]
): Promise<{ [P in K]: SettingValue<P> }> {
  const result = {} as { [P in K]: SettingValue<P> }
  // Sequential is fine — keys are few and most are cache hits.
  for (const key of keys) {
    result[key] = await getSetting(key)
  }
  return result
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: unknown
): Promise<SettingValue<K> | undefined> {
  const def = settingDefs[key]
  const parsed = def.schema.safeParse(value)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid value for ${key}: ${parsed.error.issues.map(i => i.message).join(', ')}`
    })
  }

  const existing = await db
    .selectFrom('site_settings')
    .select('value')
    .where('key', '=', key)
    .executeTakeFirst()

  const previous = existing ? parseOrDefault(key, existing.value) : undefined

  // Inline the JSON literal in SQL rather than passing it as a bound parameter:
  // postgres-js auto-stringifies JS values for unknown-typed parameters, which
  // would double-encode a pre-serialized primitive (e.g. JS string "false"
  // -> JSONB string "false" instead of JSONB boolean false).
  const json = JSON.stringify(parsed.data)
  const escaped = json.replace(/'/g, "''")
  const valueLit = sql.raw(`'${escaped}'::jsonb`)
  const now = new Date().toISOString()

  await sql`
    INSERT INTO site_settings (key, value, updated)
    VALUES (${key}, ${valueLit}, ${now}::timestamptz)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated = EXCLUDED.updated
  `.execute(db)

  cache.delete(key)
  return previous
}
