import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('categories')
    .ifNotExists()
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('slug', 'text', col => col.unique().notNull())
    .addColumn('menu_order', 'integer', col => col.notNull().defaultTo(0))
    .addColumn('created', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createTable('category_translations')
    .ifNotExists()
    .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('category_id', 'uuid', col => col.notNull().references('categories.id').onDelete('cascade'))
    .addColumn('locale', 'text', col => col.notNull())
    .addColumn('name', 'text', col => col.notNull())
    .addColumn('updated', 'timestamptz', col => col.notNull().defaultTo(sql`now()`))
    .execute()

  await db.schema
    .createIndex('category_translations_category_locale_uidx')
    .ifNotExists()
    .on('category_translations')
    .columns(['category_id', 'locale'])
    .unique()
    .execute()

  await db.schema
    .alterTable('pages')
    .addColumn('category_id', 'uuid', col =>
      col.references('categories.id').onDelete('restrict')
    )
    .execute()

  await db.schema
    .createIndex('pages_category_id_idx')
    .ifNotExists()
    .on('pages')
    .column('category_id')
    .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('pages').dropColumn('category_id').execute()
  await db.schema.dropTable('category_translations').ifExists().execute()
  await db.schema.dropTable('categories').ifExists().execute()
}
