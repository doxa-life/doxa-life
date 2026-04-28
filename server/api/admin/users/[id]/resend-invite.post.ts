import { randomUUID } from 'crypto'
import { getRouterParam, getHeader, getRequestURL } from 'h3'
import { db } from '../../../../utils/database'
import { requirePermission } from '../../../../utils/rbac'
import { logEvent } from '../../../../utils/activity-logger'
import { sendTemplateEmail } from '../../../../utils/email'

export default defineEventHandler(async (event) => {
  const admin = await requirePermission(event, 'users.manage')

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'User id is required' })
  }

  const user = await db
    .selectFrom('users')
    .select(['id', 'email', 'display_name', 'password', 'verified'])
    .where('id', '=', id)
    .executeTakeFirst()

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  if (user.verified) {
    throw createError({ statusCode: 409, statusMessage: 'User is already verified' })
  }

  const isInvite = user.password === null
  const tokenKey = randomUUID()
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await db
    .updateTable('users')
    .set({
      token_key: tokenKey,
      token_expires_at: expires.toISOString(),
      updated: new Date().toISOString(),
    })
    .where('id', '=', id)
    .execute()

  const baseUrl = getRequestURL(event).origin

  try {
    if (isInvite) {
      const inviteUrl = `${baseUrl}/accept-invite?token=${tokenKey}`
      await sendTemplateEmail({
        to: user.email,
        template: 'invite',
        data: {
          userName: user.display_name,
          inviterName: admin.display_name,
          inviteUrl
        }
      })
    } else {
      const verificationUrl = `${baseUrl}/api/auth/verify?token=${tokenKey}`
      await sendTemplateEmail({
        to: user.email,
        template: 'verification',
        data: {
          userName: user.display_name,
          verificationUrl
        }
      })
    }
  } catch (err) {
    console.error('Error sending email:', err)
  }

  await logEvent({
    eventType: isInvite ? 'invite_resent' : 'verification_resent',
    tableName: 'users',
    recordId: id,
    userId: admin.userId,
    userAgent: getHeader(event, 'user-agent') || undefined,
    metadata: { email: user.email }
  })

  return { success: true, type: isInvite ? 'invite' : 'verification' }
})
