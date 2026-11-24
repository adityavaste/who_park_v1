// src/app/api/vehicles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { vehicles, qrTags, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { getAllowedVehicleLimit } from '@/lib/plans';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plateNumber, makeModel, emergencyContact } = await req.json();
    if (!plateNumber) {
      return NextResponse.json({ error: 'License plate number is required.' }, { status: 400 });
    }

    // 1. Verify user has an active paid plan & hasn't exceeded their vehicle limit (1 / 3 / 30)
    const [currentUser] = await db
      .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const maxAllowed = getAllowedVehicleLimit(currentUser || {});
    if (maxAllowed === 0) {
      return NextResponse.json(
        {
          error: 'Please activate a WHO PARK plan (starting at ₹199/year) to register your vehicle.',
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    const userVehicles = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.userId, session.userId));

    if (userVehicles.length >= maxAllowed) {
      return NextResponse.json(
        {
          error: `Your current plan allows up to ${maxAllowed} vehicle(s). Upgrade your plan to add more!`,
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    // 2. Check duplicate plate number across platform
    const normalizedPlate = plateNumber.toUpperCase().replace(/\s+/g, '');

    const existing = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.plateNumber, normalizedPlate))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Vehicle plate is already registered.' }, { status: 409 });
    }

    // 3. Create vehicle & generate unique QR tag
    const [newVehicle] = await db
      .insert(vehicles)
      .values({
        userId: session.userId,
        plateNumber: normalizedPlate,
        makeModel: makeModel || null,
        emergencyContact: emergencyContact || null,
      })
      .returning();

    const publicSlug = crypto.randomBytes(4).toString('hex');

    await db.insert(qrTags).values({
      vehicleId: newVehicle.id,
      publicSlug,
      isEnabled: true,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to register vehicle' },
      { status: 500 }
    );
  }
}