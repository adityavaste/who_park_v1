// app/api/calls/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { callSessions } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET: Scanner or Owner polls call status & SDP answer
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [call] = await db
      .select({
        id: callSessions.id,
        status: callSessions.status,
        answerSdp: callSessions.answerSdp,
      })
      .from(callSessions)
      .where(eq(callSessions.id, id))
      .limit(1);

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        status: call.status,
        answerSdp: call.answerSdp ? JSON.parse(call.answerSdp) : null,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Owner answers (saves answerSdp + CONNECTED) or either side ends call (ENDED)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status, answerSdp } = await req.json();

    const updatePayload: Record<string, any> = {};
    if (status) updatePayload.status = status;
    if (answerSdp) updatePayload.answerSdp = JSON.stringify(answerSdp);

    await db
      .update(callSessions)
      .set(updatePayload)
      .where(eq(callSessions.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}