// src/app/api/admin/bulk-qr/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import { db } from '@/db';
import { qrTags } from '@/db/schema';
import { desc, isNotNull, sql } from 'drizzle-orm';
import crypto from 'crypto';

function generateSlug() {
  return crypto.randomBytes(4).toString('hex'); // 8-char unique slug e.g. "a9f3c1d2"
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Group bulk batches with claimed vs unclaimed counts
  const batches = await db
    .select({
      batchName: qrTags.batchName,
      total: sql<number>`count(*)::int`,
      claimed: sql<number>`count(${qrTags.vehicleId})::int`,
      createdAt: sql<string>`max(${qrTags.createdAt})`,
    })
    .from(qrTags)
    .where(isNotNull(qrTags.batchName))
    .groupBy(qrTags.batchName)
    .orderBy(desc(sql`max(${qrTags.createdAt})`));

  return NextResponse.json({ success: true, batches });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { batchName, quantity } = await req.json();
    const count = Math.min(Math.max(Number(quantity) || 10, 1), 200);
    const cleanBatch = (batchName || `Batch-${Date.now()}`).trim();

    const rows = Array.from({ length: count }).map(() => ({
      vehicleId: null,
      publicSlug: generateSlug(),
      batchName: cleanBatch,
      isEnabled: true,
    }));

    const inserted = await db.insert(qrTags).values(rows).returning({
      id: qrTags.id,
      publicSlug: qrTags.publicSlug,
      batchName: qrTags.batchName,
    });

    return NextResponse.json({
      success: true,
      batchName: cleanBatch,
      tags: inserted,
    });
  } catch (err: any) {
    console.error('[BULK QR ERROR]', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate bulk QR codes.' },
      { status: 500 }
    );
  }
}