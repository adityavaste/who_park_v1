// src/app/api/payments/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSession } from '@/lib/auth';
import { activatePaidOrder } from '@/lib/activateSubscription';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Payment signature verification failed.' },
        { status: 400 }
      );
    }

    const result = await activatePaidOrder(razorpay_order_id, razorpay_payment_id);

    return NextResponse.json({
      success: true,
      plan: result.plan,
      planExpiresAt: result.planExpiresAt,
    });
  } catch (err: any) {
    console.error('[VERIFY PAYMENT ERROR]', err);
    return NextResponse.json(
      { error: err?.message || 'Could not verify payment.' },
      { status: 500 }
    );
  }
}