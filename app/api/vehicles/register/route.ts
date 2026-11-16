import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { vehicles, qrTags } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
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

    const normalizedPlate = plateNumber.toUpperCase().replace(/\s+/g, '');

    const existing = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.plateNumber, normalizedPlate))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Vehicle plate is already registered.' }, { status: 409 });
    }

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
    return NextResponse.json({ error: error.message || 'Failed to register vehicle' }, { status: 500 });
  }
}