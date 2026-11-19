// src/app/admin/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Access denied.');
      }

      router.replace('/admin');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 flex items-center justify-center px-4 text-neutral-950">
      <div className="w-full max-w-sm bg-white border-4 border-yellow-400 rounded-3xl p-7 shadow-[6px_6px_0px_#FACC15]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-yellow-400 border-2 border-neutral-950 flex items-center justify-center font-black text-lg">
            🛡️
          </div>
          <div>
            <h1 className="text-xl font-black leading-none">WHO PARK ADMIN</h1>
            <span className="text-xs font-bold text-neutral-500">
              Restricted Control Panel
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase mb-1">
              Admin ID
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              placeholder="Enter Admin ID"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-neutral-950 text-sm font-bold focus:outline-none focus:bg-yellow-50"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase mb-1">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-neutral-950 text-sm font-bold focus:outline-none focus:bg-yellow-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 border-2 border-neutral-950 font-black text-sm shadow-[4px_4px_0px_#0a0a0a] transition disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Unlock Admin Dashboard →'}
          </button>
        </form>
      </div>
    </main>
  );
}