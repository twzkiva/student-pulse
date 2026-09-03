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
