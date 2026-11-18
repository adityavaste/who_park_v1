// app/api/auth/google/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { createToken } from '@/lib/auth';

if (
  !getApps().length &&
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { idToken, phone, fullName } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Google token missing.' }, { status: 400 });
    }

    // 1. Cryptographically verify Google sign-in token via Firebase Admin
    const decoded = await getAuth().verifyIdToken(idToken);
    const email = decoded.email?.toLowerCase().trim();
    const googleName = fullName?.trim() || decoded.name || null;

    if (!email) {
      return NextResponse.json(
        { error: 'Unable to read email from Google account.' },
        { status: 400 }
      );
    }

    // 2. Check if this Google email already has an account
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // 3. First-time user flow
    if (!user) {
      const digits = (phone || '').replace(/\D/g, '');
      if (digits.length !== 10) {
        return NextResponse.json({
          success: true,
          needsPhone: true,
          email,
          fullName: googleName,
        });
      }

      const formattedPhone = `+91${digits}`;

      // 4. Enforce unique phone number: block if claimed by another Google email
      const [phoneOwner] = await db
        .select()
        .from(users)
        .where(or(eq(users.phone, formattedPhone), eq(users.phone, digits)))
        .limit(1);

      if (phoneOwner) {
        if (phoneOwner.email && phoneOwner.email.toLowerCase() !== email) {
          return NextResponse.json(
            { error: 'This mobile number is already registered with another Google account.' },
            { status: 409 }
          );
        }

        // Link Google email to legacy unverified account with this phone number
        [user] = await db
          .update(users)
          .set({
            email,
            phone: formattedPhone,
            fullName: phoneOwner.fullName || googleName,
          })
          .where(eq(users.id, phoneOwner.id))
          .returning();
      } else {
        // Create brand-new verified account
        [user] = await db
          .insert(users)
          .values({
            email,
            phone: formattedPhone,
            fullName: googleName,
          })
          .returning();
      }
    }

    // 5. Issue 400-day session_token cookie matching lib/auth.ts
    const sessionToken = await createToken(user.id, user.phone);

    const response = NextResponse.json({
      success: true,
      token: sessionToken,
      user: { id: user.id, email: user.email, phone: user.phone, fullName: user.fullName },
    });

    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 400 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('[GOOGLE AUTH ERROR]', error);
    if (error?.code === '23505') {
      return NextResponse.json(
        { error: 'This mobile number or email is already registered.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Google sign-in verification failed. Please try again.' },
      { status: 401 }
    );
  }
}