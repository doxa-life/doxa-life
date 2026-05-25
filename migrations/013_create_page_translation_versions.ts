import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('page_translation_versions')
    .ifNotExists()
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('page_id', 'uuid', col => col.notNull().references('pages.id').onDelete('cascade'))
    .addColumn('locale', 'text', col => col.notNull())
    .addColumn('title', 'text', col => col.notNull())
    .addColumn('body_json', 'jsonb', col => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('excerpt', 'text')
    .addColumn('featured_image', 'text')
    .addColumn('meta_title', 'text')
    .addColumn('meta_description', 'text')
    .addColumn('og_image', 'text')
    .addColumn('status', 'text', col => col.notNull())
    .addColumn('created_by_user_id', 'uuid', col => col.references('users.id').onDelete('set null'))
    .addColumn('source', 'text', col => col.notNull().defaultTo('admin-ui'))
    .addColumn('user_agent', 'text')
    .addColumn('created', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createIndex('page_translation_versions_page_locale_created_idx')
    .ifNotExists()
    .on('page_translation_versions')
    .columns(['page_id', 'locale', 'created desc'])
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('page_translation_versions').ifExists().execute()
}
