import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey: Uint8Array = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'default-fallback-secret-key-32-characters!'
);

export async function createToken(userId: string, phone: string): Promise<string> {
  return await new SignJWT({ userId, phone })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as { userId: string; phone: string };
  } catch {
    return null;
  }
}