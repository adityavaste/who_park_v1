// src/app/page.tsx
'use client';

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QrScannerModal from '@/components/QrScannerModal';

export default async function HomePage() {
  const router = useRouter();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [tagCode, setTagCode] = useState('');
  const session = await getSession();
  if (session) {
    redirect('/dashboard');
  }

  function handleGoToVehicle(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = tagCode.trim();
    if (!cleanCode) return;

    const slug = cleanCode.includes('/v/')
      ? cleanCode.split('/v/')[1].split('/')[0]
      : cleanCode;

    router.push(`/v/${slug}`);
  }

  return (
    <main className="min-h-screen bg-[#FFFDF2] text-neutral-950 flex flex-col justify-between px-4 py-5 sm:px-8 sm:py-7 selection:bg-yellow-300">
      {/* Minimal Top Bar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between bg-white border-2 border-neutral-950 px-4 py-3 rounded-2xl shadow-[4px_4px_0px_#0a0a0a]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-yellow-400 border-2 border-neutral-950 flex items-center justify-center font-black text-base">
            W
          </div>
          <span className="font-black text-lg sm:text-xl tracking-tight">
            WHO<span className="text-yellow-500">PARK</span>
          </span>
        </div>

        <Link
          href="/login"
          className="bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 text-neutral-950 font-bold text-xs sm:text-sm px-4 py-2 rounded-xl border-2 border-neutral-950 shadow-[2px_2px_0px_#0a0a0a] transition"
        >
          Owner Login
        </Link>
      </header>

      {/* Main Content */}
      <section className="max-w-4xl w-full mx-auto my-10">
        {/* Clean Hero + Interactive Sticker Preview */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 bg-yellow-200/80 border border-neutral-950 px-3 py-1 rounded-full text-xs font-bold tracking-wide mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Private QR Alerts • Zero Phone Number Exposure
          </span>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08]">
            Blocked by a parked car?{' '}
            <span className="bg-yellow-400 px-2.5 py-0.5 rounded-xl border-2 border-neutral-950 inline-block">
              Alert in 5s.
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-neutral-600 font-medium max-w-lg mx-auto">
            Scan the WHO PARK windshield sticker to ring the owner instantly—no phone numbers shared on either side.
          </p>
        </div>

        {/* Two Simple, Focused Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-10">
          {/* Card 1: Public Scanner */}
          <div className="bg-yellow-400 border-2 border-neutral-950 rounded-3xl p-6 sm:p-7 shadow-[6px_6px_0px_#0a0a0a] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-12 h-12 bg-white border-2 border-neutral-950 rounded-2xl flex items-center justify-center text-2xl shadow-[3px_3px_0px_#0a0a0a]">
                  📷
                </span>
                <span className="bg-white border border-neutral-950 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  Scan & Ping
                </span>
              </div>

              <h2 className="text-2xl font-black tracking-tight">
                Scan Car QR
              </h2>
              <p className="text-sm text-neutral-900/80 font-medium mt-1.5 leading-relaxed">
                Car blocking your exit or headlights left on? Scan the sticker to send an instant ring or private call.
              </p>
            </div>

            <div className="mt-6 space-y-2.5">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="w-full bg-white hover:bg-neutral-50 active:translate-y-0.5 text-neutral-950 font-black text-sm sm:text-base py-3.5 px-5 rounded-2xl border-2 border-neutral-950 shadow-[4px_4px_0px_#0a0a0a] transition flex items-center justify-between"
              >
                <span>Open QR Scanner</span>
                <span className="text-lg">→</span>
              </button>

              {!showCodeInput ? (
                <button
                  onClick={() => setShowCodeInput(true)}
                  className="w-full text-center text-xs font-bold text-neutral-900/80 hover:text-neutral-950 underline pt-1"
                >
                  Enter sticker code manually
                </button>
              ) : (
                <form onSubmit={handleGoToVehicle} className="pt-1 flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. a9b2c3d4"
                    value={tagCode}
                    onChange={(e) => setTagCode(e.target.value)}
                    className="flex-1 bg-white border-2 border-neutral-950 rounded-xl px-3.5 py-2 text-sm font-bold font-mono focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-neutral-950 text-yellow-400 font-bold text-xs px-4 py-2 rounded-xl hover:bg-neutral-800 transition"
                  >
                    Go
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Card 2: Vehicle Owner */}
          <div className="bg-white border-2 border-neutral-950 rounded-3xl p-6 sm:p-7 shadow-[6px_6px_0px_#0a0a0a] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-12 h-12 bg-yellow-300 border-2 border-neutral-950 rounded-2xl flex items-center justify-center text-2xl shadow-[3px_3px_0px_#0a0a0a]">
                  🚘
                </span>
                <span className="bg-yellow-100 border border-neutral-950 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  Vehicle Owners
                </span>
              </div>

              <h2 className="text-2xl font-black tracking-tight">
                My Garage & Sticker
              </h2>
              <p className="text-sm text-neutral-600 font-medium mt-1.5 leading-relaxed">
                Generate your free windshield QR sticker, receive loud instant alerts, and reply with one tap.
              </p>
            </div>

            <div className="mt-6 space-y-2.5">
              <Link
                href="/login"
                className="w-full bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 text-neutral-950 font-black text-sm sm:text-base py-3.5 px-5 rounded-2xl border-2 border-neutral-950 shadow-[4px_4px_0px_#0a0a0a] transition flex items-center justify-between"
              >
                <span>Open Owner Dashboard</span>
                <span className="text-lg">→</span>
              </Link>

              <p className="text-center text-xs font-medium text-neutral-500 pt-1">
                1-tap Google Sign-In • Free forever
              </p>
            </div>
          </div>
        </div>

        {/* Simple 3-Step Strip */}
        <div className="mt-8 bg-white border-2 border-neutral-950 rounded-2xl p-4 sm:px-6 shadow-[4px_4px_0px_#0a0a0a] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-yellow-400 border border-neutral-950 font-black flex items-center justify-center shrink-0">
              1
            </span>
            <span className="font-bold text-neutral-800">Stick QR on windshield</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-yellow-400 border border-neutral-950 font-black flex items-center justify-center shrink-0">
              2
            </span>
            <span className="font-bold text-neutral-800">Anyone scans in 5 seconds</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-yellow-400 border border-neutral-950 font-black flex items-center justify-center shrink-0">
              3
            </span>
            <span className="font-bold text-neutral-800">Your phone rings privately</span>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
     {/* Clean Footer */}
      <footer className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500 font-medium pt-4">
        <span>© 2026 WHO PARK • Privacy-First Vehicle Alerts</span>
        <Link
          href="/parking-solutions"
          className="font-bold text-neutral-800 hover:text-black underline"
        >
          Parking Solutions & FAQ
        </Link>
      </footer>

      {/* Live Camera QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </main>
  );
}