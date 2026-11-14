// src/app/api/qr/image/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { db } from '@/db';
import { qrTags } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const tag = await db.select().from(qrTags).where(eq(qrTags.publicSlug, slug)).limit(1);

    if (!tag.length) {
      return NextResponse.json({ error: 'QR Tag not found' }, { status: 404 });
    }

    // Automatically detect the live domain from the request headers
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');

    const baseUrl = host
      ? `${proto}://${host}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const qrBuffer = await QRCode.toBuffer(`${baseUrl}/v/${slug}`, {
      type: 'png',
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'H',
    });

    return new Response(qrBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}