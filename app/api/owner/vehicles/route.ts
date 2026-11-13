import { NextResponse } from 'next/server';
import { db } from '@/db';
import { vehicles, qrTags, alertLogs, users } from '@/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

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
      alerts = await db
        .select({
          id: alertLogs.id,
          tagId: alertLogs.tagId,
          alertType: alertLogs.alertType,
          status: alertLogs.status,
          createdAt: alertLogs.createdAt,
        })
        .from(alertLogs)
        .where(inArray(alertLogs.tagId, tagIds))
        .orderBy(desc(alertLogs.createdAt))
        .limit(20);
    }

    return NextResponse.json({
      success: true,
      user: { phone: session.phone, fullName: user?.fullName || null },
      vehicles: userVehicles,
      alerts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}