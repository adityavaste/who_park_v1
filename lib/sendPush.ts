// lib/sendPush.ts
import * as webpush from 'web-push';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webpush.setVapidDetails('mailto:support@whopark.in', publicKey, privateKey);
}

export async function sendPushToOwner(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  if (!publicKey || !privateKey) {
    console.error('[PUSH] Missing VAPID keys in environment variables');
    return { sent: 0, reason: 'MISSING_VAPID_KEYS' };
  }

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (!subs.length) {
    console.warn(`[PUSH] No push subscriptions found in DB for user ${userId}`);
    return { sent: 0, reason: 'NO_SUBSCRIPTIONS_IN_DB' };
  }

  let sentCount = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url || '/dashboard',
          }),
          {
            TTL: 3600,
            urgency: 'high',
          }
        );
        sentCount++;
      } catch (err: any) {
        console.error('[PUSH] Delivery failed:', err?.statusCode, err?.body || err?.message);
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, sub.id))
            .catch(() => {});
        }
      }
    })
  );

  return { sent: sentCount, totalSubs: subs.length };
}