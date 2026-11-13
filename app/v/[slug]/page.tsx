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

  // Cooldown & daily limit states
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [dailyBlocked, setDailyBlocked] = useState<boolean>(false);
  const [remainingToday, setRemainingToday] = useState<number | null>(null);

  // Restore any active cooldown from localStorage on page reload
  useEffect(() => {
    if (!slug) return;
    const savedUntil = localStorage.getItem(`honksafe_cooldown_${slug}`);
    if (savedUntil) {
      const diff = Math.ceil((Number(savedUntil) - Date.now()) / 1000);
      if (diff > 0) {
        setCooldownSeconds(diff);
      } else {
        localStorage.removeItem(`honksafe_cooldown_${slug}`);
      }
    }
  }, [slug]);

  // Live 1-second countdown ticker
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          localStorage.removeItem(`honksafe_cooldown_${slug}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds, slug]);

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
    if (cooldownSeconds > 0 || dailyBlocked) return;

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
        if (data.retryAfterSeconds) {
          setCooldownSeconds(data.retryAfterSeconds);
          localStorage.setItem(
            `honksafe_cooldown_${slug}`,
            String(Date.now() + data.retryAfterSeconds * 1000)
          );
        }
        if (data.dailyLimitReached) {
          setDailyBlocked(true);
        }
        throw new Error(data.error || 'Could not send alert.');
      }

      const waitSecs = data.cooldownSeconds || 300;
      setCooldownSeconds(waitSecs);
      localStorage.setItem(
        `honksafe_cooldown_${slug}`,
        String(Date.now() + waitSecs * 1000)
      );

      if (typeof data.remainingDailyPings === 'number') {
        setRemainingToday(data.remainingDailyPings);
      }

      setAlertSuccess(`BEEP BEEP! "${label}" alert delivered to the driver!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function formatCountdown(totalSecs: number) {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  const isLocked = sending || cooldownSeconds > 0 || dailyBlocked;

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

        {/* Cooldown Timer Banner */}
        {cooldownSeconds > 0 && !dailyBlocked && (
          <div className="bg-yellow-300 border-4 border-black text-black p-4 rounded-2xl mb-5 shadow-[5px_5px_0px_#000] text-center">
            <p className="text-xs font-black uppercase tracking-wider">
              ⏳ Anti-Spam Cooldown Active
            </p>
            <p className="text-2xl font-black font-mono mt-1">
              {formatCountdown(cooldownSeconds)}
            </p>
            <p className="text-[11px] font-bold text-stone-800 mt-1">
              You can send another alert after the timer ends.
              {remainingToday !== null && ` (${remainingToday}/10 pings left today)`}
            </p>
          </div>
        )}

        {/* Daily Limit Banner */}
        {dailyBlocked && (
          <div className="bg-rose-200 border-4 border-black text-black p-4 rounded-2xl mb-5 shadow-[5px_5px_0px_#000] text-center">
            <p className="text-sm font-black uppercase">🚫 Daily Limit Reached (10/10)</p>
            <p className="text-xs font-bold mt-1">
              You have reached the maximum 10 alerts allowed per 24 hours.
            </p>
          </div>
        )}

        {/* Success / Error Speech Bubbles */}
        {alertSuccess && (
          <div className="bg-white border-4 border-black text-black p-4 rounded-2xl text-sm font-black mb-5 shadow-[5px_5px_0px_#16a34a] flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>{alertSuccess}</div>
          </div>
        )}

        {error && !cooldownSeconds && !dailyBlocked && (
          <div className="bg-white border-4 border-black text-black p-4 rounded-2xl text-sm font-black mb-5 shadow-[5px_5px_0px_#dc2626] flex items-center gap-3">
            <span className="text-3xl">💥</span>
            <div>{error}</div>
          </div>
        )}

        {/* Quick Action Alert Buttons */}
        <div className="space-y-3.5">
          <button
            onClick={() => handleSendAlert('OBSTRUCTION', 'Car is blocking my way')}
            disabled={isLocked}
            className="w-full bg-yellow-400 hover:bg-yellow-300 active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-black text-sm sm:text-base py-4 px-5 rounded-2xl border-4 border-black shadow-[5px_5px_0px_#000] transition-all flex items-center justify-between disabled:opacity-45 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0"
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl">🚗</span>
              <span>CAR IS BLOCKING ME</span>
            </span>
            <span className="text-lg">➔</span>
          </button>

          <button
            onClick={() => handleSendAlert('HEADLIGHTS', 'Lights or windows open')}
            disabled={isLocked}
            className="w-full bg-white hover:bg-yellow-50 active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-black text-sm sm:text-base py-4 px-5 rounded-2xl border-4 border-black shadow-[5px_5px_0px_#000] transition-all flex items-center justify-between disabled:opacity-45 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0"
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <span>LIGHTS / WINDOW OPEN</span>
            </span>
            <span className="text-lg">➔</span>
          </button>

          <button
            onClick={() => handleSendAlert('EMERGENCY', 'Tow / Urgent Emergency')}
            disabled={isLocked}
            className="w-full bg-yellow-200 hover:bg-yellow-300 active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-black text-sm sm:text-base py-4 px-5 rounded-2xl border-4 border-black shadow-[5px_5px_0px_#000] transition-all flex items-center justify-between disabled:opacity-45 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0"
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
        🛡️ Rate-limited (1 ping / 5 mins • Max 10 / day) to protect owners.
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