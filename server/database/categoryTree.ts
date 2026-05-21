// Category tree helpers. The CMS stores only the leaf segment of a
// page's URL on `pages.slug`; the full URL is derived by walking the
// category's ancestor chain at request time. These helpers keep that
// derivation in one place so the lookup endpoint, link builders, cache
// purgers, and admin previews all agree on what `/resources/adoption/foo`
// actually resolves to.

import type { Kysely } from 'kysely'
import { db } from '../utils/database'
import type { Database } from './schema'

export interface TreeCategory {
  id: string
  parent_id: string | null
  slug: string
  menu_order: number
}

export interface CategoryTree {
  byId: Map<string, TreeCategory>
  childrenByParent: Map<string | null, TreeCategory[]>
}

// Load every category row into an in-memory tree. Categories are
// shallow (dozens of rows), so a single SELECT-all + Map build is
// cheaper than recursive CTE walks per page request.
export async function loadCategoryTree(
  executor: Kysely<Database> = db
): Promise<CategoryTree> {
  const rows = await executor
    .selectFrom('categories')
    .select(['id', 'parent_id', 'slug', 'menu_order'])
    .execute()

  const byId = new Map<string, TreeCategory>()
  const childrenByParent = new Map<string | null, TreeCategory[]>()
  for (const r of rows) {
    byId.set(r.id, r)
    const key = r.parent_id ?? null
    const list = childrenByParent.get(key) ?? []
    list.push(r)
    childrenByParent.set(key, list)
  }
  // Stable sibling ordering so callers don't have to re-sort.
  for (const list of childrenByParent.values()) {
    list.sort((a, b) =>
      a.menu_order - b.menu_order || a.slug.localeCompare(b.slug)
    )
  }
  return { byId, childrenByParent }
}

// Returns the chain of categories from root → leaf for the given id,
// or [] if the id isn't in the tree. Empty when called with null.
export function categoryChain(
  tree: CategoryTree,
  categoryId: string | null
): TreeCategory[] {
  if (!categoryId) return []
  const chain: TreeCategory[] = []
  let id: string | null = categoryId
  // Hard cap protects against accidental cycles in malformed data.
  for (let i = 0; i < 32 && id; i++) {
    const node = tree.byId.get(id)
    if (!node) break
    chain.unshift(node)
    id = node.parent_id
  }
  return chain
}

// Slug path for a category, e.g. "resources/adoption". Empty string
// when the category isn't in the tree.
export function categoryUrlPath(
  tree: CategoryTree,
  categoryId: string | null
): string {
  return categoryChain(tree, categoryId).map(c => c.slug).join('/')
}

// Full URL path for a page given its (leaf) slug + category. Examples:
//   page leaf "overview", category "resources" → "resources/overview"
//   page leaf "privacy", no category            → "privacy"
export function pageUrlPath(
  tree: CategoryTree,
  page: { slug: string; category_id: string | null }
): string {
  const prefix = categoryUrlPath(tree, page.category_id)
  return prefix ? `${prefix}/${page.slug}` : page.slug
}

// Walk a "/"-separated path through the category tree as far as it
// matches. Returns the deepest category we could match, plus the
// segments that come after it (zero or one segment for a page leaf,
// or more if the path doesn't fully resolve).
export interface ResolvedSegments {
  category: TreeCategory | null
  remaining: string[]
}

export function walkCategorySegments(
  tree: CategoryTree,
  segments: string[]
): ResolvedSegments {
  let parentId: string | null = null
  let current: TreeCategory | null = null
  let i = 0
  for (; i < segments.length; i++) {
    const seg = segments[i]!
    const siblings: TreeCategory[] = tree.childrenByParent.get(parentId) ?? []
    const match: TreeCategory | undefined = siblings.find((c: TreeCategory) => c.slug === seg)
    if (!match) break
    current = match
    parentId = match.id
  }
  return { category: current, remaining: segments.slice(i) }
}

// Returns the descendant category id set (including the root id),
// e.g. for cache purges that need to enumerate every page beneath a
// category that just got renamed or moved.
export function descendantCategoryIds(
  tree: CategoryTree,
  rootId: string
): string[] {
  const out: string[] = []
  // `seen` guards against a back-edge in malformed data (a descendant
  // re-parented onto an ancestor). Without it the stack would cycle
  // forever and grow `out` unbounded.
  const seen = new Set<string>()
  const stack: string[] = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
    const children = tree.childrenByParent.get(id) ?? []
    for (const c of children) stack.push(c.id)
  }
  return out
}

// Catches a self-or-ancestor cycle when re-parenting a category. Pass
// the candidate parent id; returns true when assigning it would create
// a loop (parent is the category itself or one of its descendants).
export function wouldCreateCycle(
  tree: CategoryTree,
  categoryId: string,
  newParentId: string | null
): boolean {
  if (!newParentId) return false
  if (newParentId === categoryId) return true
  const descendants = new Set(descendantCategoryIds(tree, categoryId))
  return descendants.has(newParentId)
}
