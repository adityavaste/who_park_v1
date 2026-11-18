// src/app/dashboard/sticker/[slug]/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PrintStickerCard from '@/components/PrintStickerCard';

interface VehicleDetails {
  plateNumber: string;
  makeModel: string | null;
  tagSlug: string;
}

function StickerPrintContent() {
  const [appOrigin, setAppOrigin] = useState<string>('https://www.whopark.in');

  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!slug) return;

    async function loadVehicleSticker() {
      try {
        const res = await fetch('/api/owner/vehicles', { credentials: 'include' });
        if (res.status === 401) {
          router.push('/login');
          return;
        }

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load sticker details');
        }

        const matched = (data.vehicles || []).find((v: any) => v.tagSlug === slug);
        if (!matched) {
          throw new Error('Sticker not found in your garage.');
        }

        setVehicle(matched);
      } catch (err: any) {
        setError(err.message || 'Could not load sticker');
      } finally {
        setLoading(false);
      }
    }

    loadVehicleSticker();
  }, [slug, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFFDF0] flex items-center justify-center p-4">
        <div className="bg-yellow-300 border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_#000] font-black text-lg animate-bounce">
          🖨️ PREPARING STICKERS...
        </div>
      </main>
    );
  }

  if (error || !vehicle) {
    return (
      <main className="min-h-screen bg-[#FFFDF0] flex flex-col items-center justify-center p-4">
        <div className="bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_#000] max-w-sm w-full text-center">
          <div className="text-4xl mb-2">💥</div>
          <p className="font-black text-black">{error || 'Sticker not found'}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block bg-yellow-400 text-black font-black text-xs px-4 py-2.5 rounded-xl border-3 border-black shadow-[3px_3px_0px_#000]"
          >
            ← BACK TO GARAGE
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFDF0] py-8 px-4 flex flex-col items-center selection:bg-yellow-300 print:bg-white print:p-0 print:min-h-0">
      {/* Print-specific CSS: prints only the active sticker cleanly */}
      <style jsx global>{`
        @media print {
          @page {
            size: auto;
            margin: 10mm;
          }
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-sticker-area,
          #printable-sticker-area * {
            visibility: visible;
          }
          #printable-sticker-area {
            position: fixed;
            left: 50%;
            top: 40px;
            transform: translateX(-50%);
          }
        }
      `}</style>

      {/* Top Back Bar (Hidden when printing) */}
      <div className="max-w-3xl w-full flex items-center justify-between gap-3 mb-6 print:hidden">
        <Link
          href="/dashboard"
          className="bg-white hover:bg-yellow-100 text-black font-black text-xs px-4 py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0px_#000] transition"
        >
          ← BACK TO GARAGE
        </Link>

        <span className="font-mono font-black text-xs bg-yellow-300 border-2 border-black px-3 py-1.5 rounded-xl">
          TAG ID: {vehicle.tagSlug}
        </span>
      </div>

      {/* 6-Style Sticker Selector, Live Preview, High-Res PNG Download & Print */}
      <div className="max-w-3xl w-full">
        <PrintStickerCard
          vehicleNumber={vehicle.plateNumber}
          vehicleModel={vehicle.makeModel || undefined}
          slug={vehicle.tagSlug}
          baseUrl={appOrigin}
        />
      </div>

      {/* Helpful Printing Tips (Hidden when printing) */}
      <div className="max-w-3xl w-full mt-6 bg-white border-2 border-black rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_#000] text-xs font-bold text-stone-700 space-y-1.5 print:hidden">
        <p className="font-black text-black uppercase">💡 How to stick on your vehicle:</p>
        <p>1. Choose your favorite style above and click <span className="font-black text-black">Download High-Res PNG</span> or <span className="font-black text-black">Print Sticker</span>.</p>
        <p>2. Print on glossy vinyl sticker paper, or print on regular A4 paper and laminate at any local print shop.</p>
        <p>3. Place inside the bottom-left corner of your car windshield (or mudguard/visor on a bike) facing outward.</p>
      </div>
    </main>
  );
}

export default function PrintableStickerPage() {
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
      <StickerPrintContent />
    </Suspense>
  );
}