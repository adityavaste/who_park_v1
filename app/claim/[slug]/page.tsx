// app/claim/[slug]/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ClaimStickerContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [plateNumber, setPlateNumber] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/owner/vehicles', { credentials: 'include', cache: 'no-store' })
      .then((res) => {
        setIsLoggedIn(res.ok);
        setCheckingAuth(false);
      })
      .catch(() => {
        setIsLoggedIn(false);
        setCheckingAuth(false);
      });
  }, []);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/owner/claim-sticker', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagSlug: slug,
          plateNumber,
          makeModel,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not activate sticker.');
      }

      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[#FFFDF0] flex items-center justify-center p-4">
        <div className="bg-yellow-300 border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_#000] font-black">
          CHECKING STICKER...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFDF0] py-8 px-4 flex flex-col items-center justify-center text-black selection:bg-yellow-300">
      <div className="max-w-sm w-full bg-white border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_#000]">
        <div className="flex items-center justify-between mb-4">
          <span className="bg-yellow-400 border-2 border-black px-3 py-1 rounded-full text-[11px] font-black uppercase">
            🆕 New Sticker
          </span>
          <span className="font-mono font-black text-xs bg-neutral-100 border-2 border-black px-2.5 py-1 rounded-lg">
            ID: {slug}
          </span>
        </div>

        <h1 className="text-2xl font-black tracking-tight leading-tight">
          ACTIVATE YOUR WHO PARK STICKER
        </h1>
        <p className="text-xs font-bold text-stone-600 mt-1.5">
          Link your vehicle number to this QR tag so anyone can ring you privately without seeing your phone number.
        </p>

        {error && (
          <div className="mt-4 bg-rose-100 border-3 border-black text-rose-900 text-xs font-black p-3 rounded-2xl">
            💥 {error}
          </div>
        )}

        {!isLoggedIn ? (
          <div className="mt-6 space-y-3">
            <Link
              href={`/login?redirect=/claim/${slug}`}
              className="w-full block text-center bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 text-black font-black text-sm py-3.5 px-4 rounded-2xl border-3 border-black shadow-[4px_4px_0px_#000] transition"
            >
              Continue with Google to Activate →
            </Link>
            <p className="text-[11px] text-center font-bold text-stone-500">
              Takes 10 seconds • Free forever
            </p>
          </div>
        ) : (
          <form onSubmit={handleActivate} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-black uppercase mb-1">
                Vehicle Plate Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MH 12 AB 1234"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-3 rounded-2xl bg-yellow-50 border-3 border-black font-mono font-black text-base tracking-wider focus:outline-none focus:bg-yellow-100"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-1">
                Vehicle Model (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Tata Zest / Activa 6G"
                value={makeModel}
                onChange={(e) => setMakeModel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white border-3 border-black font-bold text-sm focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 text-black font-black text-sm py-3.5 px-4 rounded-2xl border-3 border-black shadow-[4px_4px_0px_#000] transition disabled:opacity-50"
            >
              {submitting ? 'Activating Sticker...' : '✅ Activate & Go to Garage'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ClaimStickerPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#FFFDF0] flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black p-6 rounded-3xl shadow-[5px_5px_0px_#000] font-black">
            LOADING STICKER...
          </div>
        </main>
      }
    >
      <ClaimStickerContent />
    </Suspense>
  );
}