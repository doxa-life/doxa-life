import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('site_settings')
    .ifNotExists()
    .addColumn('key', 'text', col => col.primaryKey())
    .addColumn('value', 'jsonb', col => col.notNull())
    .addColumn('updated', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .execute()

  // Seed the registration toggle as enabled to preserve existing behavior.
  // Admins flip it off via /admin/settings after deploy if they want.
  await sql`
    INSERT INTO site_settings (key, value)
    VALUES ('auth.public_registration_enabled', 'true'::jsonb)
    ON CONFLICT (key) DO NOTHING
  `.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('site_settings').ifExists().execute()
}
