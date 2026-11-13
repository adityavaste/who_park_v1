// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QrScannerModal from '@/components/QrScannerModal';
import {
  unlockAudio,
  playSingleAlertChime,
  startContinuousRing,
  stopContinuousRing,
} from '@/lib/ringtone';

interface VehicleItem {
  id: string;
  plateNumber: string;
  makeModel: string | null;
  emergencyContact: string | null;
  tagSlug: string;
  tagId: string;
}

interface AlertItem {
  id: string;
  tagId: string;
  alertType: string;
  status: string;
  ownerReply?: string | null;
  createdAt: string;
  plateNumber?: string;
}

const QUICK_REPLIES = [
  '🏃 Coming in 2 mins!',
  '⏳ Wait, I am nearby',
  '🙏 Thanks for alerting!',
];

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function CartoonDashboardPage() {
  const router = useRouter();
  const [vehiclesList, setVehiclesList] = useState<VehicleItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ phone: string; fullName: string | null } | null>(null);

  // PWA Install states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Sound, Push & Steady Ringing States
  const [alertsActivated, setAlertsActivated] = useState(false);
  const [ringingAlert, setRingingAlert] = useState<AlertItem | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const latestAlertIdRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef<boolean>(true);

  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newEmergency, setNewEmergency] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Listen for PWA Install prompt
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  async function handleInstallApp() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert(
        'To install HONKSAFE as an app:\n\n• Android Chrome: Tap the 3-dot menu (⋮) at top-right → "Add to Home screen" or "Install app".\n• iPhone Safari: Tap the Share button (↑) at bottom → "Add to Home Screen".'
      );
    }
  }

  // Register Service Worker & Subscribe to Background Web Push
  async function registerBackgroundPush() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });
    } catch (err) {
      console.error('Background push setup error:', err);
    }
  }

  async function handleEnableAlerts() {
    unlockAudio();
    playSingleAlertChime();
    setAlertsActivated(true);
    await registerBackgroundPush();
  }

  function triggerIncomingAlertRing(newAlert: AlertItem) {
    setRingingAlert(newAlert);
    startContinuousRing();
  }

  function handleStopRingOnly() {
    stopContinuousRing();
    setRingingAlert(null);
  }

  async function handleQuickReply(replyText: string) {
    if (!ringingAlert) return;
    setSendingReply(true);
    stopContinuousRing();

    try {
      await fetch('/api/alerts/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId: ringingAlert.id,
          replyMessage: replyText,
        }),
      });
      setRingingAlert(null);
      loadDashboardData(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSendingReply(false);
    }
  }

  async function loadDashboardData(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/owner/vehicles?t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data.success) {
        setVehiclesList(data.vehicles || []);
        const incomingAlerts: AlertItem[] = data.alerts || [];
        setAlerts(incomingAlerts);
        if (data.user) setUserInfo(data.user);

        if (incomingAlerts.length > 0) {
          const newest = incomingAlerts[0];
          if (isFirstLoadRef.current) {
            latestAlertIdRef.current = newest.id;
            isFirstLoadRef.current = false;
          } else if (latestAlertIdRef.current !== newest.id) {
            latestAlertIdRef.current = newest.id;
            triggerIncomingAlertRing(newest);
          }
        } else {
          isFirstLoadRef.current = false;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      registerBackgroundPush();
    }

    loadDashboardData(false);

    const pollTimer = setInterval(() => {
      loadDashboardData(true);
    }, 3000);

    return () => {
      clearInterval(pollTimer);
      stopContinuousRing();
    };
  }, []);

  async function handleLogout() {
    stopContinuousRing();
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function handleAddVehicle(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/vehicles/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plateNumber: newPlate,
          makeModel: newModel,
          emergencyContact: newEmergency,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        setNewPlate('');
        setNewModel('');
        setNewEmergency('');
        loadDashboardData(false);
      } else {
        alert(data.error || 'Failed to add vehicle');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFFDF0] flex items-center justify-center p-4">
        <div className="bg-yellow-300 border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_#000] font-black text-xl">
          ⚡ LOADING GARAGE...
        </div>
      </main>
    );
  }

  return (
    <main
      onClick={() => {
        if (!alertsActivated && unlockAudio()) {
          setAlertsActivated(true);
        }
      }}
      className="min-h-screen bg-[#FFFDF0] pt-6 pb-32 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto selection:bg-yellow-300"
    >
      {/* Top Navigation Bar */}
      <nav className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-white hover:bg-yellow-100 text-black font-black text-xs px-4 py-2 rounded-xl border-3 border-black shadow-[3px_3px_0px_#000] transition"
        >
          🚕 HONKSAFE HOME
        </Link>

        {userInfo ? (
          <button
            onClick={handleLogout}
            className="bg-rose-400 hover:bg-rose-300 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-black font-black text-xs px-4 py-2 rounded-xl border-3 border-black shadow-[3px_3px_0px_#000] transition"
          >
            LOGOUT 🚪
          </button>
        ) : (
          <Link
            href="/login"
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs px-4 py-2 rounded-xl border-3 border-black shadow-[3px_3px_0px_#000]"
          >
            LOGIN 🔑
          </Link>
        )}
      </nav>

      {/* Background Push, Install App & Ringtone Banner */}
      <div
        className={`mb-6 p-4 rounded-2xl border-4 border-black shadow-[5px_5px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          alertsActivated ? 'bg-emerald-200' : 'bg-yellow-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{alertsActivated ? '🔔' : '📲'}</span>
          <div>
            <p className="text-xs sm:text-sm font-black text-black uppercase">
              {alertsActivated
                ? 'Background Push & Ringtone Active!'
                : 'Enable Background Alerts & Install App'}
            </p>
            <p className="text-[11px] font-bold text-stone-800">
              {alertsActivated
                ? 'You will receive alerts even when the app is closed.'
                : 'Install the app & enable sound to get alerts even when your screen is off.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isInstalled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleInstallApp();
              }}
              className="bg-black hover:bg-stone-800 active:translate-y-0.5 text-yellow-400 font-black text-xs px-4 py-2.5 rounded-xl border-3 border-black shadow-[3px_3px_0px_#fff] whitespace-nowrap transition"
            >
              📲 INSTALL APP
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleEnableAlerts();
            }}
            className="bg-white hover:bg-yellow-50 active:translate-y-0.5 text-black font-black text-xs px-4 py-2.5 rounded-xl border-3 border-black shadow-[3px_3px_0px_#000] whitespace-nowrap transition"
          >
            {alertsActivated ? '🔊 TEST RING' : '🔔 ENABLE ALERTS'}
          </button>
        </div>
      </div>

      {/* Dashboard Header Box */}
      <header className="bg-white border-4 border-black p-6 rounded-3xl shadow-[8px_8px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-block bg-yellow-400 text-black border-2 border-black text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2">
            Garage Headquarters
          </div>
          <h1 className="text-3xl font-black text-black tracking-tight">
            {userInfo?.fullName ? `${userInfo.fullName.toUpperCase()}'S GARAGE` : 'MY CAR FLEET'}
          </h1>
          <p className="text-xs font-bold text-stone-600 mt-1">
            Driver ID:{' '}
            <span className="font-mono font-black bg-yellow-100 px-2 py-0.5 rounded border border-black text-black">
              {userInfo?.phone}
            </span>
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-300 active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-black text-sm px-6 py-3.5 rounded-2xl border-4 border-black shadow-[5px_5px_0px_#000] transition-all"
        >
          + ADD NEW CAR 🚗
        </button>
      </header>

      {/* Vehicles & QR Stickers */}
      <section className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🏷️</span>
          <h2 className="text-xl font-black text-black">MY QR STICKERS</h2>
        </div>

        {vehiclesList.length === 0 ? (
          <div className="bg-white border-4 border-dashed border-black rounded-3xl p-10 text-center shadow-[6px_6px_0px_#000]">
            <div className="text-6xl mb-3">📦</div>
            <p className="text-lg font-black text-black">NO CARS IN YOUR GARAGE!</p>
            <p className="text-stone-500 font-bold text-xs mt-1">
              Add a vehicle to generate your custom cartoon QR sticker.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-block bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs px-5 py-3 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#000]"
            >
              REGISTER FIRST CAR ➔
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vehiclesList.map((veh) => (
              <div
                key={veh.id}
                className="bg-white rounded-3xl border-4 border-black shadow-[8px_8px_0px_#000] p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-yellow-300 text-black text-xs font-black px-3 py-1 rounded-full border-2 border-black uppercase">
                      ● ACTIVE
                    </span>
                    <span className="font-mono text-xs font-black text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded border-2 border-black">
                      /{veh.tagSlug}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-black tracking-wide font-mono">
                    {veh.plateNumber}
                  </h3>
                  <p className="text-xs font-black text-stone-600 uppercase mt-0.5">
                    🚘 {veh.makeModel || 'Vehicle'}
                  </p>

                  <div className="mt-5 bg-yellow-100 border-3 border-black p-4 rounded-2xl flex items-center gap-4 shadow-[4px_4px_0px_#000]">
                    <div className="bg-white p-2 rounded-xl border-2 border-black flex-shrink-0">
                      <img
                        src={`/api/qr/image/${veh.tagSlug}`}
                        alt="QR Code"
                        className="w-20 h-20 object-contain"
                      />
                    </div>
                    <div className="text-xs">
                      <p className="font-black text-black text-sm uppercase">Scan to Alert</p>
                      <p className="font-bold text-stone-700 mt-1 leading-snug">
                        Stick on windshield. Anyone can ping you privately!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <Link
                    href={`/dashboard/sticker/${veh.tagSlug}`}
                    className="flex-1 text-center bg-yellow-400 hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-black font-black text-xs py-3.5 px-3 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#000] transition"
                  >
                    🖨️ PRINT STICKER CARD
                  </Link>
                  <a
                    href={`/api/qr/image/${veh.tagSlug}`}
                    download={`${veh.plateNumber}-QR.png`}
                    className="bg-white hover:bg-stone-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-black font-black text-xs py-3.5 px-3.5 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#000] transition"
                    title="Download Raw QR PNG"
                  >
                    💾 PNG
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alert Logs */}
      <section className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h2 className="text-xl font-black text-black">MY ALERTS & HONKS LOG</h2>
          </div>
          <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 border-2 border-black px-2.5 py-0.5 rounded-full">
            ● LIVE
          </span>
        </div>

        <div className="bg-white rounded-3xl border-4 border-black shadow-[8px_8px_0px_#000] overflow-hidden">
          {alerts.length === 0 ? (
            <div className="p-8 text-center font-bold text-stone-500 text-sm">
              No alerts yet! Your cars are parked peacefully. 😴
            </div>
          ) : (
            <div className="divide-y-3 divide-black">
              {alerts.map((al) => (
                <div
                  key={al.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-yellow-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {al.alertType === 'OBSTRUCTION' && '🚗'}
                      {al.alertType === 'HEADLIGHTS' && '💡'}
                      {al.alertType === 'EMERGENCY' && '🚨'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {al.plateNumber && (
                          <span className="font-mono text-xs font-black bg-yellow-300 px-2 py-0.5 rounded border border-black text-black">
                            {al.plateNumber}
                          </span>
                        )}
                        <p className="font-black text-black text-sm">
                          {al.alertType === 'OBSTRUCTION' && 'CAR BLOCKING PATH!'}
                          {al.alertType === 'HEADLIGHTS' && 'LIGHTS OR WINDOW OPEN'}
                          {al.alertType === 'EMERGENCY' && 'EMERGENCY / TOW ALERT!'}
                          {!['OBSTRUCTION', 'HEADLIGHTS', 'EMERGENCY'].includes(al.alertType) && al.alertType}
                        </p>
                      </div>
                      {al.ownerReply && (
                        <p className="text-xs font-black text-emerald-700 mt-1">
                          ↪ Your Reply: &ldquo;{al.ownerReply}&rdquo;
                        </p>
                      )}
                      <p className="text-xs font-bold text-stone-500 font-mono mt-0.5">
                        {new Date(al.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="inline-block self-start sm:self-auto bg-yellow-300 text-black text-xs font-black px-3 py-1 rounded-full border-2 border-black">
                    {al.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* PhonePe / GPay Style Floating Bottom Scan Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => setIsScannerOpen(true)}
          className="bg-yellow-400 hover:bg-yellow-300 active:translate-y-1 active:shadow-none text-black font-black text-sm sm:text-base px-7 py-4 rounded-full border-4 border-black shadow-[0_8px_0px_#000] flex items-center gap-3 transition-all whitespace-nowrap"
        >
          <span className="bg-black text-yellow-400 w-9 h-9 rounded-full flex items-center justify-center text-lg">
            📸
          </span>
          <span>SCAN ANY CAR QR</span>
        </button>
      </div>

      {/* STEADY (NON-BOUNCING) INCOMING ALERT POPUP WITH QUICK REPLIES */}
      {ringingAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-yellow-400 rounded-3xl max-w-sm w-full p-6 sm:p-7 border-4 border-black shadow-[10px_10px_0px_#fff] text-center">
            <div className="w-16 h-16 bg-white border-4 border-black rounded-full flex items-center justify-center text-3xl mx-auto shadow-[4px_4px_0px_#000] animate-pulse">
              🚨
            </div>

            <div className="inline-block bg-black text-yellow-400 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest mt-3">
              INCOMING VEHICLE PING!
            </div>

            {ringingAlert.plateNumber && (
              <div className="mt-2.5 bg-white border-3 border-black rounded-2xl py-2 px-4 font-mono font-black text-2xl text-black tracking-widest">
                {ringingAlert.plateNumber}
              </div>
            )}

            <h3 className="text-lg font-black text-black mt-3 uppercase leading-snug">
              {ringingAlert.alertType === 'OBSTRUCTION' && '🚗 YOUR CAR IS BLOCKING SOMEONE!'}
              {ringingAlert.alertType === 'HEADLIGHTS' && '💡 HEADLIGHTS OR WINDOW OPEN!'}
              {ringingAlert.alertType === 'EMERGENCY' && '🚨 URGENT TOW / EMERGENCY!'}
            </h3>

            {/* Quick Reply Buttons to Send Directly to Scanner */}
            <div className="mt-5 text-left">
              <p className="text-[11px] font-black text-black uppercase tracking-wider mb-2 text-center">
                Tap a Quick Reply to Send & Stop Ring:
              </p>
              <div className="space-y-2">
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply}
                    disabled={sendingReply}
                    onClick={() => handleQuickReply(reply)}
                    className="w-full bg-white hover:bg-yellow-100 active:translate-y-0.5 text-black font-black text-xs sm:text-sm py-3 px-4 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#000] transition flex items-center justify-between"
                  >
                    <span>{reply}</span>
                    <span>➔</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dismiss / Stop Ring Button */}
            <button
              onClick={handleStopRingOnly}
              className="mt-4 w-full bg-rose-500 hover:bg-rose-400 active:translate-y-0.5 text-white font-black text-xs py-3.5 px-5 rounded-2xl border-3 border-black shadow-[4px_4px_0px_#000] transition"
            >
              🔕 STOP RING ONLY
            </button>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF0] rounded-3xl max-w-md w-full p-6 sm:p-8 border-4 border-black shadow-[10px_10px_0px_#000]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-2xl font-black text-black">REGISTER CAR</h3>
              <span className="text-3xl">🚘</span>
            </div>
            <p className="text-xs font-bold text-stone-600 mb-6">
              We will stamp a unique private QR code for your windshield.
            </p>

            <form onSubmit={handleAddVehicle} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-black uppercase mb-1">
                  License Plate *
                </label>
                <input
                  type="text"
                  required
                  placeholder="MH 12 AB 1234"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value)}
                  className="w-full bg-white text-black placeholder:text-stone-400 border-3 border-black rounded-2xl px-4 py-3 text-sm font-black font-mono shadow-[3px_3px_0px_#000] focus:outline-none focus:bg-yellow-50"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black uppercase mb-1">
                  Make & Model
                </label>
                <input
                  type="text"
                  placeholder="Tata Zest, Hyundai Creta"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  className="w-full bg-white text-black placeholder:text-stone-400 border-3 border-black rounded-2xl px-4 py-3 text-sm font-bold shadow-[3px_3px_0px_#000] focus:outline-none focus:bg-yellow-50"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-black uppercase mb-1">
                  Emergency Contact
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 00000"
                  value={newEmergency}
                  onChange={(e) => setNewEmergency(e.target.value)}
                  className="w-full bg-white text-black placeholder:text-stone-400 border-3 border-black rounded-2xl px-4 py-3 text-sm font-bold shadow-[3px_3px_0px_#000] focus:outline-none focus:bg-yellow-50"
                />
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-white hover:bg-stone-100 text-black font-black py-3 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#000] text-sm transition"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-black py-3 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#000] text-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'STAMPING...' : 'CREATE QR 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen PhonePe / GPay Style QR Scanner */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </main>
  );
}