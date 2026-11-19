// src/app/api/admin/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    const { adminId, password } = await req.json();

    const validId = process.env.ADMIN_ID;
    const validPassword = process.env.ADMIN_PASSWORD;

    if (!validId || !validPassword) {
      return NextResponse.json(
        { error: 'Admin credentials not configured on server.' },
        { status: 500 }
      );
    }

    if (adminId !== validId || password !== validPassword) {
      return NextResponse.json(
        { error: 'Invalid Admin ID or Password.' },
        { status: 401 }
      );
    }

    const token = await createAdminToken(adminId);
    const response = NextResponse.json({ success: true });

    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Login failed.' }, { status: 400 });
  }
}