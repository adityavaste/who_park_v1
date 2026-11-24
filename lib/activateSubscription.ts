// src/lib/activateSubscription.ts
import { db } from '@/db';
import { payments, stickerOrders, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function activatePaidOrder(
  razorpayOrderId: string,
  razorpayPaymentId: string
) {
  const [record] = await db
    .select()
    .from(payments)
    .where(eq(payments.razorpayOrderId, razorpayOrderId))
    .limit(1);

  if (!record) {
    throw new Error('Order record not found.');
  }

  // Idempotency guard: if already marked PAID, return existing user expiry
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, record.userId))
    .limit(1);

  if (record.status === 'PAID') {
    return {
      plan: user?.plan || record.planType,
      planExpiresAt: user?.planExpiresAt || null,
    };
  }

  // 1. Mark payment PAID
  await db
    .update(payments)
    .set({
      razorpayPaymentId,
      status: 'PAID',
    })
    .where(eq(payments.id, record.id));

  // 2. Extend plan validity by 1 year (preserving any remaining active days)
  const newExpiresAt = computeNewExpiryDate(user?.planExpiresAt);

  await db
    .update(users)
    .set({
      plan: record.planType,
      planExpiresAt: newExpiresAt,
    })
    .where(eq(users.id, record.userId));

  // 3. If PLUS_299 had a shipping snapshot, queue physical sticker dispatch for Admin
  if (record.planType === 'PLUS_299' && record.shippingSnapshot) {
    try {
      const addr = JSON.parse(record.shippingSnapshot) as ShippingAddressInput;
      await db.insert(stickerOrders).values({
        userId: record.userId,
        paymentId: record.id,
        plateNumber: addr.plateNumber || null,
        recipientName: addr.recipientName,
        recipientPhone: addr.recipientPhone,
        addressLine: addr.addressLine,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        dispatchStatus: 'PENDING_DISPATCH',
      });
    } catch (parseErr) {
      console.error('[STICKER ORDER INSERT ERROR]', parseErr);
    }
  }

  return {
    plan: record.planType,
    planExpiresAt: newExpiresAt,
  };
}