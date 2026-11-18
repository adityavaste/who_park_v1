// components/PrintStickerCard.tsx
'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export type StickerStyleId =
  | 'horizontal-banner'
  | 'classic-yellow-card'
  | 'privacy-shield'
  | 'dark-stealth'
  | 'bike-mini-badge'
  | 'society-resident';

interface PrintStickerCardProps {
  vehicleNumber: string; // e.g., "MH 12 AB 1234"
  vehicleModel?: string; // e.g., "Tata Zest"
  slug: string;          // e.g., "a9b2c3d4"
  baseUrl?: string;      // defaults to "https://www.whopark.in"
}

const STICKER_STYLES: {
  id: StickerStyleId;
  name: string;
  tag: string;
  sizeLabel: string;
}[] = [
  {
    id: 'horizontal-banner',
    name: '1. Windshield Strip (Canva Style)',
    tag: 'Most Popular',
    sizeLabel: '6" × 1.8" Strip',
  },
  {
    id: 'classic-yellow-card',
    name: '2. Classic WHO PARK Card',
    tag: 'High Contrast',
    sizeLabel: '3.5" × 4.5" Vertical',
  },
  {
    id: 'privacy-shield',
    name: '3. Privacy First Alert',
    tag: 'No Number Exposed',
    sizeLabel: '4" × 3" Dashboard',
  },
  {
    id: 'dark-stealth',
    name: '4. Carbon Black & Gold',
    tag: 'Tinted Glass',
    sizeLabel: '4" × 3" Sleek',
  },
  {
    id: 'bike-mini-badge',
    name: '5. Bike & Scooter Compact',
    tag: '2-Wheeler',
    sizeLabel: '2.5" × 3.2" Mini',
  },
  {
    id: 'society-resident',
    name: '6. Society & Gate Pass',
    tag: 'CHS / Apartment',
    sizeLabel: '4" × 4" Square',
  },
];

