import { getQuery } from 'h3'
import { db, sql } from '../../utils/database'
import { requirePermission } from '../../utils/rbac'

const SORTABLE_COLUMNS = ['display_name', 'email', 'verified', 'created', 'last_login'] as const
type SortColumn = typeof SORTABLE_COLUMNS[number]

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'users.view')

  const query = getQuery(event)

  const pageRaw = Number(query.page ?? 1)
  const pageSizeRaw = Number(query.pageSize ?? 50)
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1
  const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw >= 1 && pageSizeRaw <= 200
    ? Math.floor(pageSizeRaw)
    : 50

  const q = typeof query.q === 'string' ? query.q.trim() : ''

  const sortParam = typeof query.sort === 'string' ? query.sort : 'created'
  const sort: SortColumn = (SORTABLE_COLUMNS as readonly string[]).includes(sortParam)
    ? sortParam as SortColumn
    : 'created'
  const dir: 'asc' | 'desc' = query.dir === 'asc' ? 'asc' : 'desc'

  const pattern = q ? `%${q}%` : null

  const totalRow = await db
    .selectFrom('users')
    .select(eb => eb.fn.countAll<string>().as('count'))
    .$if(!!pattern, qb => qb.where(eb => eb.or([
      eb('users.display_name', 'ilike', pattern!),
      eb('users.email', 'ilike', pattern!)
    ])))
    .executeTakeFirst()
  const total = Number(totalRow?.count ?? 0)

  const orderExpr = sort === 'last_login'
    ? sql`last_login ${sql.raw(dir)} nulls last`
    : sort === 'display_name'
      ? sql`users.display_name ${sql.raw(dir)}`
      : sort === 'email'
        ? sql`users.email ${sql.raw(dir)}`
        : sort === 'verified'
          ? sql`users.verified ${sql.raw(dir)}`
          : sql`users.created ${sql.raw(dir)}`

  const rows = await db
    .selectFrom('users')
    .select([
      'users.id',
      'users.display_name',
      'users.email',
      'users.verified',
      'users.created',
      'users.roles',
      'users.password',
      'users.token_expires_at',
      eb => eb
        .selectFrom('activity_logs')
        .select(eb2 => eb2.fn.max('activity_logs.timestamp').as('last_login'))
        .where('activity_logs.event_type', '=', 'LOGIN')
        .whereRef('activity_logs.user_id', '=', 'users.id')
        .as('last_login')
    ])
    .$if(!!pattern, qb => qb.where(eb => eb.or([
      eb('users.display_name', 'ilike', pattern!),
      eb('users.email', 'ilike', pattern!)
    ])))
    .orderBy(orderExpr)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .execute()

  const now = Date.now()
  const decorated = rows.map(({ password, token_expires_at, ...rest }) => {
    let status: 'active' | 'not_verified' | 'pending_invite' | 'expired_invite'
    if (rest.verified) {
      status = 'active'
    } else if (password !== null) {
      status = 'not_verified'
    } else {
      const expiresMs = token_expires_at ? new Date(token_expires_at).getTime() : 0
      status = expiresMs > now ? 'pending_invite' : 'expired_invite'
    }
    return { ...rest, status }
  })

  return {
    rows: decorated,
    total,
    page,
    pageSize
  }
})
