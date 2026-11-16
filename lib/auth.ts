// lib/auth.ts
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';

const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET || 'honksafe-super-secret-jwt-key-2026'
);

const COOKIE_NAME = 'honksafe_session'; // Keep your existing cookie name if different

export async function createToken(
  payload: JWTPayload & { userId?: string; id?: string; phone?: string }
) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as { userId: string; phone: string };
  } catch {
    return null;
  }
}

export async function createSession(userId: string, phone: string) {
  const token = await createToken({ userId, phone });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}