// src/app/api/alerts/trigger/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { qrTags, alertLogs, vehicles, users } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';

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

    const { tagId } = tagData[0];

    // 2. Anti-Spam Rate Limit: Max 3 alerts in 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentAlerts = await db
      .select()
      .from(alertLogs)
      .where(
        and(
          eq(alertLogs.tagId, tagId),
          gte(alertLogs.createdAt, fiveMinutesAgo)
        )
      );

    if (recentAlerts.length >= 3) {
      return NextResponse.json(
        { error: 'Driver was already pinged! Please wait a few minutes before sending again.' },
        { status: 429 }
      );
    }

    // 3. Log alert event in database
    const forwarded = req.headers.get('x-forwarded-for');
    const scannerIp = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

    const [newLog] = await db
      .insert(alertLogs)
      .values({
        tagId,
        alertType,
        scannerIp,
        status: 'SENT',
      })
      .returning();

    // 4. Placeholder for future WhatsApp / Call dispatch:
    // await sendWhatsAppNotification(...)

    return NextResponse.json({
      success: true,
      message: 'Driver notified!',
      alertId: newLog.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Server error while sending alert.' },
      { status: 500 }
    );
  }
}