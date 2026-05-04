import { Kysely, sql } from 'kysely'

// One-shot data migration: convert the legacy `pages.parent_slug` string
// hierarchy into first-class categories. For each distinct non-null
// parent_slug we create a category with the same slug, translate its
// name from whichever page currently acts as the landing page for that
// section, and re-home every child page under the new category.
//
// Landing pages (pages whose slug exactly equals a category slug — e.g.
// the old About page with slug `about`) are renamed to `{slug}/overview`
// and dropped into the category as `menu_order = 0` so `/about` keeps
// resolving to the same content via the category-bare-slug path.

function titleCase(slug: string): string {
  return slug
    .split(/[/-]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export async function up(db: Kysely<any>): Promise<void> {
  const parents = await db
    .selectFrom('pages')
    .select('parent_slug')
    .distinct()
    .where('parent_slug', 'is not', null)
    .execute() as Array<{ parent_slug: string }>

  if (parents.length === 0) return

  // Deterministic order so menu_order on the categories table matches the
  // order admins see in dropdowns on repeat runs of a fresh DB dump.
  const parentSlugs = parents.map(p => p.parent_slug).sort()

  for (let i = 0; i < parentSlugs.length; i++) {
    const parentSlug = parentSlugs[i]

    const categoryRow = await db
      .insertInto('categories')
      .values({
        slug: parentSlug,
        menu_order: i
      })
      .returning(['id'])
      .executeTakeFirstOrThrow() as { id: string }

    // Seed translations from the page that currently carries the
    // section's landing content (slug === parentSlug). Fall back to a
    // title-cased slug when no such page / translation exists so every
    // enabled locale still gets a row.
    const landingPage = await db
      .selectFrom('pages')
      .select(['id'])
      .where('slug', '=', parentSlug)
      .executeTakeFirst() as { id: string } | undefined

    const translations = landingPage
      ? (await db
          .selectFrom('page_translations')
          .select(['locale', 'title'])
          .where('page_id', '=', landingPage.id)
          .execute()) as Array<{ locale: string; title: string }>
      : []

    const seenLocales = new Set<string>()
    for (const t of translations) {
      if (seenLocales.has(t.locale)) continue
      seenLocales.add(t.locale)
      await db
        .insertInto('category_translations')
        .values({
          category_id: categoryRow.id,
          locale: t.locale,
          name: t.title && t.title.trim() ? t.title : titleCase(parentSlug)
        })
        .execute()
    }

    if (!seenLocales.has('en')) {
      await db
        .insertInto('category_translations')
        .values({
          category_id: categoryRow.id,
          locale: 'en',
          name: titleCase(parentSlug)
        })
        .execute()
    }

    // Attach every child page to the new category.
    await db
      .updateTable('pages')
      .set({ category_id: categoryRow.id })
      .where('parent_slug', '=', parentSlug)
      .execute()

    // Promote the old landing page (if any) into the category as the
    // `/{category-slug}` default. Rename its slug so it doesn't collide
    // with the category prefix used by child page URLs.
    if (landingPage) {
      await db
        .updateTable('pages')
        .set({
          slug: `${parentSlug}/overview`,
          category_id: categoryRow.id,
          menu_order: 0,
          updated: sql`now()`
        })
        .where('id', '=', landingPage.id)
        .execute()
    }
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  // Best-effort rollback: detach pages, undo the landing-page rename,
  // then drop the category rows.
  const categories = await db
    .selectFrom('categories')
    .select(['id', 'slug'])
    .execute() as Array<{ id: string; slug: string }>

  for (const cat of categories) {
    // Restore the landing page slug if we renamed it.
    const landing = await db
      .selectFrom('pages')
      .select(['id'])
      .where('slug', '=', `${cat.slug}/overview`)
      .where('category_id', '=', cat.id)
      .executeTakeFirst() as { id: string } | undefined

    if (landing) {
      await db
        .updateTable('pages')
        .set({ slug: cat.slug })
        .where('id', '=', landing.id)
        .execute()
    }

    // Restore parent_slug from the category slug.
    await db
      .updateTable('pages')
      .set({ parent_slug: cat.slug, category_id: null })
      .where('category_id', '=', cat.id)
      .where('slug', '!=', cat.slug)
      .execute()
  }

  await db.deleteFrom('category_translations').execute()
  await db.deleteFrom('categories').execute()
}
