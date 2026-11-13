// src/app/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [tagCode, setTagCode] = useState('');

  function handleGoToVehicle(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = tagCode.trim();
    if (!cleanCode) return;

    // Extract slug if the user pasted a full URL (e.g., https://app.com/v/abc12345)
    const slug = cleanCode.includes('/v/')
      ? cleanCode.split('/v/')[1].split('/')[0]
      : cleanCode;

    router.push(`/v/${slug}`);
  }

  return (
    <main className="min-h-screen bg-[#FFFDF0] text-black flex flex-col justify-between p-4 sm:p-8 selection:bg-yellow-300">
      {/* Top Navbar */}
      <nav className="max-w-5xl w-full mx-auto flex items-center justify-between bg-white border-4 border-black px-5 py-3.5 rounded-3xl shadow-[6px_6px_0px_#000]">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl sm:text-3xl">🚕</span>
          <span className="font-black text-xl sm:text-2xl tracking-tight">
            HONK<span className="text-yellow-500">SAFE</span>
          </span>
        </div>

        <Link
          href="/login"
          className="bg-yellow-400 hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-black font-black text-xs sm:text-sm px-4 py-2 rounded-xl border-3 border-black shadow-[3px_3px_0px_#000] transition-all"
        >
          OWNER LOGIN 🔑
        </Link>
      </nav>

      {/* Center Hero Section */}
      <section className="max-w-4xl w-full mx-auto my-12 text-center">
        {/* Comic Badge */}
        <div className="inline-block bg-yellow-300 border-3 border-black px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-widest shadow-[4px_4px_0px_#000] -rotate-2 mb-6">
          ★ 100% Anonymous Car Alerts ★
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-black">
          BLOCKED BY A CAR?
          <span className="block mt-2 bg-yellow-400 inline-block px-4 py-1 border-4 border-black rounded-2xl shadow-[6px_6px_0px_#000] rotate-1">
            PING THE DRIVER!
          </span>
        </h1>

        <p className="max-w-xl mx-auto mt-6 text-sm sm:text-base font-bold text-stone-700 leading-relaxed">
          Scan the sticker on the windshield to alert the owner via WhatsApp or private call—without ever revealing phone numbers!
        </p>

        {/* Two Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mt-10 text-left">
          {/* Option 1: Scan QR / Contact Owner */}
          <div className="bg-yellow-400 border-4 border-black rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0px_#000] flex flex-col justify-between relative">
            <div className="absolute -top-4 -right-3 bg-white border-3 border-black px-3 py-1 rounded-full font-black text-xs rotate-6 shadow-[3px_3px_0px_#000]">
              FOR PUBLIC
            </div>

            <div>
              <div className="w-14 h-14 bg-white border-3 border-black rounded-2xl flex items-center justify-center text-3xl shadow-[4px_4px_0px_#000] mb-5">
                📷
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-black leading-tight">
                SCAN QR & CONTACT OWNER
              </h2>
              <p className="text-xs sm:text-sm font-bold text-black/80 mt-2 leading-relaxed">
                Found a car blocking your driveway or with headlights left on? Open your phone camera or enter the sticker ID below.
              </p>
            </div>

            <div className="mt-6">
              {!showCodeInput ? (
                <button
                  onClick={() => setShowCodeInput(true)}
                  className="w-full bg-white hover:bg-yellow-50 active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-black text-sm sm:text-base py-4 px-5 rounded-2xl border-4 border-black shadow-[5px_5px_0px_#000] transition-all flex items-center justify-between"
                >
                  <span>ENTER STICKER CODE / SCAN</span>
                  <span className="text-xl">➔</span>
                </button>
              ) : (
                <form onSubmit={handleGoToVehicle} className="space-y-2.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. a9b2c3d4"
                      value={tagCode}
                      onChange={(e) => setTagCode(e.target.value)}
                      className="flex-1 bg-white border-3 border-black rounded-xl px-3.5 py-3 text-sm font-black font-mono shadow-[3px_3px_0px_#000] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="bg-black text-yellow-400 font-black text-sm px-5 py-3 rounded-xl border-3 border-black shadow-[3px_3px_0px_#fff] hover:bg-stone-800 transition"
                    >
                      GO!
                    </button>
                  </div>
                  <p className="text-[11px] font-black text-black/75">
                    💡 Tip: You can also scan the QR sticker directly with your phone’s normal camera app!
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Option 2: Car Owner Dashboard */}
          <div className="bg-white border-4 border-black rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0px_#000] flex flex-col justify-between relative">
            <div className="absolute -top-4 -right-3 bg-yellow-300 border-3 border-black px-3 py-1 rounded-full font-black text-xs -rotate-3 shadow-[3px_3px_0px_#000]">
              FOR CAR OWNERS
            </div>

            <div>
              <div className="w-14 h-14 bg-yellow-300 border-3 border-black rounded-2xl flex items-center justify-center text-3xl shadow-[4px_4px_0px_#000] mb-5">
                🚘
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-black leading-tight">
                LOGIN TO OWNER DASHBOARD
              </h2>
              <p className="text-xs sm:text-sm font-bold text-stone-600 mt-2 leading-relaxed">
                Register your vehicle, download your custom windshield QR sticker, and check live alert logs in your garage portal.
              </p>
            </div>

            <div className="mt-6">
              <Link
                href="/login"
                className="w-full bg-yellow-400 hover:bg-yellow-300 active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-black text-sm sm:text-base py-4 px-5 rounded-2xl border-4 border-black shadow-[5px_5px_0px_#000] transition-all flex items-center justify-between"
              >
                <span>GO TO MY GARAGE</span>
                <span className="text-xl">➔</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center pt-6 pb-2">
        <div className="inline-block bg-white border-3 border-black px-4 py-2 rounded-2xl shadow-[4px_4px_0px_#000] text-xs font-black text-stone-700">
          🛡️ ZERO SPAM • PRIVACY FIRST • BUILT FOR SMART PARKING
        </div>
      </footer>
    </main>
  );
  
}