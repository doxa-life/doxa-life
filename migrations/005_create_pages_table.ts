import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('pages')
    .ifNotExists()
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('slug', 'text', col => col.unique().notNull())
    .addColumn('parent_slug', 'text')
    .addColumn('menu_order', 'integer', col => col.notNull().defaultTo(0))
    .addColumn('created', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createIndex('pages_parent_slug_idx')
    .ifNotExists()
    .on('pages')
    .column('parent_slug')
    .execute()

  await db.schema
    .createTable('page_translations')
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
    .addColumn('status', 'text', col => col.notNull().defaultTo('draft'))
    .addColumn('updated', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createIndex('page_translations_page_locale_uidx')
    .ifNotExists()
    .on('page_translations')
    .columns(['page_id', 'locale'])
    .unique()
    .execute()

  await db.schema
    .createIndex('page_translations_status_idx')
    .ifNotExists()
    .on('page_translations')
    .column('status')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('page_translations').ifExists().execute()
  await db.schema.dropTable('pages').ifExists().execute()
}
