// src/app/api/payments/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { payments, users } from '@/db/schema';
import { PLANS, PlanType, ShippingAddressInput } from '@/lib/plans';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const planType = body.planType as PlanType;
    const shipping = body.shipping as ShippingAddressInput | undefined;

    const selectedPlan = PLANS[planType];
    if (!selectedPlan) {
      return NextResponse.json({ error: 'Invalid plan selected.' }, { status: 400 });
    }

    // Option A: Require valid delivery address for ₹299 plan before payment
    if (selectedPlan.includesPhysicalSticker) {
      if (
        !shipping?.recipientName?.trim() ||
        !shipping?.recipientPhone?.trim() ||
        !shipping?.addressLine?.trim() ||
        !shipping?.city?.trim() ||
        !shipping?.state?.trim() ||
        !/^\d{6}$/.test((shipping?.pincode || '').trim())
      ) {
        return NextResponse.json(
          { error: 'Please fill a complete delivery address with a valid 6-digit pincode.' },
          { status: 400 }
        );
      }
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Razorpay credentials missing on server.' },
        { status: 500 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await razorpay.orders.create({
      amount: selectedPlan.amountPaise,
      currency: 'INR',
      receipt: `wp_${Date.now()}`,
      notes: {
        userId: session.userId,
        planType: selectedPlan.id,
      },
    });

    await db.insert(payments).values({
      userId: session.userId,
      razorpayOrderId: order.id,
      planType: selectedPlan.id,
      amountInr: selectedPlan.priceInr,
      status: 'CREATED',
      shippingSnapshot: selectedPlan.includesPhysicalSticker
        ? JSON.stringify({
            plateNumber: shipping?.plateNumber?.toUpperCase().trim() || '',
            recipientName: shipping!.recipientName.trim(),
            recipientPhone: shipping!.recipientPhone.trim(),
            addressLine: shipping!.addressLine.trim(),
            city: shipping!.city.trim(),
            state: shipping!.state.trim(),
            pincode: shipping!.pincode.trim(),
          })
        : null,
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || keyId,
      planName: selectedPlan.name,
      user: {
        name: user?.fullName || 'WHO PARK Driver',
        email: user?.email || '',
        phone: user?.phone || '',
      },
    });
  } catch (err: any) {
    console.error('[CREATE ORDER ERROR]', err);
    return NextResponse.json(
      { error: err?.message || 'Could not initiate Razorpay order.' },
      { status: 500 }
    );
  }
}