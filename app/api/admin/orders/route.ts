// src/app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import { db } from '@/db';
import { payments, stickerOrders, users } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [revRes] = await db
    .select({
      totalRevenueInr: sql<number>`coalesce(sum(${payments.amountInr}), 0)::int`,
      paidOrdersCount: sql<number>`count(*)::int`,
    })
    .from(payments)
    .where(eq(payments.status, 'PAID'));

  const dispatchQueue = await db
    .select({
      id: stickerOrders.id,
      plateNumber: stickerOrders.plateNumber,
      recipientName: stickerOrders.recipientName,
      recipientPhone: stickerOrders.recipientPhone,
      addressLine: stickerOrders.addressLine,
      city: stickerOrders.city,
      state: stickerOrders.state,
      pincode: stickerOrders.pincode,
      dispatchStatus: stickerOrders.dispatchStatus,
      trackingNumber: stickerOrders.trackingNumber,
      createdAt: stickerOrders.createdAt,
      accountEmail: users.email,
    })
    .from(stickerOrders)
    .leftJoin(users, eq(users.id, stickerOrders.userId))
    .orderBy(desc(stickerOrders.createdAt));

  return NextResponse.json({
    success: true,
    totalRevenueInr: revRes?.totalRevenueInr || 0,
    paidOrdersCount: revRes?.paidOrdersCount || 0,
    dispatchQueue,
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId, dispatchStatus, trackingNumber } = await req.json();
  if (!orderId || !dispatchStatus) {
    return NextResponse.json({ error: 'Missing orderId or dispatchStatus' }, { status: 400 });
  }

  await db
    .update(stickerOrders)
    .set({
      dispatchStatus,
      trackingNumber: trackingNumber?.trim() || null,
    })
    .where(eq(stickerOrders.id, orderId));

  return NextResponse.json({ success: true });
}