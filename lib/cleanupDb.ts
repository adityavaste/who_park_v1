// src/lib/cleanupDb.ts
import { db } from '@/db';
import { alertLogs, callSessions } from '@/db/schema';
import { lt } from 'drizzle-orm';

export async function purgeExpiredRecords() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  await Promise.all([
    db.delete(alertLogs).where(lt(alertLogs.createdAt, oneDayAgo)),
    db.delete(callSessions).where(lt(callSessions.createdAt, oneHourAgo)),
  ]);
}