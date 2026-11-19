// src/app/admin/bulk-print/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';

export type BulkStickerStyleId =
  | 'horizontal-banner'
  | 'classic-yellow-card'
  | 'privacy-shield'
  | 'dark-stealth'
  | 'bike-mini-badge'
  | 'society-resident';

interface GeneratedSticker {
  slug: string;
  qrDataUrl: string;
}

const BULK_STYLES: {
  id: BulkStickerStyleId;
  name: string;
  vehicleFit: string;
  gridCols: string;
}[] = [
  {
    id: 'horizontal-banner',
    name: '1. Windshield Strip (Canva Style)',
    vehicleFit: 'Cars, Buses & Trucks',
    gridCols: 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2',
  },
  {
    id: 'classic-yellow-card',
    name: '2. Classic WHO PARK Card',
    vehicleFit: 'Cars & SUVs',
    gridCols: 'grid-cols-2 sm:grid-cols-3 print:grid-cols-3',
  },
  {
    id: 'privacy-shield',
    name: '3. Privacy First Alert',
    vehicleFit: 'Cars & Commercial Fleets',
    gridCols: 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2',
  },
  {
    id: 'dark-stealth',
    name: '4. Carbon Black & Gold',
    vehicleFit: 'Tinted Windshields & Buses',
    gridCols: 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2',
  },
  {
    id: 'bike-mini-badge',
    name: '5. Bike & Scooter Compact',
    vehicleFit: 'Bikes, Scooters & Autos',
    gridCols: 'grid-cols-2 sm:grid-cols-4 print:grid-cols-4',
  },
  {
    id: 'society-resident',
    name: '6. Society & Gate Pass',
    vehicleFit: 'CHS & Campus Vehicles',
    gridCols: 'grid-cols-2 sm:grid-cols-3 print:grid-cols-3',
  },
];

