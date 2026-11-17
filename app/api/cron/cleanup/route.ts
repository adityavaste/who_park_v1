import { NextResponse } from 'next/server';
import { purgeExpiredRecords } from '@/lib/cleanupDb';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await purgeExpiredRecords();
  return NextResponse.json({ success: true, cleanedAt: new Date().toISOString() });
}