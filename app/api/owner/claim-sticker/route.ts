// src/app/api/owner/claim-sticker/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { qrTags, users, vehicles } from '@/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { getAllowedVehicleLimit } from '@/lib/plans';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  try {
    const { tagSlug, plateNumber, makeModel, emergencyContact } = await req.json();

    const cleanPlate = (plateNumber || '').toUpperCase().replace(/\s+/g, ' ').trim();
    if (!tagSlug || cleanPlate.length < 4) {
      return NextResponse.json(
        { error: 'Valid sticker ID and vehicle number are required.' },
        { status: 400 }
      );
    }

    // 1. Verify sticker exists and is still unclaimed
    const [tag] = await db
      .select()
      .from(qrTags)
      .where(and(eq(qrTags.publicSlug, tagSlug), isNull(qrTags.vehicleId)))
      .limit(1);

    if (!tag) {
      return NextResponse.json(
        { error: 'This sticker is invalid or has already been activated.' },
        { status: 409 }
      );
    }

    // 2. Check user's active plan & vehicle limit
    const [currentUser] = await db
      .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const maxAllowed = getAllowedVehicleLimit(currentUser || {});
    if (maxAllowed === 0) {
      return NextResponse.json(
        {
          error: 'Please activate a WHO PARK plan (starting at ₹199/year) before activating a sticker.',
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    // 3. Check if user already registered this plate number or create new vehicle
    let [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.plateNumber, cleanPlate))
      .limit(1);

    if (vehicle && vehicle.userId !== session.userId) {
      return NextResponse.json(
        { error: 'This vehicle number is already linked to another account.' },
        { status: 409 }
      );
    }

    if (!vehicle) {
      const existingVehicles = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(eq(vehicles.userId, session.userId));

      if (existingVehicles.length >= maxAllowed) {
        return NextResponse.json(
          {
            error: `Your current plan allows up to ${maxAllowed} vehicle(s). Upgrade your plan to add more!`,
            upgradeRequired: true,
          },
          { status: 403 }
        );
      }

      [vehicle] = await db
        .insert(vehicles)
        .values({
          userId: session.userId,
          plateNumber: cleanPlate,
          makeModel: makeModel?.trim() || null,
          emergencyContact: emergencyContact?.trim() || null,
        })
        .returning();
    }

    // 4. Link the pre-printed QR tag to this vehicle
    await db
      .update(qrTags)
      .set({
        vehicleId: vehicle.id,
        claimedAt: new Date(),
      })
      .where(eq(qrTags.id, tag.id));

    return NextResponse.json({
      success: true,
      vehicle,
      tagSlug,
    });
  } catch (err: any) {
    console.error('[CLAIM STICKER ERROR]', err);
    return NextResponse.json(
      { error: err?.message || 'Could not activate sticker.' },
      { status: 500 }
    );
  }
}