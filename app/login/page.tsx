// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { signInWithPopup } from 'firebase/auth';
import { webAuth, googleProvider } from '@/lib/firebaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [idToken, setIdToken] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [needsPhone, setNeedsPhone] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);

    try {
      let token = '';

      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        token = result.credential?.idToken || '';
        if (!token) {
          const tokenRes = await FirebaseAuthentication.getIdToken({ forceRefresh: true });
          token = tokenRes.token;
        }
      } else {
        const result = await signInWithPopup(webAuth, googleProvider);
        token = await result.user.getIdToken(true);
      }

      if (!token) {
        throw new Error('Could not obtain Google authentication token.');
      }

      setIdToken(token);
      await submitToBackend(token, '');
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In was cancelled or failed.');
      setLoading(false);
    }
  }

  async function handleCompleteSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      await submitToBackend(idToken, phone);
    } catch (err: any) {
      setError(err?.message || 'Registration failed.');
      setLoading(false);
    }
  }

  async function submitToBackend(token: string, phoneNumber: string) {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: token,
        phone: phoneNumber,
        fullName,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      setLoading(false);
      throw new Error(data.error || 'Authentication failed.');
    }

    if (data.needsPhone) {
      setEmail(data.email || '');
      setFullName(data.fullName || '');
      setNeedsPhone(true);
      setLoading(false);
      return;
    }

    if (typeof window !== 'undefined' && data.token) {
      localStorage.setItem('whopark_token', data.token);
    }

    router.replace('/dashboard');
  }

  return (
    <div className="min-h-screen bg-amber-50/40 flex flex-col items-center justify-center px-4 text-neutral-900">
      <div className="w-full max-w-sm bg-white border-2 border-neutral-900 rounded-3xl p-7 shadow-[6px_6px_0px_0px_#171717]">
        {/* Brand Badge */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-yellow-400 border-2 border-neutral-900 flex items-center justify-center font-black text-lg text-neutral-900">
            W
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-neutral-900 leading-none">
              WHO PARK
            </h1>
            <span className="text-xs font-medium text-neutral-500">
              Smart Vehicle Alert Sticker
            </span>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-neutral-900">
            {needsPhone ? 'Link your mobile' : 'Welcome'}
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            {needsPhone
              ? 'Add your 10-digit number so people can alert you when your vehicle is parked.'
              : 'Sign in with Google to manage your vehicle QR tags and instant alerts.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {!needsPhone ? (
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 border-2 border-neutral-900 text-neutral-900 font-bold text-sm flex items-center justify-center gap-3 shadow-[3px_3px_0px_0px_#171717] transition disabled:opacity-50"
          >
            <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
            </span>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>
        ) : (
          <form onSubmit={handleCompleteSignup} className="space-y-4">
            <div className="px-3 py-2 rounded-xl bg-yellow-100/80 border border-yellow-300 text-xs text-neutral-800 truncate">
              Account: <span className="font-bold">{email}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-neutral-300 focus:border-neutral-900 focus:outline-none text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Mobile Number
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-xl bg-yellow-400 border-2 border-r-0 border-neutral-900 text-neutral-900 font-bold text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full px-3.5 py-2.5 rounded-r-xl bg-white border-2 border-neutral-900 focus:outline-none text-sm font-bold tracking-wide"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 border-2 border-neutral-900 text-neutral-900 font-bold text-sm shadow-[3px_3px_0px_0px_#171717] transition disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Continue to Dashboard'}
            </button>

            <button
              type="button"
              onClick={() => {
                setNeedsPhone(false);
                setPhone('');
                setError('');
              }}
              className="w-full text-xs font-semibold text-neutral-500 hover:text-neutral-900"
            >
              Switch Google account
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-xs text-neutral-500">
        Your mobile number stays private when someone scans your QR.
      </p>
    </div>
  );
}