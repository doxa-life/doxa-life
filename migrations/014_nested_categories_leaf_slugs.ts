import { Kysely, sql } from 'kysely'

// Switches the CMS to nested categories with leaf-only slugs.
//
// Before: pages.slug stored the full URL path ("resources/overview");
// categories were flat (no parent_id); the slug prefix and category_id
// were independent fields that could drift apart.
//
// After: each category has an optional parent_id forming a tree;
// pages.slug stores only the page's own segment ("overview"); the
// public URL is derived at request time by walking the category chain
// + appending the page slug. Renaming or moving anywhere in the tree
// instantly updates every URL underneath.
//
// Uniqueness:
//   - categories(parent_id, slug) unique — top-level slugs unique
//     across NULL parents via a partial index.
//   - pages(category_id, slug) unique — uncategorized slugs unique via
//     a partial index. (Postgres treats NULLs as distinct in normal
//     unique indexes.)

export async function up(db: Kysely<any>): Promise<void> {
  // ── 1. Add parent_id to categories ─────────────────────────────
  await db.schema
    .alterTable('categories')
    .addColumn('parent_id', 'uuid', col =>
      col.references('categories.id').onDelete('restrict')
    )
    .execute()

  await db.schema
    .createIndex('categories_parent_id_idx')
    .ifNotExists()
    .on('categories')
    .column('parent_id')
    .execute()

  // ── 2. Drop the old global slug uniqueness on both tables BEFORE
  //       rewriting page slugs — different categories will end up
  //       with the same leaf (e.g. each one's "overview" page).
  // Drop the constraint first; the implicit unique index goes with
  // it. (Dropping the index directly fails because the constraint
  // owns it.) Some Kysely-Postgres versions name the index instead;
  // try both forms with IF EXISTS so we don't care which one exists.
  await sql`ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_slug_key`.execute(db)
  await db.schema.dropIndex('categories_slug_key').ifExists().execute()

  await sql`ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_slug_key`.execute(db)
  await db.schema.dropIndex('pages_slug_key').ifExists().execute()

  // ── 3. Split page slugs to leaves. Every page whose slug starts
  //       with "{category.slug}/" gets its slug rewritten to whatever
  //       follows the prefix.
  await sql`
    UPDATE pages p
    SET slug = substring(p.slug from length(c.slug) + 2)
    FROM categories c
    WHERE p.category_id = c.id
      AND p.slug LIKE c.slug || '/%'
  `.execute(db)

  // ── 4. Re-add scoped uniqueness on both tables (partial indexes so
  //       NULL parent / NULL category still enforce uniqueness across
  //       the top-level set).
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS categories_parent_slug_uidx
    ON categories (parent_id, slug)
    WHERE parent_id IS NOT NULL
  `.execute(db)

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS categories_root_slug_uidx
    ON categories (slug)
    WHERE parent_id IS NULL
  `.execute(db)

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS pages_category_slug_uidx
    ON pages (category_id, slug)
    WHERE category_id IS NOT NULL
  `.execute(db)

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS pages_root_slug_uidx
    ON pages (slug)
    WHERE category_id IS NULL
  `.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
  // Re-prefix every page's slug with its category slug so the old
  // global-slug-as-path model still resolves URLs.
  await sql`
    UPDATE pages p
    SET slug = c.slug || '/' || p.slug
    FROM categories c
    WHERE p.category_id = c.id
      AND position('/' in p.slug) = 0
      AND p.slug <> c.slug
  `.execute(db)

  await sql`DROP INDEX IF EXISTS pages_category_slug_uidx`.execute(db)
  await sql`DROP INDEX IF EXISTS pages_root_slug_uidx`.execute(db)
  await sql`DROP INDEX IF EXISTS categories_parent_slug_uidx`.execute(db)
  await sql`DROP INDEX IF EXISTS categories_root_slug_uidx`.execute(db)

  await sql`ALTER TABLE pages ADD CONSTRAINT pages_slug_key UNIQUE (slug)`.execute(db)
  await sql`ALTER TABLE categories ADD CONSTRAINT categories_slug_key UNIQUE (slug)`.execute(db)

  await db.schema.dropIndex('categories_parent_id_idx').ifExists().execute()
  await db.schema.alterTable('categories').dropColumn('parent_id').execute()
}
