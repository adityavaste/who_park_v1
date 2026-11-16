// src/app/api/resolve/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { qrTags, vehicles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const result = await db
      .select({
        tagId: qrTags.id,
        isEnabled: qrTags.isEnabled,
        plateNumber: vehicles.plateNumber,
        makeModel: vehicles.makeModel,
      })
      .from(qrTags)
      .innerJoin(vehicles, eq(qrTags.vehicleId, vehicles.id))
      .where(eq(qrTags.publicSlug, slug))
      .limit(1);

    if (!result.length || !result[0].isEnabled) {
      return NextResponse.json(
        { error: 'Sticker not found or currently disabled by owner.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle: {
        plateNumber: result[0].plateNumber,
        makeModel: result[0].makeModel,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to look up vehicle.' },
      { status: 500 }
    );
  }
}