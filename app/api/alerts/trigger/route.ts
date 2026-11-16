// src/app/api/alerts/trigger/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { qrTags, alertLogs, vehicles, users, pushSubscriptions } from '@/db/schema';
import { eq, and, gte, or, desc } from 'drizzle-orm';
import crypto from 'crypto';
import * as webpush from 'web-push';

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@honksafe.in',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, alertType } = body;

    if (!slug || !alertType) {
      return NextResponse.json(
        { error: 'Sticker code and alert reason are required.' },
        { status: 400 }
      );
    }

    // 1. Fetch tag, vehicle & owner details
    const tagData = await db
      .select({
        tagId: qrTags.id,
        isEnabled: qrTags.isEnabled,
        userId: vehicles.userId,
        plateNumber: vehicles.plateNumber,
        ownerPhone: users.phone,
      })
      .from(qrTags)
      .innerJoin(vehicles, eq(qrTags.vehicleId, vehicles.id))
      .innerJoin(users, eq(vehicles.userId, users.id))
      .where(eq(qrTags.publicSlug, slug))
      .limit(1);

    if (!tagData.length || !tagData[0].isEnabled) {
      return NextResponse.json(
        { error: 'This sticker is inactive or invalid.' },
        { status: 404 }
      );
    }

    const { tagId, userId, plateNumber } = tagData[0];

    // 2. Identify the scanner via IP + anonymous visitor cookie
    const forwarded = req.headers.get('x-forwarded-for');
    const rawIp = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    let visitorId = req.cookies.get('honksafe_visitor_id')?.value;
    let isNewVisitorCookie = false;
    if (!visitorId) {
      visitorId = crypto.randomBytes(8).toString('hex');
      isNewVisitorCookie = true;
    }

    const scannerFingerprint = `${rawIp.slice(0, 26)}|${visitorId}`;

    const samePersonCondition = or(
      eq(alertLogs.scannerIp, scannerFingerprint),
      eq(alertLogs.scannerIp, rawIp)
    );

    // 3. RULE 1: 5-Minute Cooldown per vehicle for the same scanner
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentVehiclePing = await db
      .select({ createdAt: alertLogs.createdAt })
      .from(alertLogs)
      .where(
        and(
          eq(alertLogs.tagId, tagId),
          samePersonCondition,
          gte(alertLogs.createdAt, fiveMinutesAgo)
        )
      )
      .orderBy(desc(alertLogs.createdAt))
      .limit(1);

    if (recentVehiclePing.length > 0 && recentVehiclePing[0].createdAt) {
      const elapsedMs = Date.now() - new Date(recentVehiclePing[0].createdAt).getTime();
      const remainingSeconds = Math.max(1, Math.ceil((5 * 60 * 1000 - elapsedMs) / 1000));
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;

      return NextResponse.json(
        {
          error: `You already pinged this driver! Please wait ${mins}m ${secs
            .toString()
            .padStart(2, '0')}s before pinging again.`,
          retryAfterSeconds: remainingSeconds,
        },
        { status: 429 }
      );
    }

    // 4. RULE 2: Max 10 Pings in 24 Hours by the same scanner
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyPings = await db
      .select({ id: alertLogs.id })
      .from(alertLogs)
      .where(
        and(
          samePersonCondition,
          gte(alertLogs.createdAt, twentyFourHoursAgo)
        )
      );

    if (dailyPings.length >= 10) {
      return NextResponse.json(
        {
          error: 'Daily limit reached! You have already sent 10 alerts in the last 24 hours.',
          dailyLimitReached: true,
        },
        { status: 429 }
      );
    }

    // 5. Log alert event in database
    const [newLog] = await db
      .insert(alertLogs)
      .values({
        tagId,
        alertType,
        scannerIp: scannerFingerprint,
        status: 'SENT',
      })
      .returning();

    // 6. Send Background Web Push Notifications to all registered owner devices
    if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      const subs = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId));

      const alertLabel =
        alertType === 'OBSTRUCTION'
          ? '🚗 Your car is blocking someone!'
          : alertType === 'HEADLIGHTS'
          ? '💡 Headlights or window left open!'
          : '🚨 Urgent Tow / Emergency alert!';

      const payload = JSON.stringify({
        title: `🚨 ALERT: ${plateNumber}`,
        body: `${alertLabel} Tap to reply.`,
        url: '/dashboard',
      });

      await Promise.allSettled(
        subs.map((sub) =>
          webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          )
        )
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Driver notified!',
      alertId: newLog.id,
      cooldownSeconds: 300,
      remainingDailyPings: 10 - (dailyPings.length + 1),
    });

    if (isNewVisitorCookie) {
      response.cookies.set('honksafe_visitor_id', visitorId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Server error while sending alert.' },
      { status: 500 }
    );
  }
}