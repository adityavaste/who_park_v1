// src/app/api/call/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/db';
import { callLogs, qrTags } from '@/db/schema';
import { and, eq, count } from 'drizzle-orm';

const MAX_CALLS_PER_DAY = 3;
const MAX_CALL_DURATION_SECONDS = 180; // 3 minutes

function getTodayIst(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  });
}

function getScannerHash(req: NextRequest, deviceId?: string): string {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0]?.trim() || 'unknown-ip';
  const ua = req.headers.get('user-agent') || 'unknown-ua';
  const raw = `${ip}|${ua}|${deviceId || ''}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export async function POST(req: NextRequest) {
  try {
    const { tagSlug, deviceId } = await req.json();

    if (!tagSlug) {
      return NextResponse.json({ error: 'Vehicle tag is required.' }, { status: 400 });
    }

    // 1. Verify QR tag exists & is enabled using qrTags.publicSlug
    const [tag] = await db
      .select()
      .from(qrTags)
      .where(eq(qrTags.publicSlug, tagSlug))
      .limit(1);

    if (!tag || tag.isEnabled === false) {
      return NextResponse.json({ error: 'Vehicle QR not found or disabled.' }, { status: 404 });
    }

    const todayIst = getTodayIst();
    const scannerHash = getScannerHash(req, deviceId);

    // 2. Count calls made today by this user to this specific QR
    const [{ totalCalls }] = await db
      .select({ totalCalls: count() })
      .from(callLogs)
      .where(
        and(
          eq(callLogs.tagSlug, tagSlug),
          eq(callLogs.scannerHash, scannerHash),
          eq(callLogs.callDateIst, todayIst)
        )
      );

    if (Number(totalCalls) >= MAX_CALLS_PER_DAY) {
      return NextResponse.json(
        {
          locked: true,
          remainingCalls: 0,
          error:
            'Daily call limit reached (3/3 calls used today for this vehicle). Try again tomorrow or send a text alert.',
        },
        { status: 429 }
      );
    }

    // 3. Log this call attempt
    const [newLog] = await db
      .insert(callLogs)
      .values({
        tagSlug,
        scannerHash,
        callDateIst: todayIst,
        status: 'initiated',
      })
      .returning({ id: callLogs.id });

    const remainingAfterThis = MAX_CALLS_PER_DAY - (Number(totalCalls) + 1);
    const expiresAt = Date.now() + MAX_CALL_DURATION_SECONDS * 1000;

    return NextResponse.json({
      success: true,
      callLogId: newLog.id,
      maxDurationSeconds: MAX_CALL_DURATION_SECONDS,
      expiresAt,
      remainingCalls: remainingAfterThis,
    });
  } catch (error: any) {
    console.error('[CALL START LIMIT ERROR]', error);
    return NextResponse.json(
      { error: 'Unable to start call right now.' },
      { status: 500 }
    );
  }
}