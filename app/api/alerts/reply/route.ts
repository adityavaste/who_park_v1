// src/app/api/alerts/reply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { alertLogs, qrTags, vehicles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alertId, replyMessage } = await req.json();
    if (!alertId || !replyMessage) {
      return NextResponse.json({ error: 'Alert ID and reply message are required.' }, { status: 400 });
    }

    // Verify the alert belongs to a vehicle owned by the logged-in user
    const ownedAlert = await db
      .select({ id: alertLogs.id })
      .from(alertLogs)
      .innerJoin(qrTags, eq(alertLogs.tagId, qrTags.id))
      .innerJoin(vehicles, eq(qrTags.vehicleId, vehicles.id))
      .where(and(eq(alertLogs.id, alertId), eq(vehicles.userId, session.userId)))
      .limit(1);

    if (!ownedAlert.length) {
      return NextResponse.json({ error: 'Alert not found.' }, { status: 404 });
    }

    await db
      .update(alertLogs)
      .set({
        ownerReply: replyMessage,
        status: 'REPLIED',
      })
      .where(eq(alertLogs.id, alertId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}