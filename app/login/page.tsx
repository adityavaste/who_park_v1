'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CartoonLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = mode === 'LOGIN' ? '/api/auth/login' : '/api/auth/register';
    const payload = mode === 'LOGIN' ? { phone, password } : { phone, password, fullName };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFFDF0] flex flex-col justify-between p-4 sm:p-8 selection:bg-yellow-300">
      {/* Top Bar */}
      <div className="max-w-md w-full mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-white hover:bg-yellow-100 text-black font-black text-xs px-4 py-2 rounded-xl border-3 border-black shadow-[3px_3px_0px_#000] transition"
        >
          ← BACK HOME
        </Link>
      </div>

      {/* Main Cartoon Card */}
      <div className="max-w-md w-full mx-auto my-8 bg-white p-6 sm:p-8 rounded-3xl border-4 border-black shadow-[8px_8px_0px_#000]">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-yellow-400 border-3 border-black rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-[4px_4px_0px_#000] -rotate-3">
            🔑
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black mt-4 tracking-tight">
            {mode === 'LOGIN' ? 'DRIVER LOGIN' : 'JOIN THE GARAGE'}
          </h1>
          <p className="text-xs font-bold text-stone-600 mt-1">
            {mode === 'LOGIN'
              ? 'Enter your credentials to check your vehicles'
              : 'Create an account to stamp your car QR sticker'}
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex bg-yellow-100 p-1.5 rounded-2xl border-3 border-black mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition ${
              mode === 'LOGIN'
                ? 'bg-yellow-400 text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'text-stone-600 hover:text-black'
            }`}
          >
            LOG IN
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition ${
              mode === 'REGISTER'
                ? 'bg-yellow-400 text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'text-stone-600 hover:text-black'
            }`}
          >
            SIGN UP
          </button>
        </div>

        {error && (
          <div className="bg-rose-100 border-3 border-black text-black text-xs font-black p-3.5 rounded-2xl mb-5 shadow-[3px_3px_0px_#000] flex items-center gap-2">
            <span>💥</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'REGISTER' && (
            <div>
              <label className="block text-xs font-black text-black uppercase mb-1">
                Driver Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Aditya Vaste"
                className="w-full bg-white border-3 border-black rounded-2xl px-4 py-3 text-sm font-bold shadow-[3px_3px_0px_#000] focus:outline-none focus:bg-yellow-50"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-black uppercase mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full bg-white border-3 border-black rounded-2xl px-4 py-3 text-sm font-black font-mono shadow-[3px_3px_0px_#000] focus:outline-none focus:bg-yellow-50"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-black uppercase mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white border-3 border-black rounded-2xl px-4 py-3 text-sm font-bold shadow-[3px_3px_0px_#000] focus:outline-none focus:bg-yellow-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-300 active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-black py-4 rounded-2xl border-4 border-black shadow-[5px_5px_0px_#000] text-sm transition-all disabled:opacity-50 mt-2"
          >
            {loading
              ? 'REV-ING UP...'
              : mode === 'LOGIN'
              ? 'ENTER GARAGE ➔'
              : 'CREATE ACCOUNT & ENTER ➔'}
          </button>
        </form>
      </div>

      <div />
    </main>
  );
}