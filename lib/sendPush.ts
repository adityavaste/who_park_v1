// lib/sendPush.ts
import * as webpush from 'web-push';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Initialize Web Push (Browser fallback)
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webpush.setVapidDetails('mailto:support@whopark.in', publicKey, privateKey);
}

// Initialize Firebase Admin (Native Android FCM)
if (
  !getApps().length &&
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

export async function sendPushToOwner(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (!subs.length) {
    console.warn(`[PUSH] No subscriptions found for user ${userId}`);
    return { sent: 0, reason: 'NO_SUBSCRIPTIONS_IN_DB' };
  }

  let sentCount = 0;

  await Promise.all(
    subs.map(async (sub) => {
      // A. Native Android App via Firebase Cloud Messaging (FCM)
      if (sub.endpoint.startsWith('fcm://')) {
        const token = sub.endpoint.replace('fcm://', '');
        try {
          if (!getApps().length) {
            console.error('[FCM] Firebase Admin not initialized — check FIREBASE_* env vars');
            return;
          }

          await getMessaging().send({
            token,
            data: {
              title: payload.title,
              body: payload.body,
              url: payload.url || '/dashboard',
            },
            android: {
              priority: 'high',
              ttl: 3600 * 1000,
            },
          });
          sentCount++;
        } catch (err: any) {
          console.error('[FCM] Delivery error:', err?.code, err?.message);
          if (
            err?.code === 'messaging/registration-token-not-registered' ||
            err?.code === 'messaging/invalid-registration-token'
          ) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id)).catch(() => {});
          }
        }
        return;
      }

      // B. Standard Web Push (Browser PWA fallback)
      if (!publicKey || !privateKey) return;

      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url || '/dashboard',
          }),
          { TTL: 3600, urgency: 'high' }
        );
        sentCount++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id)).catch(() => {});
        }
      }
    })
  );

  return { sent: sentCount, totalSubs: subs.length };
}