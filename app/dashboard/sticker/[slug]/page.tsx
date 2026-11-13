// src/app/dashboard/sticker/[slug]/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface VehicleDetails {
  plateNumber: string;
  makeModel: string | null;
  tagSlug: string;
}

function StickerPrintContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [vehicle, setVehicle] = useState<VehicleDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function loadVehicleSticker() {
      try {
        // Verify owner session and fetch their vehicles so only the owner can view/print
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
          🖨️ PREPARING STICKER...
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
    <main className="min-h-screen bg-[#FFFDF0] py-8 px-4 flex flex-col items-center justify-between selection:bg-yellow-300 print:bg-white print:p-0 print:min-h-0">
      {/* Print-specific CSS */}
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
        }
      `}</style>

      {/* Top Action Bar (Hidden when printing) */}
      <div className="max-w-md w-full flex items-center justify-between gap-3 mb-8 print:hidden">
        <Link
          href="/dashboard"
          className="bg-white hover:bg-yellow-100 text-black font-black text-xs px-4 py-2.5 rounded-xl border-3 border-black shadow-[3px_3px_0px_#000] transition"
        >
          ← BACK TO GARAGE
        </Link>

        <button
          onClick={() => window.print()}
          className="bg-yellow-400 hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-black font-black text-xs px-5 py-2.5 rounded-xl border-3 border-black shadow-[4px_4px_0px_#000] transition flex items-center gap-2"
        >
          <span>🖨️</span>
          <span>PRINT / SAVE PDF</span>
        </button>
      </div>

      {/* Printable 3" x 4" Windshield Sticker Card */}
      <div className="flex flex-col items-center justify-center my-auto">
        <p className="text-xs font-black text-stone-500 uppercase tracking-widest mb-3 print:hidden">
          ✂️ Cut along the dashed border (3&quot; × 4&quot; Standard Size)
        </p>

        {/* Outer Cut-Guide Wrapper */}
        <div className="p-3 border-2 border-dashed border-stone-400 rounded-[28px] print:border-black">
          {/* Exact 3in x 4in Sticker Body */}
          <div
            style={{ width: '3in', height: '4in' }}
            className="bg-yellow-400 border-4 border-black rounded-3xl p-4 flex flex-col justify-between items-center text-center shadow-[6px_6px_0px_#000] print:shadow-none relative overflow-hidden"
          >
            {/* Top Brand Pill */}
            <div className="w-full flex items-center justify-between bg-black text-yellow-400 px-3 py-1 rounded-full">
              <span className="font-black text-[11px] tracking-wider">🚕 HONKSAFE</span>
              <span className="font-black text-[9px] uppercase tracking-widest bg-yellow-400 text-black px-2 py-0.5 rounded-full">
                PRIVATE ALERT
              </span>
            </div>

            {/* Bold Call to Action */}
            <div className="mt-1">
              <h1 className="text-xl font-black text-black leading-none tracking-tight">
                NEED ME TO MOVE?
              </h1>
              <p className="text-[10px] font-black text-black/80 mt-1 uppercase tracking-wide">
                Scan with phone camera to alert driver
              </p>
            </div>

            {/* Crisp White QR Frame */}
            <div className="bg-white p-2.5 rounded-2xl border-4 border-black shadow-[4px_4px_0px_#000] print:shadow-none my-1">
              <img
                src={`/api/qr/image/${vehicle.tagSlug}`}
                alt={`QR Sticker for ${vehicle.plateNumber}`}
                className="w-36 h-36 object-contain block"
              />
            </div>

            {/* Vehicle Plate & Tag Code */}
            <div className="w-full space-y-1">
              <div className="bg-white border-3 border-black rounded-xl py-1 px-2 font-mono font-black text-sm tracking-widest text-black">
                {vehicle.plateNumber}
              </div>
              <div className="flex items-center justify-between text-[9px] font-black text-black/80 px-1">
                <span>🔒 NO NUMBERS SHARED</span>
                <span className="font-mono">ID: {vehicle.tagSlug}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Helpful Printing Tips (Hidden when printing) */}
      <div className="max-w-md w-full mt-8 bg-white border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0px_#000] text-xs font-bold text-stone-700 space-y-1.5 print:hidden">
        <p className="font-black text-black uppercase">💡 How to stick on your windshield:</p>
        <p>1. Click <span className="font-black text-black">PRINT / SAVE PDF</span> above (enable &ldquo;Background graphics&rdquo; in print settings).</p>
        <p>2. Print on glossy sticker paper or regular A4 paper and laminate.</p>
        <p>3. Place inside the bottom-left corner of your front windshield facing outward.</p>
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