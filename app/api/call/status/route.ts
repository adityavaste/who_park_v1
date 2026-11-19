// src/app/api/call/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/db';
import { callLogs } from '@/db/schema';
import { and, eq, count } from 'drizzle-orm';

const MAX_CALLS_PER_DAY = 3;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tagSlug = searchParams.get('tagSlug') || '';
  const deviceId = searchParams.get('deviceId') || '';

  if (!tagSlug) {
    return NextResponse.json({ remainingCalls: MAX_CALLS_PER_DAY, locked: false });
  }

  const todayIst = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0]?.trim() || 'unknown-ip';
  const ua = req.headers.get('user-agent') || 'unknown-ua';
  const scannerHash = crypto
    .createHash('sha256')
    .update(`${ip}|${ua}|${deviceId}`)
    .digest('hex')
    .slice(0, 32);

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

  const used = Number(totalCalls);
  const remaining = Math.max(0, MAX_CALLS_PER_DAY - used);

  return NextResponse.json({
    usedCalls: used,
    remainingCalls: remaining,
    locked: remaining === 0,
  });
}