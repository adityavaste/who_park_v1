// src/app/api/owner/vehicles/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { vehicles, qrTags, alertLogs, users } from '@/db/schema';
import { eq, desc, inArray, and, gte } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { getAllowedVehicleLimit, isPlanActive } from '@/lib/plans';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);

    const userVehicles = await db
      .select({
        id: vehicles.id,
        plateNumber: vehicles.plateNumber,
        makeModel: vehicles.makeModel,
        emergencyContact: vehicles.emergencyContact,
        tagSlug: qrTags.publicSlug,
        tagId: qrTags.id,
      })
      .from(vehicles)
      .innerJoin(qrTags, eq(vehicles.id, qrTags.vehicleId))
      .where(eq(vehicles.userId, session.userId));

    const tagIds = userVehicles.map((v) => v.tagId);
    let alerts: any[] = [];

    if (tagIds.length > 0) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      alerts = await db
        .select({
          id: alertLogs.id,
          tagId: alertLogs.tagId,
          alertType: alertLogs.alertType,
          status: alertLogs.status,
          ownerReply: alertLogs.ownerReply,
          createdAt: alertLogs.createdAt,
          plateNumber: vehicles.plateNumber,
        })
        .from(alertLogs)
        .innerJoin(qrTags, eq(alertLogs.tagId, qrTags.id))
        .innerJoin(vehicles, eq(qrTags.vehicleId, vehicles.id))
        .where(
          and(
            inArray(alertLogs.tagId, tagIds),
            gte(alertLogs.createdAt, twentyFourHoursAgo)
          )
        )
        .orderBy(desc(alertLogs.createdAt))
        .limit(20);
    }

    const activePlan = isPlanActive(user || {});
    const maxVehicles = getAllowedVehicleLimit(user || {});

    const response = NextResponse.json({
      success: true,
      user: {
        phone: session.phone,
        fullName: user?.fullName || null,
        plan: user?.plan || 'NONE',
        planExpiresAt: user?.planExpiresAt || null,
        isPlanActive: activePlan,
        maxVehicles,
      },
      vehicles: userVehicles,
      alerts,
    });

    // Sliding 400-day cookie renewal
    const cookieStore = await cookies();
    const existingToken = cookieStore.get('whopark_session')?.value;
    if (existingToken) {
      const FOUR_HUNDRED_DAYS = 400 * 24 * 60 * 60;
      response.cookies.set('whopark_session', existingToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: FOUR_HUNDRED_DAYS,
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}