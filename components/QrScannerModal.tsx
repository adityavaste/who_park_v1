// src/components/QrScannerModal.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useRouter } from 'next/navigation';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QrScannerModal({ isOpen, onClose }: QrScannerModalProps) {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');

  function handleRedirect(scannedValue: string) {
    const clean = scannedValue.trim();
    const slug = clean.includes('/v/')
      ? clean.split('/v/')[1].split('/')[0].split('?')[0]
      : clean;

    if (!slug) return;
    onClose();
    router.push(`/v/${slug}`);
  }

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const regionId = 'honksafe-gpay-reader';

    async function startCamera() {
      setIsStarting(true);
      setCameraError(null);
      setTorchOn(false);

      try {
        await new Promise((r) => setTimeout(r, 150));
        if (!isMounted) return;

        const html5QrCode = new Html5Qrcode(regionId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            html5QrCode
              .stop()
              .then(() => {
                html5QrCode.clear();
                scannerRef.current = null;
                handleRedirect(decodedText);
              })
              .catch(() => handleRedirect(decodedText));
          },
          () => {}
        );

        if (isMounted) {
          setIsStarting(false);
          // Check if device camera supports flashlight/torch
          try {
            const capabilities = html5QrCode.getRunningTrackCameraCapabilities();
            if (capabilities.torchFeature().isSupported()) {
              setHasTorch(true);
            }
          } catch {
            setHasTorch(false);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setIsStarting(false);
          setCameraError(
            err?.message?.includes('Permission')
              ? 'Camera permission blocked. Allow camera access or upload a QR photo below.'
              : 'Camera unavailable on this device. Upload a QR image or type the sticker code below.'
          );
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {});
      }
    };
  }, [isOpen]);

  // Toggle Flashlight (Torch)
  async function toggleTorch() {
    if (!scannerRef.current) return;
    try {
      const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
      const torch = capabilities.torchFeature();
      const nextState = !torchOn;
      await torch.apply(nextState);
      setTorchOn(nextState);
    } catch (err) {
      console.error('Torch toggle failed:', err);
    }
  }

  // Scan QR from Gallery Image (PhonePe / GPay style)
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Stop live camera first if running
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      const fileScanner = new Html5Qrcode('honksafe-file-reader-hidden');
      const decodedText = await fileScanner.scanFile(file, true);
      fileScanner.clear();
      handleRedirect(decodedText);
    } catch {
      alert('Could not find a valid QR code in that image. Please try another photo.');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col justify-between p-4 sm:p-6 text-white select-none">
      {/* Custom Laser Animation */}
      <style jsx>{`
        @keyframes scanLaser {
          0%, 100% {
            top: 8%;
          }
          50% {
            top: 88%;
          }
        }
        .animate-laser {
          animation: scanLaser 2.2s ease-in-out infinite;
        }
      `}</style>

      {/* Top Bar (Close & Torch) */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pt-2">
        <button
          onClick={onClose}
          className="bg-white hover:bg-yellow-200 text-black font-black text-xs px-4 py-2.5 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#FACC15] transition"
        >
          ✕ CLOSE
        </button>

        <span className="bg-yellow-400 text-black font-black text-xs px-3.5 py-1.5 rounded-full border-2 border-black uppercase tracking-wider">
          🚕 HONKSAFE SCANNER
        </span>

        {hasTorch ? (
          <button
            onClick={toggleTorch}
            className={`font-black text-xs px-3.5 py-2.5 rounded-2xl border-3 border-black transition ${
              torchOn
                ? 'bg-yellow-400 text-black shadow-[0_0_15px_#FACC15]'
                : 'bg-stone-800 text-white border-white/30'
            }`}
          >
            {torchOn ? '🔦 ON' : '🔦 OFF'}
          </button>
        ) : (
          <div className="w-14" />
        )}
      </div>

      {/* Center Viewfinder Area */}
      <div className="max-w-sm w-full mx-auto my-auto flex flex-col items-center">
        <p className="text-center font-black text-yellow-400 text-sm tracking-wide uppercase mb-4">
          Align Car QR Sticker Inside Frame
        </p>

        {/* Viewfinder Box with Yellow Cartoon Corner Brackets */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 bg-stone-950 rounded-3xl overflow-hidden border-4 border-yellow-400 shadow-[0_0_0_4px_#000,0_0_30px_rgba(250,204,21,0.3)] flex items-center justify-center">
          {isStarting && !cameraError && (
            <div className="text-yellow-400 font-black text-xs uppercase tracking-widest animate-pulse text-center px-4">
              ⚡ Starting Camera...
            </div>
          )}

          {cameraError ? (
            <div className="bg-[#FFFDF0] text-black m-4 p-4 rounded-2xl border-3 border-black text-center">
              <div className="text-3xl mb-1">📷</div>
              <p className="text-xs font-black leading-relaxed">{cameraError}</p>
            </div>
          ) : (
            <>
              <div id="honksafe-qr-reader" className="w-full h-full object-cover" />
              {/* Sweeping Yellow Laser Line */}
              {!isStarting && (
                <div className="pointer-events-none absolute left-4 right-4 h-1 bg-yellow-400 rounded-full shadow-[0_0_12px_#FACC15] animate-laser z-10" />
              )}
            </>
          )}

          {/* 4 Bold Corner Accents */}
          <div className="pointer-events-none absolute top-3 left-3 w-7 h-7 border-t-4 border-l-4 border-yellow-400 rounded-tl-xl" />
          <div className="pointer-events-none absolute top-3 right-3 w-7 h-7 border-t-4 border-r-4 border-yellow-400 rounded-tr-xl" />
          <div className="pointer-events-none absolute bottom-3 left-3 w-7 h-7 border-b-4 border-l-4 border-yellow-400 rounded-bl-xl" />
          <div className="pointer-events-none absolute bottom-3 right-3 w-7 h-7 border-b-4 border-r-4 border-yellow-400 rounded-br-xl" />
        </div>

        {/* PhonePe / GPay Style "Upload from Gallery" Pill */}
        <div className="mt-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-white hover:bg-yellow-100 active:translate-y-0.5 text-black font-black text-xs px-5 py-3 rounded-full border-3 border-black shadow-[4px_4px_0px_#FACC15] flex items-center gap-2 transition"
          >
            <span className="text-base">🖼️</span>
            <span>UPLOAD QR FROM GALLERY</span>
          </button>
          <div id="honksafe-file-reader-hidden" className="hidden" />
        </div>
      </div>

      {/* Bottom Manual Sticker Code Bar */}
      <div className="max-w-md w-full mx-auto pb-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRedirect(manualCode);
          }}
          className="bg-[#FFFDF0] p-2 rounded-2xl border-3 border-black shadow-[4px_4px_0px_#FACC15] flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Or enter Sticker ID (e.g. a9b2c3d4)"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm font-black font-mono text-black placeholder:text-stone-500 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs px-4 py-2.5 rounded-xl border-2 border-black transition"
          >
            PING ➔
          </button>
        </form>
      </div>
    </div>
  );
}