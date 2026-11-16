// src/app/api/auth/google/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth';
import { adminAuth } from '@/lib/firebaseAdmin';

function formatIndianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (raw.trim().startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+91${digits}`;
}

export async function POST(req: NextRequest) {
  try {
    const { firebaseIdToken, phone, fullName } = await req.json();

    if (!firebaseIdToken) {
      return NextResponse.json(
        { error: 'Google sign-in token is required.' },
        { status: 400 }
      );
    }

    // 1. Verify Google token cryptographically via Firebase Admin
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(firebaseIdToken);
    } catch {
      return NextResponse.json(
        { error: 'Google sign-in expired or invalid. Please try again.' },
        { status: 401 }
      );
    }

    const googleName = decodedToken.name || fullName || null;

    // 2. If phone number is not provided yet, ask the client for it (new user step)
    if (!phone) {
      return NextResponse.json({
        success: true,
        needsPhone: true,
        googleName,
        googleEmail: decodedToken.email || null,
      });
    }

    const formattedPhone = formatIndianPhone(phone);
    if (formattedPhone.length < 12) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit Indian mobile number.' },
        { status: 400 }
      );
    }

    // 3. Check if a user with this phone already exists in Neon DB
    let [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.phone, formattedPhone))
      .limit(1);

    if (!existingUser) {
      // Create a secure random password placeholder since they authenticate via Google
      const randomSecret = crypto.randomBytes(24).toString('hex');
      const hashedPassword = await bcrypt.hash(randomSecret, 10);

      const [created] = await db
        .insert(users)
        .values({
          phone: formattedPhone,
          fullName: googleName?.trim() || null,
          password: hashedPassword,
        })
        .returning();

      existingUser = created;
    }

    // 4. Create session cookie & log user into dashboard
    await createSession(existingUser.id, existingUser.phone);

    return NextResponse.json({
      success: true,
      needsPhone: false,
      user: {
        id: existingUser.id,
        phone: existingUser.phone,
        fullName: existingUser.fullName,
      },
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: error.message || 'Authentication failed.' },
      { status: 500 }
    );
  }
}