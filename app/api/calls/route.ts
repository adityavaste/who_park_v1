// app/api/calls/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { callSessions, qrTags, vehicles } from '@/db/schema';
import { eq, and, gt, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { sendPushToOwner } from '@/lib/sendPush';

// POST: Scanner initiates an anonymous WebRTC call (stores SDP Offer & sends background push)
export async function POST(req: NextRequest) {
  try {
    const { slug, offerSdp } = await req.json();

    if (!slug || !offerSdp) {
      return NextResponse.json({ error: 'Slug and offerSdp are required' }, { status: 400 });
    }

    const [record] = await db
      .select({
        tagId: qrTags.id,
        isEnabled: qrTags.isEnabled,
        plateNumber: vehicles.plateNumber,
        ownerUserId: vehicles.userId,
      })
      .from(qrTags)
      .innerJoin(vehicles, eq(qrTags.vehicleId, vehicles.id))
      .where(eq(qrTags.publicSlug, slug))
      .limit(1);

    if (!record || !record.isEnabled) {
      return NextResponse.json(
        { error: 'Vehicle sticker is inactive or not found' },
        { status: 404 }
      );
    }

    const [createdCall] = await db
      .insert(callSessions)
      .values({
        tagId: record.tagId,
        status: 'RINGING',
        offerSdp: JSON.stringify(offerSdp),
      })
      .returning({ id: callSessions.id });

    // Wake up owner's phone via Background Web Push so they can tap & answer
    await sendPushToOwner(record.ownerUserId, {
      title: `📞 INCOMING ANONYMOUS CALL (${record.plateNumber})`,
      body: 'Someone scanned your QR sticker and is calling you. Tap to answer now!',
      url: '/dashboard',
    });

    return NextResponse.json({ success: true, callId: createdCall.id });
  } catch (error: any) {
    console.error('Start call error:', error);
    return NextResponse.json({ error: error.message || 'Failed to start call' }, { status: 500 });
  }
}

// GET: Owner dashboard checks for active RINGING calls (within last 60 seconds)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);

    const activeCalls = await db
      .select({
        id: callSessions.id,
        tagId: callSessions.tagId,
        status: callSessions.status,
        offerSdp: callSessions.offerSdp,
        createdAt: callSessions.createdAt,
        plateNumber: vehicles.plateNumber,
      })
      .from(callSessions)
      .innerJoin(qrTags, eq(callSessions.tagId, qrTags.id))
      .innerJoin(vehicles, eq(qrTags.vehicleId, vehicles.id))
      .where(
        and(
          eq(vehicles.userId, session.userId),
          eq(callSessions.status, 'RINGING'),
          gt(callSessions.createdAt, sixtySecondsAgo)
        )
      )
      .orderBy(desc(callSessions.createdAt))
      .limit(1);

    return NextResponse.json(
      { success: true, incomingCall: activeCalls[0] || null },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}