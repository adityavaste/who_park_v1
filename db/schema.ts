// db/schema.ts
import { pgTable, uuid, varchar, boolean, timestamp, text, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique(),
  phone: varchar('phone', { length: 15 }).notNull().unique(),
  fullName: varchar('full_name', { length: 100 }),
  password: varchar('password', { length: 255 }),
  plan: varchar('plan', { length: 30 }).default('NONE').notNull(), // 'NONE' | 'BASIC_199' | 'PLUS_299' | 'BUSINESS_999'
  planExpiresAt: timestamp('plan_expires_at', { withTimezone: true }),
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
  vehicleId: uuid('vehicle_id').references(() => vehicles.id, { onDelete: 'cascade' }),
  publicSlug: varchar('public_slug', { length: 32 }).notNull().unique(),
  batchName: varchar('batch_name', { length: 100 }),
  isEnabled: boolean('is_enabled').default(true),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
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

export const callLogs = pgTable('call_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tagSlug: varchar('tag_slug', { length: 32 }).notNull(),
  scannerHash: varchar('scanner_hash', { length: 128 }).notNull(),
  callDateIst: varchar('call_date_ist', { length: 16 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  razorpayOrderId: varchar('razorpay_order_id', { length: 100 }).notNull().unique(),
  razorpayPaymentId: varchar('razorpay_payment_id', { length: 100 }),
  planType: varchar('plan_type', { length: 30 }).notNull(), // 'BASIC_199' | 'PLUS_299' | 'BUSINESS_999'
  amountInr: integer('amount_inr').notNull(),
  status: varchar('status', { length: 20 }).default('CREATED').notNull(), // 'CREATED' | 'PAID' | 'FAILED'
  shippingSnapshot: text('shipping_snapshot'), // JSON string for PLUS_299 Option A delivery address
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const stickerOrders = pgTable('sticker_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'cascade' }).notNull(),
  plateNumber: varchar('plate_number', { length: 30 }),
  recipientName: varchar('recipient_name', { length: 100 }).notNull(),
  recipientPhone: varchar('recipient_phone', { length: 15 }).notNull(),
  addressLine: text('address_line').notNull(),
  city: varchar('city', { length: 80 }).notNull(),
  state: varchar('state', { length: 80 }).notNull(),
  pincode: varchar('pincode', { length: 10 }).notNull(),
  dispatchStatus: varchar('dispatch_status', { length: 30 }).default('PENDING_DISPATCH').notNull(), // 'PENDING_DISPATCH' | 'SHIPPED' | 'DELIVERED'
  trackingNumber: varchar('tracking_number', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});