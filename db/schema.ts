import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const scheduleEntries = sqliteTable('schedule_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  weekType: text('week_type').notNull(),
  dayKey: text('day_key').notNull(),
  period: integer('period').notNull(),
  subject: text('subject'),
  room: text('room'),
  teacher: text('teacher'),
  dossier: text('dossier'),
  route: text('route'),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('idx_schedule_week_day_period').on(table.weekType, table.dayKey, table.period),
])

export const homework = sqliteTable('homework', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  subject: text('subject').notNull(),
  text: text('text').notNull(),
  dueDate: text('due_date'),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_homework_active_due').on(table.completed, table.dueDate),
])

export const errorReports = sqliteTable('error_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull(),
  reporterChatId: text('reporter_chat_id'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const telegramUpdates = sqliteTable('telegram_updates', {
  updateId: integer('update_id').primaryKey(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
})

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  passwordSalt: text('password_salt'),
  passwordIterations: integer('password_iterations'),
  passwordAlgorithm: text('password_algorithm').notNull().default('pbkdf2-sha256-hmacpepper-v1'),
  googleSub: text('google_sub'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: text('last_login_at'),
}, (table) => [
  uniqueIndex('idx_users_email').on(table.email),
  uniqueIndex('idx_users_google_sub').on(table.googleSub),
])

export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_sessions_user_id').on(table.userId),
  index('idx_sessions_expires_at').on(table.expiresAt),
])

export const authAttempts = sqliteTable('auth_attempts', {
  key: text('key').primaryKey(),
  attempts: integer('attempts').notNull().default(0),
  resetAt: integer('reset_at').notNull(),
}, (table) => [
  index('idx_auth_attempts_reset_at').on(table.resetAt),
])
