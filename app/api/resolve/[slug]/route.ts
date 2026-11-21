// app/api/resolve/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { qrTags, vehicles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug || '').trim();

    if (!cleanSlug) {
      return NextResponse.json(
        { error: 'Invalid sticker code.' },
        { status: 400 }
      );
    }

    // 1. Query qrTags alone first so bulk unclaimed stickers (vehicleId = null) succeed
    const [tag] = await db
      .select()
      .from(qrTags)
      .where(eq(qrTags.publicSlug, cleanSlug))
      .limit(1);

    if (!tag || tag.isEnabled === false) {
      return NextResponse.json(
        { error: 'Sticker not found or currently disabled by owner.' },
        { status: 404 }
      );
    }

    // 2. Unclaimed bulk sticker -> triggers redirect to /claim/[slug]
    if (!tag.vehicleId) {
      return NextResponse.json({
        success: true,
        unclaimed: true,
        tagSlug: tag.publicSlug,
      });
    }

    // 3. Active sticker -> fetch linked vehicle
    const [vehicle] = await db
      .select({
        plateNumber: vehicles.plateNumber,
        makeModel: vehicles.makeModel,
      })
      .from(vehicles)
      .where(eq(vehicles.id, tag.vehicleId))
      .limit(1);

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Sticker not found or currently disabled by owner.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      unclaimed: false,
      vehicle,
    });
  } catch (err) {
    console.error('[RESOLVE TAG ERROR]', err);
    return NextResponse.json(
      { error: 'Failed to verify sticker. Please try again.' },
      { status: 500 }
    );
  }
}