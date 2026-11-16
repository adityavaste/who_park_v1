// app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid push subscription' }, { status: 400 });
    }

    // Remove any existing row for this device endpoint, then insert fresh
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint));

    await db.insert(pushSubscriptions).values({
      userId: session.userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PUSH SUBSCRIBE ERROR]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}