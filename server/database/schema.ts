import type { ColumnType, Generated } from 'kysely'

export interface UsersTable {
  id: Generated<string>
  created: ColumnType<Date, string | undefined, string>
  updated: ColumnType<Date, string | undefined, string>
  email: string
  display_name: string
  avatar: Generated<string>
  password: Generated<string>
  verified: Generated<boolean>
  roles: Generated<string[]>
  token_key: Generated<string>
  pending_email: string | null
  email_change_token: string | null
}

export interface PasswordResetRequestsTable {
  id: Generated<string>
  created: ColumnType<Date, Date | string | undefined, Date | string>
  expires: ColumnType<Date, Date | string, Date | string>
  user_id: string
  token: string
  used: Generated<boolean>
}

export interface ActivityLogsTable {
  id: Generated<string>
  timestamp: ColumnType<Date, Date | string | undefined, Date | string>
  event_type: string
  table_name: string | null
  record_id: string | null
  user_id: string | null
  user_agent: string | null
  metadata: Generated<Record<string, any>>
}

export interface PagesTable {
  id: Generated<string>
  slug: string
  parent_slug: string | null
  menu_order: Generated<number>
  custom_css: string | null
  created: ColumnType<Date, Date | string | undefined, Date | string>
  updated: ColumnType<Date, Date | string | undefined, Date | string>
}

export interface PageTranslationsTable {
  id: Generated<string>
  page_id: string
  locale: string
  title: string
  body_json: Generated<Record<string, any>>
  excerpt: string | null
  featured_image: string | null
  meta_title: string | null
  meta_description: string | null
  og_image: string | null
  status: Generated<'draft' | 'published'>
  updated: ColumnType<Date, Date | string | undefined, Date | string>
}

export interface Database {
  users: UsersTable
  password_reset_requests: PasswordResetRequestsTable
  activity_logs: ActivityLogsTable
  pages: PagesTable
  page_translations: PageTranslationsTable
}
