// src/components/PostAlertGrowthCard.tsx
'use client';

import Link from 'next/link';

interface PostAlertGrowthCardProps {
  apkDownloadUrl?: string;
}

export default function PostAlertGrowthCard({
  apkDownloadUrl = '/login?ref=scan_app',
}: PostAlertGrowthCardProps) {
  return (
    <div className="mt-6 bg-yellow-400 border-4 border-black rounded-3xl p-5 shadow-[6px_6px_0px_#000] text-black">
      {/* Top Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="bg-white border-2 border-black px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider">
          Free for Your Car &amp; Bike
        </span>
        <span className="text-xs font-black">⚡ 10-Sec Setup</span>
      </div>

      {/* Headline */}
      <h3 className="text-xl font-black tracking-tight leading-snug">
        Want this sticker for your own vehicle?
      </h3>
      <p className="text-xs sm:text-sm font-bold text-black/80 mt-1 leading-relaxed">
        Stop leaving your personal phone number on the dashboard. Generate &amp; print your free QR alert sticker in seconds.
      </p>

      {/* Action Buttons */}
      <div className="mt-4 space-y-2.5">
        {/* Primary: Create & Print Free Sticker */}
        <Link
          href="/login?ref=scan_sticker"
          className="w-full bg-black hover:bg-neutral-800 active:translate-y-0.5 text-yellow-400 font-black text-sm py-3.5 px-4 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#fff] transition flex items-center justify-between"
        >
          <span>🖨️ CREATE &amp; PRINT FREE STICKER</span>
          <span>➔</span>
        </Link>

        {/* Secondary: Install WHO PARK App */}
        <a
          href={apkDownloadUrl}
          className="w-full bg-white hover:bg-yellow-50 active:translate-y-0.5 text-black font-black text-xs sm:text-sm py-3 px-4 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#000] transition flex items-center justify-center gap-2"
        >
          <span>📲</span>
          <span>INSTALL WHO PARK ANDROID APP</span>
        </a>
      </div>
    </div>
  );
}