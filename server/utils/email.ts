import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { sendViaSendgrid } from './sendgrid'
import { renderEmailTemplate, type EmailTemplateData } from './email-templates'

const isDevelopment = (process.env.NODE_ENV || 'development') === 'development'

// MailHog transporter, development only. Production sends go through SendGrid.
let transporter: Transporter | null = null

function getEmailConfig() {
  try {
    const config = useRuntimeConfig()
    return {
      smtpFrom: config.smtpFrom || process.env.SMTP_FROM,
      smtpFromName: config.smtpFromName || process.env.SMTP_FROM_NAME,
      appName: config.appName || process.env.APP_NAME
    }
  } catch {
    return {
      smtpFrom: process.env.SMTP_FROM,
      smtpFromName: process.env.SMTP_FROM_NAME,
      appName: process.env.APP_NAME
    }
  }
}

function getDevTransporter(): Transporter {
  if (transporter) return transporter

  console.log('[Email] Using MailHog (development mode)')
  transporter = nodemailer.createTransport({
    host: 'localhost',
    port: 1025,
    secure: false,
    tls: { rejectUnauthorized: false }
  })
  return transporter
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
}

export interface TemplateEmailOptions {
  to: string | string[]
  template: keyof typeof import('./email-templates').emailTemplates
  data: EmailTemplateData
  from?: string
  subject?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const config = getEmailConfig()

    let fromEmail = options.from
    if (!fromEmail) {
      const fromName = config.smtpFromName || config.appName
      const fromAddress = isDevelopment
        ? 'noreply@localhost.local'
        : (config.smtpFrom || 'noreply@yourdomain.com')
      fromEmail = fromName ? `${fromName} <${fromAddress}>` : fromAddress
    }

    const text = options.text || options.html.replace(/<[^>]*>/g, '')

    let messageId: string | undefined
    if (isDevelopment) {
      const info = await getDevTransporter().sendMail({
        from: fromEmail,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text
      })
      messageId = info.messageId
    } else {
      // Recipient arrays go through as-is: SendGrid takes one address object per
      // recipient, and a comma-joined string would be read as a single address.
      const info = await sendViaSendgrid({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text
      })
      messageId = info.messageId
    }
    console.log('[Email] Sent successfully:', messageId)
    return true
  } catch (error) {
    if (!process.env.VITEST) {
      console.error('[Email] Error sending:', error)
    }
    return false
  }
}

export async function sendTemplateEmail(options: TemplateEmailOptions): Promise<boolean> {
  try {
    const config = getEmailConfig()
    const appName = config.appName || 'App'

    const templateData = { ...options.data, appName }
    const { subject, html, text } = renderEmailTemplate(options.template, templateData)

    return await sendEmail({
      to: options.to,
      subject: options.subject || subject,
      html,
      text,
      from: options.from
    })
  } catch (error) {
    if (!process.env.VITEST) {
      console.error('[Email] Error sending template email:', error)
    }
    return false
  }
}

export async function sendBulkTemplateEmails(emails: TemplateEmailOptions[]): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const email of emails) {
    const result = await sendTemplateEmail(email)
    if (result) success++
    else failed++
  }

  return { success, failed }
}
