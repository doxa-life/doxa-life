import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .alterColumn('password', col => col.dropNotNull())
    .execute()

  await sql`ALTER TABLE users ALTER COLUMN password DROP DEFAULT`.execute(db)

  await db.schema
    .alterTable('users')
    .addColumn('token_expires_at', 'timestamptz')
    .execute()

  // Existing unverified rows had no expiry — give them a 7-day grace window
  // from the migration time so nobody is locked out the moment this ships.
  await sql`
    UPDATE users
    SET token_expires_at = now() + interval '7 days'
    WHERE verified = false
  `.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .dropColumn('token_expires_at')
    .execute()

  await sql`ALTER TABLE users ALTER COLUMN password SET DEFAULT ''`.execute(db)
  await sql`UPDATE users SET password = '' WHERE password IS NULL`.execute(db)

  await db.schema
    .alterTable('users')
    .alterColumn('password', col => col.setNotNull())
    .execute()
}
