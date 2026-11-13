// src/app/v/[slug]/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type VehicleData = {
  plateNumber: string;
  makeModel: string | null;
};

function ScannerContent() {
  const params = useParams();
  const slug = params?.slug as string;

  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState('');

  useEffect(() => {
    if (!slug) return;

    async function fetchVehicle() {
      try {
        const res = await fetch(`/api/resolve/${slug}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Sticker not found!');
        }
        const data = await res.json();
        setVehicle(data.vehicle);
      } catch (err: any) {
        setError(err.message || 'Could not load car details.');
      } finally {
        setLoading(false);
      }
    }

    fetchVehicle();
  }, [slug]);

  async function handleSendAlert(alertType: string, label: string) {
    setSending(true);
    setAlertSuccess(null);
    setError(null);

    try {
      const res = await fetch('/api/alerts/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, alertType }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Could not send alert.');
      }

      setAlertSuccess(`BEEP BEEP! "${label}" alert delivered to the driver!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFFDF0] flex items-center justify-center p-4">
        <div className="bg-yellow-300 border-4 border-black p-8 rounded-3xl shadow-[6px_6px_0px_#000] text-center max-w-xs w-full animate-bounce">
          <div className="text-5xl mb-3">🚕💨</div>
          <p className="font-black text-xl text-black uppercase tracking-wider">Finding Car...</p>
        </div>
      </main>
    );
  }

  if (error && !vehicle) {
    return (
      <main className="min-h-screen bg-[#FFFDF0] flex flex-col items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_#000] text-center">
          <div className="text-5xl mb-2">💥</div>
          <h2 className="text-2xl font-black text-black">STICKER ERROR!</h2>
          <p className="text-black font-bold text-sm mt-3 bg-yellow-200 border-2 border-black p-3 rounded-2xl">
            {error}
          </p>
          <Link
            href="/"
            className="mt-5 inline-block bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs px-5 py-3 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#000]"
          >
            ← GO BACK HOME
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFDF0] py-6 px-4 flex flex-col justify-between max-w-md mx-auto selection:bg-yellow-300">
      <div>
        {/* Top Mini Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="bg-white hover:bg-yellow-100 text-black font-black text-xs px-3 py-1.5 rounded-xl border-3 border-black shadow-[2px_2px_0px_#000]"
          >
            🚕 HONKSAFE
          </Link>
          <span className="bg-yellow-300 text-black border-2 border-black text-[11px] font-black px-3 py-1 rounded-full uppercase">
            🔒 100% Private
          </span>
        </div>

        {/* Hero Heading */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-black tracking-tight leading-none">
            CONTACT DRIVER
          </h1>
          <p className="text-xs font-bold text-stone-600 mt-1.5">
            Tap a reason below to alert the owner instantly!
          </p>
        </div>

        {/* Cartoon License Plate Card */}
        <div className="bg-white rounded-3xl border-4 border-black p-6 shadow-[8px_8px_0px_#000] mb-6 text-center relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-yellow-400 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest">
            VERIFIED VEHICLE
          </div>

          <div className="text-3xl sm:text-4xl font-black text-black tracking-widest mt-2 font-mono bg-yellow-300 py-3 px-4 rounded-2xl border-3 border-black shadow-[4px_4px_0px_#000]">
            {vehicle?.plateNumber}
          </div>

          {vehicle?.makeModel && (
            <div className="text-sm font-black text-stone-700 mt-3 uppercase tracking-wide">
              🚘 {vehicle.makeModel}
            </div>
          )}
        </div>

        {/* Success / Error Speech Bubbles */}
        {alertSuccess && (
          <div className="bg-white border-4 border-black text-black p-4 rounded-2xl text-sm font-black mb-5 shadow-[5px_5px_0px_#16a34a] flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>{alertSuccess}</div>
          </div>
        )}

        {error && (
          <div className="bg-white border-4 border-black text-black p-4 rounded-2xl text-sm font-black mb-5 shadow-[5px_5px_0px_#dc2626] flex items-center gap-3">
            <span className="text-3xl">💥</span>
            <div>{error}</div>
          </div>
        )}

        {/* Quick Action Alert Buttons */}
        <div className="space-y-3.5">
          <button
            onClick={() => handleSendAlert('OBSTRUCTION', 'Car is blocking my way')}
            disabled={sending}
            className="w-full bg-yellow-400 hover:bg-yellow-300 active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-black text-sm sm:text-base py-4 px-5 rounded-2xl border-4 border-black shadow-[5px_5px_0px_#000] transition-all flex items-center justify-between disabled:opacity-50"
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl">🚗</span>
              <span>CAR IS BLOCKING ME</span>
            </span>
            <span className="text-lg">➔</span>
          </button>

          <button
            onClick={() => handleSendAlert('HEADLIGHTS', 'Lights or windows open')}
            disabled={sending}
            className="w-full bg-white hover:bg-yellow-50 active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-black text-sm sm:text-base py-4 px-5 rounded-2xl border-4 border-black shadow-[5px_5px_0px_#000] transition-all flex items-center justify-between disabled:opacity-50"
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <span>LIGHTS / WINDOW OPEN</span>
            </span>
            <span className="text-lg">➔</span>
          </button>

          <button
            onClick={() => handleSendAlert('EMERGENCY', 'Tow / Urgent Emergency')}
            disabled={sending}
            className="w-full bg-yellow-200 hover:bg-yellow-300 active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-black text-sm sm:text-base py-4 px-5 rounded-2xl border-4 border-black shadow-[5px_5px_0px_#000] transition-all flex items-center justify-between disabled:opacity-50"
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <span>TOW / POLICE EMERGENCY</span>
            </span>
            <span className="text-lg">➔</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center font-bold text-xs text-stone-500 mt-8">
        🛡️ Phone numbers remain completely hidden for both parties.
      </footer>
    </main>
  );
}

export default function ScannerPage() {
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
      <ScannerContent />
    </Suspense>
  );
}