export default function PrintStickerCard({
  vehicleNumber,
  vehicleModel,
  slug,
  baseUrl = 'https://www.whopark.in',
}: PrintStickerCardProps) {
  const [selectedStyle, setSelectedStyle] =
    useState<StickerStyleId>('horizontal-banner');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloading, setDownloading] = useState<boolean>(false);

  const scanUrl = `${baseUrl}/v/${slug}`;
  const formattedPlate = (vehicleNumber || 'MH 12 XX 0000').toUpperCase();

  useEffect(() => {
    QRCode.toDataURL(scanUrl, {
      width: 600,
      margin: 1,
      color: {
        dark: '#0A0A0A',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [scanUrl]);

  // High-resolution Canvas exporter so printed stickers are 300 DPI crisp
  async function handleDownloadPng() {
    if (!qrDataUrl) return;
    setDownloading(true);

    try {
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      const drawRoundRect = (
        x: number,
        y: number,
        w: number,
        h: number,
        r: number
      ) => {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.closePath();
      };

      if (selectedStyle === 'horizontal-banner') {
        // Exact Canva Horizontal Strip: Yellow Left + White QR Right
        canvas.width = 1500;
        canvas.height = 460;

        // Yellow Left Block
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(0, 0, 1040, 460);

        // White Right Block
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(1040, 0, 460, 460);

        // Outer Border
        ctx.strokeStyle = '#0A0A0A';
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, 1486, 446);

        // Divider Line
        ctx.beginPath();
        ctx.moveTo(1040, 0);
        ctx.lineTo(1040, 460);
        ctx.stroke();

        // Bold White "WHO PARK" Text (matching your Canva layout)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 142px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.18)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;
        ctx.fillText('WHO PARK', 520, 200);
        ctx.shadowColor = 'transparent';

        // Subtitle Pill
        ctx.fillStyle = '#0A0A0A';
        drawRoundRect(200, 310, 640, 66, 33);
        ctx.fill();

        ctx.fillStyle = '#FACC15';
        ctx.font = '800 30px system-ui, -apple-system, sans-serif';
        ctx.fillText(`SCAN TO RING OWNER • ${formattedPlate}`, 520, 344);

        // QR Code on Right
        ctx.drawImage(qrImg, 1075, 35, 390, 390);
      } else if (selectedStyle === 'classic-yellow-card') {
        canvas.width = 900;
        canvas.height = 1150;

        ctx.fillStyle = '#FACC15';
        drawRoundRect(12, 12, 876, 1126, 48);
        ctx.fill();
        ctx.lineWidth = 18;
        ctx.strokeStyle = '#0A0A0A';
        ctx.stroke();

        // Top Header
        ctx.fillStyle = '#0A0A0A';
        ctx.font = '900 84px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('WHO PARK', 450, 130);

        ctx.font = '700 34px system-ui, -apple-system, sans-serif';
        ctx.fillText('BLOCKED? SCAN TO RING OWNER', 450, 190);

        // White QR Box
        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(150, 240, 600, 600, 36);
        ctx.fill();
        ctx.lineWidth = 12;
        ctx.stroke();
        ctx.drawImage(qrImg, 185, 275, 530, 530);

        // Vehicle Plate Pill
        ctx.fillStyle = '#0A0A0A';
        drawRoundRect(130, 890, 640, 95, 24);
        ctx.fill();
        ctx.fillStyle = '#FACC15';
        ctx.font = '900 48px monospace';
        ctx.fillText(formattedPlate, 450, 952);

        // Footer Note
        ctx.fillStyle = '#0A0A0A';
        ctx.font = '800 28px system-ui, -apple-system, sans-serif';
        ctx.fillText('100% PRIVATE • NO PHONE NUMBER SHARED', 450, 1055);
      } else if (selectedStyle === 'privacy-shield') {
        canvas.width = 1150;
        canvas.height = 820;

        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(12, 12, 1126, 796, 44);
        ctx.fill();
        ctx.lineWidth = 16;
        ctx.strokeStyle = '#0A0A0A';
        ctx.stroke();

        // Top Yellow Banner
        ctx.fillStyle = '#FACC15';
        drawRoundRect(40, 40, 1070, 150, 28);
        ctx.fill();
        ctx.lineWidth = 10;
        ctx.stroke();

        ctx.fillStyle = '#0A0A0A';
        ctx.font = '900 66px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NEED TO MOVE THIS VEHICLE?', 575, 135);

        // Left Info Column
        ctx.textAlign = 'left';
        ctx.font = '900 54px system-ui, -apple-system, sans-serif';
        ctx.fillText('WHO PARK', 70, 295);

        ctx.font = '700 32px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#374151';
        ctx.fillText('1. Open phone camera', 70, 375);
        ctx.fillText('2. Scan the QR code', 70, 435);
        ctx.fillText('3. Instant private ring!', 70, 495);

        // Plate Tag
        ctx.fillStyle = '#FACC15';
        drawRoundRect(70, 560, 480, 90, 20);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0A0A0A';
        ctx.font = '900 42px monospace';
        ctx.fillText(formattedPlate, 105, 618);

        ctx.font = '700 26px system-ui, -apple-system, sans-serif';
        ctx.fillText('Zero spam • Numbers stay hidden', 70, 715);

        // Right QR Box
        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(610, 235, 480, 480, 32);
        ctx.fill();
        ctx.lineWidth = 12;
        ctx.stroke();
        ctx.drawImage(qrImg, 640, 265, 420, 420);
      } else if (selectedStyle === 'dark-stealth') {
        canvas.width = 1150;
        canvas.height = 820;

        ctx.fillStyle = '#0A0A0A';
        drawRoundRect(12, 12, 1126, 796, 44);
        ctx.fill();
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#FACC15';
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#FACC15';
        ctx.font = '900 76px system-ui, -apple-system, sans-serif';
        ctx.fillText('WHO PARK', 75, 165);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 36px system-ui, -apple-system, sans-serif';
        ctx.fillText('SMART VEHICLE ALERT TAG', 75, 225);

        ctx.fillStyle = '#D1D5DB';
        ctx.font = '600 30px system-ui, -apple-system, sans-serif';
        ctx.fillText('Parked in the way or lights on?', 75, 340);
        ctx.fillText('Scan QR to alert owner in 5s.', 75, 390);

        // Gold Plate Badge
        ctx.fillStyle = '#FACC15';
        drawRoundRect(75, 480, 470, 92, 20);
        ctx.fill();
        ctx.fillStyle = '#0A0A0A';
        ctx.font = '900 42px monospace';
        ctx.fillText(formattedPlate, 105, 540);

        ctx.fillStyle = '#9CA3AF';
        ctx.font = '700 26px system-ui, -apple-system, sans-serif';
        ctx.fillText('whopark.in • Private QR', 75, 680);

        // White QR Container
        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(600, 150, 480, 480, 32);
        ctx.fill();
        ctx.drawImage(qrImg, 630, 180, 420, 420);

        ctx.fillStyle = '#FACC15';
        ctx.textAlign = 'center';
        ctx.font = '800 30px system-ui, -apple-system, sans-serif';
        ctx.fillText('SCAN TO CALL / PING', 840, 695);
      } else if (selectedStyle === 'bike-mini-badge') {
        canvas.width = 750;
        canvas.height = 960;

        ctx.fillStyle = '#FACC15';
        drawRoundRect(12, 12, 726, 936, 44);
        ctx.fill();
        ctx.lineWidth = 16;
        ctx.strokeStyle = '#0A0A0A';
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#0A0A0A';
        ctx.font = '900 68px system-ui, -apple-system, sans-serif';
        ctx.fillText('WHO PARK', 375, 115);

        ctx.font = '800 28px system-ui, -apple-system, sans-serif';
        ctx.fillText('SCAN TO MOVE BIKE', 375, 168);

        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(115, 210, 520, 520, 32);
        ctx.fill();
        ctx.lineWidth = 12;
        ctx.stroke();
        ctx.drawImage(qrImg, 145, 240, 460, 460);

        ctx.fillStyle = '#0A0A0A';
        drawRoundRect(95, 775, 560, 86, 22);
        ctx.fill();
        ctx.fillStyle = '#FACC15';
        ctx.font = '900 40px monospace';
        ctx.fillText(formattedPlate, 375, 832);
      } else if (selectedStyle === 'society-resident') {
        canvas.width = 1000;
        canvas.height = 1000;

        ctx.fillStyle = '#FFFDF2';
        drawRoundRect(12, 12, 976, 976, 44);
        ctx.fill();
        ctx.lineWidth = 16;
        ctx.strokeStyle = '#0A0A0A';
        ctx.stroke();

        // Top Bar
        ctx.fillStyle = '#0A0A0A';
        drawRoundRect(40, 40, 920, 130, 26);
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FACC15';
        ctx.font = '900 58px system-ui, -apple-system, sans-serif';
        ctx.fillText('RESIDENT PARKING PASS', 500, 124);

        // QR
        ctx.fillStyle = '#FFFFFF';
        drawRoundRect(230, 215, 540, 540, 32);
        ctx.fill();
        ctx.lineWidth = 12;
        ctx.strokeStyle = '#0A0A0A';
        ctx.stroke();
        ctx.drawImage(qrImg, 260, 245, 480, 480);

        // Bottom Yellow Strip
        ctx.fillStyle = '#FACC15';
        drawRoundRect(40, 795, 920, 155, 26);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0A0A0A';
        ctx.font = '900 48px monospace';
        ctx.fillText(formattedPlate, 500, 865);
        ctx.font = '800 28px system-ui, -apple-system, sans-serif';
        ctx.fillText('WHO PARK • SCAN TO ALERT OWNER PRIVATELY', 500, 918);
      }

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `whopark-${selectedStyle}-${formattedPlate.replace(/\s+/g, '')}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="bg-white border-2 border-neutral-950 rounded-3xl p-5 sm:p-7 shadow-[6px_6px_0px_#0a0a0a] text-neutral-950">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <span className="bg-yellow-300 border border-neutral-950 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider">
            6 Ready-to-Print Designs
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-1.5">
            Print or Download Sticker
          </h2>
          <p className="text-xs sm:text-sm text-neutral-600 font-medium">
            Pick a sticker layout for <span className="font-bold text-neutral-950">{formattedPlate}</span>{vehicleModel ? ` (${vehicleModel})` : ''}.
          </p>
        </div>
      </div>

      {/* 6 Format Selector Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-6">
        {STICKER_STYLES.map((style) => {
          const active = selectedStyle === style.id;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => setSelectedStyle(style.id)}
              className={`text-left p-3 rounded-2xl border-2 transition ${
                active
                  ? 'bg-yellow-400 border-neutral-950 shadow-[3px_3px_0px_#0a0a0a]'
                  : 'bg-neutral-50 hover:bg-yellow-50 border-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-neutral-950">
                  {style.tag}
                </span>
                <span className="text-[11px] font-bold text-neutral-600">
                  {style.sizeLabel}
                </span>
              </div>
              <div className="font-extrabold text-xs sm:text-sm mt-2 text-neutral-950">
                {style.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Live Preview Stage */}
      <div className="bg-amber-50/60 border-2 border-dashed border-neutral-400 rounded-2xl p-5 sm:p-8 flex items-center justify-center overflow-x-auto">
        {!qrDataUrl ? (
          <div className="text-xs font-bold text-neutral-500 py-10">
            Generating high-res QR...
          </div>
        ) : (
          <div id="printable-sticker-area" className="shrink-0">
            {/* STYLE 1: Canva Horizontal Banner */}
            {selectedStyle === 'horizontal-banner' && (
              <div className="w-[340px] sm:w-[520px] h-[110px] sm:h-[160px] flex border-[3px] border-neutral-950 shadow-[5px_5px_0px_#0a0a0a] bg-white overflow-hidden">
                <div className="flex-1 bg-yellow-400 flex flex-col items-center justify-center px-3 border-r-[3px] border-neutral-950">
                  <span className="text-white font-black text-3xl sm:text-5xl tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)] leading-none">
                    WHO PARK
                  </span>
                  <span className="mt-2 bg-neutral-950 text-yellow-400 text-[9px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-full tracking-wide">
                    SCAN TO RING • {formattedPlate}
                  </span>
                </div>
                <div className="w-[110px] sm:w-[160px] h-full bg-white p-2 flex items-center justify-center">
                  <img
                    src={qrDataUrl}
                    alt="WHO PARK QR"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* STYLE 2: Classic Vertical Yellow Card */}
            {selectedStyle === 'classic-yellow-card' && (
              <div className="w-[260px] bg-yellow-400 border-[3px] border-neutral-950 rounded-3xl p-4 shadow-[5px_5px_0px_#0a0a0a] text-center">
                <div className="font-black text-2xl tracking-tight leading-none">
                  WHO PARK
                </div>
                <div className="text-[10px] font-extrabold mt-1">
                  BLOCKED? SCAN TO RING OWNER
                </div>
                <div className="my-3 bg-white border-2 border-neutral-950 rounded-2xl p-2.5">
                  <img
                    src={qrDataUrl}
                    alt="QR"
                    className="w-44 h-44 mx-auto object-contain"
                  />
                </div>
                <div className="bg-neutral-950 text-yellow-400 font-mono font-black text-sm py-1.5 px-3 rounded-xl">
                  {formattedPlate}
                </div>
                <div className="text-[9px] font-extrabold mt-2">
                  100% PRIVATE • NO NUMBER SHARED
                </div>
              </div>
            )}

            {/* STYLE 3: Privacy First Horizontal Card */}
            {selectedStyle === 'privacy-shield' && (
              <div className="w-[340px] sm:w-[440px] bg-white border-[3px] border-neutral-950 rounded-3xl p-4 shadow-[5px_5px_0px_#0a0a0a]">
                <div className="bg-yellow-400 border-2 border-neutral-950 rounded-xl py-1.5 px-3 text-center font-black text-xs sm:text-sm">
                  NEED TO MOVE THIS VEHICLE?
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="space-y-1.5 text-left">
                    <div className="font-black text-lg leading-none">WHO PARK</div>
                    <p className="text-[11px] font-bold text-neutral-600 leading-snug">
                      1. Scan QR with camera
                      <br />
                      2. Ring owner privately
                    </p>
                    <div className="inline-block bg-yellow-300 border border-neutral-950 font-mono font-black text-xs px-2.5 py-1 rounded-lg">
                      {formattedPlate}
                    </div>
                  </div>
                  <div className="w-28 h-28 sm:w-32 sm:h-32 border-2 border-neutral-950 rounded-2xl p-1.5 shrink-0 bg-white">
                    <img
                      src={qrDataUrl}
                      alt="QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STYLE 4: Dark Stealth & Gold */}
            {selectedStyle === 'dark-stealth' && (
              <div className="w-[340px] sm:w-[440px] bg-neutral-950 text-white border-[3px] border-yellow-400 rounded-3xl p-4 shadow-[5px_5px_0px_#0a0a0a] flex items-center justify-between gap-4">
                <div className="space-y-2 text-left">
                  <div className="text-yellow-400 font-black text-xl tracking-tight leading-none">
                    WHO PARK
                  </div>
                  <p className="text-[11px] text-neutral-300 font-medium leading-snug">
                    Car blocking or lights on? Scan QR to alert owner in 5s.
                  </p>
                  <div className="inline-block bg-yellow-400 text-neutral-950 font-mono font-black text-xs px-2.5 py-1 rounded-lg">
                    {formattedPlate}
                  </div>
                </div>
                <div className="text-center shrink-0">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-2xl p-1.5">
                    <img
                      src={qrDataUrl}
                      alt="QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-[9px] font-black text-yellow-400 mt-1">
                    SCAN TO RING
                  </div>
                </div>
              </div>
            )}

            {/* STYLE 5: Bike & Scooter Mini Badge */}
            {selectedStyle === 'bike-mini-badge' && (
              <div className="w-[210px] bg-yellow-400 border-[3px] border-neutral-950 rounded-3xl p-3.5 shadow-[5px_5px_0px_#0a0a0a] text-center">
                <div className="font-black text-lg leading-none">WHO PARK</div>
                <div className="text-[9px] font-extrabold mt-0.5">
                  SCAN TO MOVE BIKE
                </div>
                <div className="my-2.5 bg-white border-2 border-neutral-950 rounded-2xl p-2">
                  <img
                    src={qrDataUrl}
                    alt="QR"
                    className="w-36 h-36 mx-auto object-contain"
                  />
                </div>
                <div className="bg-neutral-950 text-yellow-400 font-mono font-black text-xs py-1 px-2 rounded-lg">
                  {formattedPlate}
                </div>
              </div>
            )}

            {/* STYLE 6: Society & Gate Pass Square */}
            {selectedStyle === 'society-resident' && (
              <div className="w-[270px] bg-[#FFFDF2] border-[3px] border-neutral-950 rounded-3xl p-3.5 shadow-[5px_5px_0px_#0a0a0a] text-center">
                <div className="bg-neutral-950 text-yellow-400 font-black text-xs py-1.5 px-2 rounded-xl">
                  RESIDENT PARKING PASS
                </div>
                <div className="my-3 bg-white border-2 border-neutral-950 rounded-2xl p-2.5">
                  <img
                    src={qrDataUrl}
                    alt="QR"
                    className="w-40 h-40 mx-auto object-contain"
                  />
                </div>
                <div className="bg-yellow-400 border-2 border-neutral-950 rounded-xl py-1.5 px-2">
                  <div className="font-mono font-black text-sm">
                    {formattedPlate}
                  </div>
                  <div className="text-[9px] font-extrabold">
                    WHO PARK • PRIVATE ALERT
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={!qrDataUrl || downloading}
          className="w-full py-3.5 px-5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 border-2 border-neutral-950 text-neutral-950 font-black text-sm shadow-[4px_4px_0px_#0a0a0a] transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>⬇️</span>
          <span>{downloading ? 'Preparing HD PNG...' : 'Download High-Res PNG'}</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-neutral-50 active:translate-y-0.5 border-2 border-neutral-950 text-neutral-950 font-extrabold text-sm shadow-[4px_4px_0px_#0a0a0a] transition flex items-center justify-center gap-2"
        >
          <span>🖨️</span>
          <span>Print Sticker</span>
        </button>
      </div>
    </div>
  );
}