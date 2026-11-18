// app/api/auth/google/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { createToken } from '@/lib/auth';

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
  )
);

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs')
);

async function verifyGoogleOrFirebaseToken(idToken: string) {
  const unverified = decodeJwt(idToken);
  const issuer = unverified.iss || '';

  if (issuer.startsWith('https://securetoken.google.com/')) {
    if (!FIREBASE_PROJECT_ID) {
      throw new Error('Server misconfigured: FIREBASE_PROJECT_ID missing.');
    }
    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    return payload as {
      sub: string;
      email?: string;
      name?: string;
      firebase?: { identities?: { email?: string[] } };
    };
  }

  if (issuer === 'https://accounts.google.com' || issuer === 'accounts.google.com') {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    });
    return payload as {
      sub: string;
      email?: string;
      name?: string;
      firebase?: { identities?: { email?: string[] } };
    };
  }

  throw new Error(`Unsupported token issuer: ${issuer}`);
}

export async function POST(req: NextRequest) {
  try {
    const { idToken, phone, fullName } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Google token missing.' }, { status: 400 });
    }

    // 1. Cryptographically verify either Firebase ID token or Google OAuth ID token
    const decoded = await verifyGoogleOrFirebaseToken(idToken);

    const rawEmail =
      decoded.email || decoded.firebase?.identities?.email?.[0];
    const email = rawEmail?.toLowerCase().trim();
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

    // 3. First-time email login flow
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
        [user] = await db
          .insert(users)
          .values({
            email,
            phone: formattedPhone,
            fullName: googleName,
          })
          .returning();
      }
    } else if (!user.email) {
      [user] = await db
        .update(users)
        .set({ email })
        .where(eq(users.id, user.id))
        .returning();
    }

    // 5. Issue 400-day session_token cookie
    const sessionToken = await createToken(user.id, user.phone);

    const response = NextResponse.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
      },
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
      { error: error?.message || 'Google sign-in verification failed.' },
      { status: 401 }
    );
  }
}