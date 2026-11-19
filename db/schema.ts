// db/schema.ts
// db/schema.ts (line 2)
import { pgTable, uuid, varchar, boolean, timestamp, text, integer, serial, index } from 'drizzle-orm/pg-core';// db/schema.ts

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique(),
  phone: varchar('phone', { length: 15 }).notNull().unique(),
  fullName: varchar('full_name', { length: 100 }),
  password: varchar('password', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const vehicles = pgTable('vehicles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  plateNumber: varchar('plate_number', { length: 20 }).notNull().unique(),
  makeModel: varchar('make_model', { length: 100 }),
  emergencyContact: varchar('emergency_contact', { length: 15 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  qrDownloads: integer('qr_downloads').default(0).notNull(),
});

export const qrTags = pgTable('qr_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id, { onDelete: 'cascade' }).notNull(),
  publicSlug: varchar('public_slug', { length: 32 }).notNull().unique(),
  isEnabled: boolean('is_enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const alertLogs = pgTable('alert_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tagId: uuid('tag_id').references(() => qrTags.id, { onDelete: 'cascade' }).notNull(),
  alertType: varchar('alert_type', { length: 30 }).notNull(),
  scannerIp: varchar('scanner_ip', { length: 45 }),
  status: varchar('status', { length: 20 }).default('SENT'),
  ownerReply: varchar('owner_reply', { length: 120 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const callSessions = pgTable('call_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tagId: uuid('tag_id').references(() => qrTags.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 20 }).default('RINGING').notNull(),
  offerSdp: text('offer_sdp').notNull(),
  answerSdp: text('answer_sdp'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const callLogs = pgTable(
  'call_logs',
  {
    id: serial('id').primaryKey(),
    tagSlug: text('tag_slug').notNull(),
    scannerHash: text('scanner_hash').notNull(),
    callDateIst: text('call_date_ist').notNull(), // e.g., "2026-11-19"
    durationSeconds: integer('duration_seconds').default(0).notNull(),
    status: text('status').default('initiated').notNull(), // 'initiated' | 'connected' | 'ended'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tagScannerDayIdx: index('tag_scanner_day_idx').on(
      table.tagSlug,
      table.scannerHash,
      table.callDateIst
    ),
  })
);