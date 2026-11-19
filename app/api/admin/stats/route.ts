// src/app/api/admin/stats/route.ts
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/adminAuth';
import { db } from '@/db';
import { users, vehicles, qrTags, alertLogs } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [userCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    const [vehicleCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(vehicles);

    const [qrCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(qrTags);

    const [alertCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(alertLogs);

    const recentUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(50);

    const recentVehicles = await db
      .select({
        id: vehicles.id,
        plateNumber: vehicles.plateNumber,
        makeModel: vehicles.makeModel,
        qrDownloads: vehicles.qrDownloads,
        createdAt: vehicles.createdAt,
        tagSlug: qrTags.publicSlug,
      })
      .from(vehicles)
      .leftJoin(qrTags, eq(qrTags.vehicleId, vehicles.id))
      .orderBy(desc(vehicles.createdAt))
      .limit(50);

    const recentAlerts = await db
      .select({
        id: alertLogs.id,
        alertType: alertLogs.alertType,
        status: alertLogs.status,
        ownerReply: alertLogs.ownerReply,
        createdAt: alertLogs.createdAt,
        tagSlug: qrTags.publicSlug,
        plateNumber: vehicles.plateNumber,
      })
      .from(alertLogs)
      .leftJoin(qrTags, eq(qrTags.id, alertLogs.tagId))
      .leftJoin(vehicles, eq(vehicles.id, qrTags.vehicleId))
      .orderBy(desc(alertLogs.createdAt))
      .limit(20);

    const totalQrDownloaded = recentVehicles.reduce(
      (sum, v) => sum + (Number(v.qrDownloads) || 0),
      0
    );

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: userCountRes?.count || 0,
        totalVehicles: vehicleCountRes?.count || 0,
        totalQrCreated: qrCountRes?.count || 0,
        totalQrDownloaded,
        totalAlerts: alertCountRes?.count || 0,
      },
      recentUsers,
      recentVehicles,
      recentAlerts,
    });
  } catch (err: any) {
    console.error('[ADMIN STATS ERROR]', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to load admin analytics.' },
      { status: 500 }
    );
  }
}