function BulkPrintContent() {
  const searchParams = useSearchParams();
  const batchName = searchParams.get('batch') || 'Bulk Batch';
  const slugsParam = searchParams.get('slugs') || '';

  const [selectedStyle, setSelectedStyle] =
    useState<BulkStickerStyleId>('horizontal-banner');
  const [stickers, setStickers] = useState<GeneratedSticker[]>([]);

  useEffect(() => {
    const slugs = slugsParam.split(',').filter(Boolean);
    if (!slugs.length) return;

    Promise.all(
      slugs.map(async (slug) => {
        const url = `https://www.whopark.in/v/${slug}`;
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 450,
          margin: 1,
          color: { dark: '#0A0A0A', light: '#FFFFFF' },
          errorCorrectionLevel: 'H',
        });
        return { slug, qrDataUrl };
      })
    ).then(setStickers);
  }, [slugsParam]);

  const activeConfig =
    BULK_STYLES.find((s) => s.id === selectedStyle) || BULK_STYLES[0];

  return (
    <main className="min-h-screen bg-[#FFFDF2] p-4 sm:p-6 text-neutral-950 print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Top Controls (Hidden on Print) */}
      <div className="max-w-6xl mx-auto mb-6 space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border-2 border-neutral-950 rounded-2xl p-4 shadow-[4px_4px_0px_#0a0a0a]">
          <Link
            href="/admin"
            className="bg-neutral-100 hover:bg-yellow-100 border-2 border-neutral-950 font-black text-xs px-4 py-2.5 rounded-xl transition"
          >
            ← Back to Admin
          </Link>

          <div className="text-center">
            <div className="text-sm sm:text-base font-black">
              Batch: <span className="text-amber-600">{batchName}</span> ({stickers.length} Stickers)
            </div>
            <p className="text-[11px] font-bold text-neutral-500">
              Choose a format for Car, Bus, Bike, or Society stickers before printing
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 border-2 border-neutral-950 font-black text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-[3px_3px_0px_#0a0a0a] transition"
          >
            🖨️ Print A4 Sheet / Save PDF
          </button>
        </div>

        {/* 6 Sticker Format Selector Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {BULK_STYLES.map((style) => {
            const active = selectedStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setSelectedStyle(style.id)}
                className={`text-left p-3 rounded-2xl border-2 transition ${
                  active
                    ? 'bg-yellow-400 border-neutral-950 shadow-[3px_3px_0px_#0a0a0a]'
                    : 'bg-white hover:bg-yellow-50 border-neutral-300'
                }`}
              >
                <div className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white border border-neutral-950 inline-block">
                  {style.vehicleFit}
                </div>
                <div className="font-extrabold text-xs mt-1.5 leading-snug">
                  {style.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Printable A4 Sticker Sheet Grid */}
      <div
        className={`max-w-6xl mx-auto grid gap-3.5 ${activeConfig.gridCols} print:gap-2.5`}
      >
        {stickers.map((s) => (
          <div
            key={s.slug}
            className="border-2 border-dashed border-neutral-400 p-1.5 rounded-2xl break-inside-avoid"
          >
            {/* STYLE 1: Windshield Strip (Cars, Buses, Trucks) */}
            {selectedStyle === 'horizontal-banner' && (
              <div className="w-full h-[118px] flex border-[3px] border-neutral-950 bg-white overflow-hidden">
                <div className="flex-1 bg-yellow-400 flex flex-col items-center justify-center px-2.5 border-r-[3px] border-neutral-950 text-center">
                  <span className="text-white font-black text-3xl tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)] leading-none">
                    WHO PARK
                  </span>
                  <span className="mt-2 bg-neutral-950 text-yellow-400 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full">
                    SCAN TO RING • ID: {s.slug}
                  </span>
                  <span className="mt-1 text-[8px] font-black text-neutral-950">
                    CAR • BUS • BIKE • PRIVATE ALERT
                  </span>
                </div>
                <div className="w-[118px] h-full bg-white p-1.5 flex items-center justify-center shrink-0">
                  <img
                    src={s.qrDataUrl}
                    alt={s.slug}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* STYLE 2: Classic Vertical Yellow Card */}
            {selectedStyle === 'classic-yellow-card' && (
              <div className="bg-yellow-400 border-[3px] border-neutral-950 rounded-2xl p-3 text-center flex flex-col items-center">
                <div className="font-black text-lg tracking-tight leading-none">
                  WHO PARK
                </div>
                <div className="text-[9px] font-extrabold mt-0.5">
                  BLOCKED? SCAN TO RING OWNER
                </div>
                <div className="my-2 bg-white border-2 border-neutral-950 rounded-xl p-1.5">
                  <img
                    src={s.qrDataUrl}
                    alt={s.slug}
                    className="w-28 h-28 object-contain"
                  />
                </div>
                <div className="w-full bg-neutral-950 text-yellow-400 font-mono font-black text-[10px] py-1 px-2 rounded-lg">
                  SCAN TO ACTIVATE / ALERT
                </div>
                <div className="text-[8px] font-mono font-bold mt-1">
                  ID: {s.slug} • NO NUMBER SHARED
                </div>
              </div>
            )}

            {/* STYLE 3: Privacy First Horizontal Card */}
            {selectedStyle === 'privacy-shield' && (
              <div className="bg-white border-[3px] border-neutral-950 rounded-2xl p-3">
                <div className="bg-yellow-400 border-2 border-neutral-950 rounded-lg py-1 px-2 text-center font-black text-[11px]">
                  NEED TO MOVE THIS VEHICLE?
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2.5">
                  <div className="space-y-1 text-left">
                    <div className="font-black text-base leading-none">WHO PARK</div>
                    <p className="text-[10px] font-bold text-neutral-600 leading-tight">
                      1. Scan QR with camera
                      <br />
                      2. Ring owner privately
                    </p>
                    <div className="inline-block bg-yellow-300 border border-neutral-950 font-mono font-black text-[10px] px-2 py-0.5 rounded-md">
                      TAG: {s.slug}
                    </div>
                  </div>
                  <div className="w-24 h-24 border-2 border-neutral-950 rounded-xl p-1 shrink-0 bg-white">
                    <img
                      src={s.qrDataUrl}
                      alt={s.slug}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STYLE 4: Dark Stealth & Gold (Tinted Glass / Buses) */}
            {selectedStyle === 'dark-stealth' && (
              <div className="bg-neutral-950 text-white border-[3px] border-yellow-400 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="space-y-1.5 text-left">
                  <div className="text-yellow-400 font-black text-lg leading-none">
                    WHO PARK
                  </div>
                  <p className="text-[10px] text-neutral-300 font-medium leading-tight">
                    Vehicle blocking or lights on? Scan QR to ring owner in 5s.
                  </p>
                  <div className="inline-block bg-yellow-400 text-neutral-950 font-mono font-black text-[10px] px-2 py-0.5 rounded-md">
                    ID: {s.slug}
                  </div>
                </div>
                <div className="text-center shrink-0">
                  <div className="w-24 h-24 bg-white rounded-xl p-1">
                    <img
                      src={s.qrDataUrl}
                      alt={s.slug}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-[8px] font-black text-yellow-400 mt-1">
                    SCAN TO RING
                  </div>
                </div>
              </div>
            )}

            {/* STYLE 5: Bike & Scooter Compact */}
            {selectedStyle === 'bike-mini-badge' && (
              <div className="bg-yellow-400 border-[3px] border-neutral-950 rounded-2xl p-2.5 text-center flex flex-col items-center">
                <div className="font-black text-sm leading-none">WHO PARK</div>
                <div className="text-[8px] font-extrabold mt-0.5">
                  SCAN TO MOVE BIKE
                </div>
                <div className="my-1.5 bg-white border-2 border-neutral-950 rounded-xl p-1">
                  <img
                    src={s.qrDataUrl}
                    alt={s.slug}
                    className="w-24 h-24 object-contain"
                  />
                </div>
                <div className="w-full bg-neutral-950 text-yellow-400 font-mono font-black text-[9px] py-0.5 px-1.5 rounded-md">
                  ID: {s.slug}
                </div>
              </div>
            )}

            {/* STYLE 6: Society & Gate Pass Square */}
            {selectedStyle === 'society-resident' && (
              <div className="bg-[#FFFDF2] border-[3px] border-neutral-950 rounded-2xl p-2.5 text-center flex flex-col items-center">
                <div className="w-full bg-neutral-950 text-yellow-400 font-black text-[10px] py-1 px-2 rounded-lg">
                  RESIDENT PARKING PASS
                </div>
                <div className="my-2 bg-white border-2 border-neutral-950 rounded-xl p-1.5">
                  <img
                    src={s.qrDataUrl}
                    alt={s.slug}
                    className="w-28 h-28 object-contain"
                  />
                </div>
                <div className="w-full bg-yellow-400 border-2 border-neutral-950 rounded-lg py-1 px-2">
                  <div className="font-mono font-black text-[10px]">
                    ID: {s.slug} • SCAN TO ACTIVATE
                  </div>
                  <div className="text-[8px] font-extrabold">
                    WHO PARK • PRIVATE ALERT
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

export default function BulkPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 font-black">Preparing Bulk Sheet...</div>}>
      <BulkPrintContent />
    </Suspense>
  );
}