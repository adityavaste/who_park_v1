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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const regionId = 'honksafe-qr-reader';

    async function startCamera() {
      setIsStarting(true);
      setCameraError(null);

      try {
        // Small delay to ensure DOM element is mounted
        await new Promise((r) => setTimeout(r, 150));
        if (!isMounted) return;

        const html5QrCode = new Html5Qrcode(regionId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 230, height: 230 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Stop camera immediately upon successful read
            html5QrCode
              .stop()
              .then(() => {
                html5QrCode.clear();
                scannerRef.current = null;
                handleRedirect(decodedText);
              })
              .catch(() => {
                handleRedirect(decodedText);
              });
          },
          () => {
            // Ignore frame-by-frame scan misses
          }
        );

        if (isMounted) setIsStarting(false);
      } catch (err: any) {
        if (isMounted) {
          setIsStarting(false);
          setCameraError(
            err?.message?.includes('Permission')
              ? 'Camera permission denied! Please allow camera access in your browser settings.'
              : 'Could not start camera. Make sure no other app is using it, or enter the sticker code manually.'
          );
        }
      }
    }

    function handleRedirect(scannedValue: string) {
      const clean = scannedValue.trim();
      const slug = clean.includes('/v/')
        ? clean.split('/v/')[1].split('/')[0].split('?')[0]
        : clean;

      onClose();
      router.push(`/v/${slug}`);
    }

    startCamera();

    // Cleanup camera stream when modal closes or unmounts
    return () => {
      isMounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {});
      }
    };
  }, [isOpen, onClose, router]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFDF0] rounded-3xl max-w-sm w-full p-6 border-4 border-black shadow-[10px_10px_0px_#000] relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📸</span>
            <h3 className="text-xl font-black text-black tracking-tight">SCAN STICKER</h3>
          </div>
          <button
            onClick={onClose}
            className="bg-rose-400 hover:bg-rose-300 text-black font-black text-xs px-3 py-1.5 rounded-xl border-3 border-black shadow-[2px_2px_0px_#000]"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Camera Viewport Box */}
        <div className="bg-black rounded-2xl border-4 border-black overflow-hidden shadow-[4px_4px_0px_#000] relative min-h-[270px] flex items-center justify-center">
          {isStarting && !cameraError && (
            <div className="text-yellow-400 font-black text-xs uppercase tracking-widest animate-pulse p-4 text-center">
              ⚡ Waking up camera...
            </div>
          )}

          {cameraError ? (
            <div className="bg-white m-4 p-4 rounded-2xl border-3 border-black text-center">
              <div className="text-3xl mb-1">🚫</div>
              <p className="text-xs font-black text-black leading-relaxed">{cameraError}</p>
            </div>
          ) : (
            <div id="honksafe-qr-reader" className="w-full" />
          )}
        </div>

        {/* Helper Footer */}
        <p className="text-center text-xs font-bold text-stone-600 mt-4">
          Point your camera at the <span className="text-black font-black">HONKSAFE</span> sticker on the car windshield.
        </p>
      </div>
    </div>
  );
}