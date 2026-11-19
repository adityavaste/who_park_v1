// src/lib/adminAuth.ts
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'default-fallback-secret-key-32-characters!'
);

export async function createAdminToken(adminId: string) {
  return await new SignJWT({ adminId, role: 'superadmin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
}

export async function getAdminSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, secretKey);
    if (payload.role !== 'superadmin') return null;

    return payload as { adminId: string; role: 'superadmin' };
  } catch {
    return null;
  }
}