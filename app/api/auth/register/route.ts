import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { phone, password, fullName } = await req.json();
    if (!phone || phone.trim().length < 10) {
      return NextResponse.json({ error: 'Valid phone number is required.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\s+/g, '');
    const [existing] = await db.select().from(users).where(eq(users.phone, cleanPhone)).limit(1);
    if (existing) {
      return NextResponse.json({ error: 'Phone number already registered. Please log in.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [newUser] = await db
      .insert(users)
      .values({ phone: cleanPhone, fullName: fullName || null, password: hashedPassword })
      .returning();

    const token = await createToken(newUser.id, newUser.phone);
    const response = NextResponse.json({ success: true });
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}