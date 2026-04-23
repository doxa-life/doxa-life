import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('pages_parent_slug_idx').ifExists().execute()
  await db.schema.alterTable('pages').dropColumn('parent_slug').execute()
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('pages')
    .addColumn('parent_slug', 'text')
    .execute()

  await db.schema
    .createIndex('pages_parent_slug_idx')
    .ifNotExists()
    .on('pages')
    .column('parent_slug')
    .execute()

  // Re-derive parent_slug from category.slug for any page still linked
  // so a reversed migration leaves the app in its old shape.
  await sql`
    UPDATE pages p
    SET parent_slug = c.slug
    FROM categories c
    WHERE p.category_id = c.id AND p.slug <> c.slug
  `.execute(db)
}
