import { pgTable, uuid, varchar, boolean, timestamp, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: varchar('phone', { length: 15 }).notNull().unique(),
  fullName: varchar('full_name', { length: 100 }),
  password: varchar('password', { length: 255 }).notNull(),
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
  ownerReply: varchar('owner_reply', { length: 120 }), // 👈 Quick reply from owner
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