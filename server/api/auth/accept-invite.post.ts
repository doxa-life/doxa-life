import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { readBody, getHeader, setCookie } from 'h3'
import { useRuntimeConfig } from '#imports'
import { db } from '../../utils/database'
import { logEvent, logLogin } from '../../utils/activity-logger'
import { getUserPermissions } from '../../utils/rbac'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = typeof body?.token === 'string' ? body.token : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const display_name = typeof body?.display_name === 'string' ? body.display_name.trim() : ''

  if (!token) {
    throw createError({ statusCode: 400, statusMessage: 'Token is required' })
  }

  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })
  }

  if (display_name.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Display name must be at least 2 characters' })
  }

  const user = await db
    .selectFrom('users')
    .selectAll()
    .where('token_key', '=', token)
    .executeTakeFirst()

  if (!user || user.verified || user.password !== null) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation not found' })
  }

  const expires = user.token_expires_at ? new Date(user.token_expires_at) : null
  if (!expires || expires.getTime() <= Date.now()) {
    throw createError({ statusCode: 410, statusMessage: 'Invitation has expired' })
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const newTokenKey = randomUUID()

  await db
    .updateTable('users')
    .set({
      password: hashedPassword,
      display_name,
      verified: true,
      token_key: newTokenKey,
      token_expires_at: null,
      updated: new Date().toISOString(),
    })
    .where('id', '=', user.id)
    .execute()

  const jwtToken = jwt.sign(
    { userId: user.id, email: user.email, display_name },
    useRuntimeConfig().jwtSecret,
    { expiresIn: '120d' }
  )

  setCookie(event, 'auth-token', jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 120
  })

  const userAgent = getHeader(event, 'user-agent') || undefined

  await logEvent({
    eventType: 'invite_accepted',
    tableName: 'users',
    recordId: user.id,
    userId: user.id,
    userAgent,
    metadata: { email: user.email }
  })

  logLogin(user.id, userAgent, { via: 'invite_accept' })

  const permissions = await getUserPermissions(user.id)

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      display_name,
      avatar: user.avatar,
      verified: true,
      roles: user.roles,
      permissions: [...permissions]
    }
  }
})
