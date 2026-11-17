// app/api/alerts/trigger/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { alertLogs, qrTags, vehicles } from '@/db/schema';
import { eq, and, gt, desc } from 'drizzle-orm';
import { sendPushToOwner } from '@/lib/sendPush';
import { purgeExpiredRecords } from '@/lib/cleanupDb';

const ALERT_LABELS: Record<string, string> = {
  OBSTRUCTION: '🚗 Your car is blocking someone!',
  HEADLIGHTS: '💡 Headlights or window left open!',
  EMERGENCY: '🚨 Urgent tow / emergency alert!',
};

export async function POST(req: NextRequest) {
  try {
    const { slug, alertType } = await req.json();

    if (!slug || !alertType) {
      return NextResponse.json(
        { error: 'Sticker slug and alertType are required.' },
        { status: 400 }
      );
    }

    // 1. Resolve tag + vehicle + owner userId
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

    if (!record) {
      return NextResponse.json({ error: 'Vehicle sticker not found.' }, { status: 404 });
    }

    if (!record.isEnabled) {
      return NextResponse.json(
        { error: 'This QR sticker is currently paused by the owner.' },
        { status: 403 }
      );
    }

    const forwardedFor = req.headers.get('x-forwarded-for');
    const scannerIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    // 2. Enforce 5-minute cooldown per scanner IP on this vehicle
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentSameTag = await db
      .select({ createdAt: alertLogs.createdAt })
      .from(alertLogs)
      .where(
        and(
          eq(alertLogs.tagId, record.tagId),
          eq(alertLogs.scannerIp, scannerIp),
          gt(alertLogs.createdAt, fiveMinutesAgo)
        )
      )
      .orderBy(desc(alertLogs.createdAt))
      .limit(1);

    if (recentSameTag.length > 0 && recentSameTag[0].createdAt) {
      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(recentSameTag[0].createdAt).getTime()) / 1000
      );
      const retryAfterSeconds = Math.max(300 - elapsedSeconds, 1);
      return NextResponse.json(
        {
          error: 'Please wait before sending another alert to this car.',
          retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    // 3. Enforce max 10 alerts per 24 hours per scanner IP
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyLogs = await db
      .select({ id: alertLogs.id })
      .from(alertLogs)
      .where(
        and(
          eq(alertLogs.scannerIp, scannerIp),
          gt(alertLogs.createdAt, twentyFourHoursAgo)
        )
      );

    if (dailyLogs.length >= 10) {
      return NextResponse.json(
        {
          error: 'Daily limit of 10 alerts reached.',
          dailyLimitReached: true,
        },
        { status: 429 }
      );
    }

    // 4. Insert alert log into Neon PostgreSQL
    const [insertedAlert] = await db
      .insert(alertLogs)
      .values({
        tagId: record.tagId,
        alertType,
        scannerIp,
        status: 'SENT',
      })
      .returning({ id: alertLogs.id });

    // Purge alert_logs > 24h and call_sessions > 1h in background
    purgeExpiredRecords().catch((err) => console.error('[DB CLEANUP]', err));

    // 5. Wake up owner's phone via Background Push even if app is closed
    const readableMessage = ALERT_LABELS[alertType] || `Vehicle Alert: ${alertType}`;
    await sendPushToOwner(record.ownerUserId, {
      title: `🚨 ${record.plateNumber} — WHO PARK ALERT`,
      body: `${readableMessage} Tap to send a quick reply.`,
      url: '/dashboard',
    });

    return NextResponse.json({
      success: true,
      alertId: insertedAlert.id,
      cooldownSeconds: 300,
      remainingDailyPings: Math.max(10 - (dailyLogs.length + 1), 0),
    });
  } catch (error: any) {
    console.error('Trigger alert error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send alert.' },
      { status: 500 }
    );
  }
}