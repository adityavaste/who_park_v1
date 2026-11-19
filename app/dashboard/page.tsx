// app/dashboard/page.tsx
'use client';

import {
  enableCellphoneEarpiece,
  enableLoudspeaker,
  resetCallAudioRoute,
} from '@/lib/audioRoute';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import QrScannerModal from '@/components/QrScannerModal';
import { createReceiverConnection } from '@/lib/webrtcCall';
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

interface IncomingCallItem {
  id: string;
  plateNumber: string;
  offerSdp: string;
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

export default function DashboardPage() {
  const router = useRouter();
  const [appOrigin, setAppOrigin] = useState<string>('https://whopark.in');
  const [vehiclesList, setVehiclesList] = useState<VehicleItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<{ phone: string; fullName: string | null } | null>(null);

  // Anonymous WebRTC Call States & Refs
  const [incomingCall, setIncomingCall] = useState<IncomingCallItem | null>(null);
  const [ownerCallStatus, setOwnerCallStatus] = useState<'IDLE' | 'RINGING' | 'CONNECTED'>('IDLE');
  const [ownerMuted, setOwnerMuted] = useState(false);
  const [ownerSpeakerOn, setOwnerSpeakerOn] = useState(false);
  const [ownerCallSecondsLeft, setOwnerCallSecondsLeft] = useState(180);

  const ownerCallStatusRef = useRef<'IDLE' | 'RINGING' | 'CONNECTED'>('IDLE');
  const incomingCallRef = useRef<IncomingCallItem | null>(null);
  const ownerPcRef = useRef<RTCPeerConnection | null>(null);
  const ownerStreamRef = useRef<MediaStream | null>(null);
  const ownerAudioRef = useRef<HTMLAudioElement | null>(null);

  // PWA Install States
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

  function getAuthHeaders(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('whopark_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function updateCallState(
    status: 'IDLE' | 'RINGING' | 'CONNECTED',
    call: IncomingCallItem | null
  ) {
    ownerCallStatusRef.current = status;
    incomingCallRef.current = call;
    setOwnerCallStatus(status);
    setIncomingCall(call);
  }

  function cleanupOwnerCall() {
    stopContinuousRing();
    resetCallAudioRoute();
    if (ownerStreamRef.current) {
      ownerStreamRef.current.getTracks().forEach((t) => t.stop());
      ownerStreamRef.current = null;
    }
    if (ownerPcRef.current) {
      ownerPcRef.current.close();
      ownerPcRef.current = null;
    }
    updateCallState('IDLE', null);
    setOwnerMuted(false);
    setOwnerSpeakerOn(false);
    setOwnerCallSecondsLeft(180);
  }

  async function handleAnswerIncomingCall() {
    const activeCall = incomingCallRef.current;
    if (!activeCall) return;
    stopContinuousRing();
    try {
      const parsedOffer = JSON.parse(activeCall.offerSdp);
      const { pc, localStream, answerSdp } = await createReceiverConnection(
        parsedOffer,
        (remoteStream) => {
          if (ownerAudioRef.current) {
            ownerAudioRef.current.srcObject = remoteStream;
            ownerAudioRef.current.play().catch(() => {});
          }
        }
      );

      ownerPcRef.current = pc;
      ownerStreamRef.current = localStream;

      await fetch(`/api/calls/${activeCall.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ status: 'CONNECTED', answerSdp }),
      });

      await enableCellphoneEarpiece();
      setOwnerSpeakerOn(false);
      setOwnerCallSecondsLeft(180);
      updateCallState('CONNECTED', activeCall);
    } catch (err: any) {
      alert('Could not answer call: ' + (err?.message || 'Microphone error'));
      cleanupOwnerCall();
    }
  }

  async function handleRejectOrEndOwnerCall() {
    const callId = incomingCallRef.current?.id;
    cleanupOwnerCall();
    if (callId) {
      await fetch(`/api/calls/${callId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ status: 'ENDED' }),
      }).catch(() => {});
    }
  }

  async function toggleOwnerSpeakerMode() {
    if (ownerSpeakerOn) {
      await enableCellphoneEarpiece();
      setOwnerSpeakerOn(false);
    } else {
      await enableLoudspeaker();
      setOwnerSpeakerOn(true);
    }
  }

  // 3-minute (180s) hard cutoff & live countdown on owner's side
  useEffect(() => {
    if (ownerCallStatus !== 'CONNECTED') {
      setOwnerCallSecondsLeft(180);
      return;
    }

    const interval = setInterval(() => {
      setOwnerCallSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleRejectOrEndOwnerCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [ownerCallStatus]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppOrigin(window.location.origin);
      if (
        Capacitor.isNativePlatform() ||
        window.matchMedia('(display-mode: standalone)').matches
      ) {
        setIsInstalled(true);
      }
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
        'To install WHO PARK as an app:\n\nAndroid Chrome: Tap the 3-dot menu (⋮) at top-right → "Add to Home screen" or "Install app".\n\niPhone Safari: Tap the Share button (↑) at bottom → "Add to Home Screen".'
      );
    }
  }

  async function registerNativeAndroidPush(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== 'granted') return false;

      await PushNotifications.createChannel({
        id: 'whopark_urgent',
        name: 'WHO PARK Urgent Vehicle Alerts',
        description: 'Immediate alerts when someone scans your parked car QR',
        importance: 5,
        visibility: 1,
        lights: true,
        vibration: true,
      });

      await PushNotifications.removeAllListeners();

      await PushNotifications.addListener('registration', async (token) => {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ fcmToken: token.value }),
        });
        setAlertsActivated(true);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', () => {
        loadDashboardData(false);
      });

      await PushNotifications.register();
      return true;
    } catch (err) {
      console.error('Native FCM setup error:', err);
      return false;
    }
  }

  async function registerBackgroundPush(forceRefresh = false): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      return await registerNativeAndroidPush();
    }

    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      if (forceRefresh) {
        alert('Background push is not supported in this browser. On iPhone, tap Share → Add to Home Screen first.');
      }
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        if (forceRefresh) {
          alert('Please allow Notifications in your browser/phone settings to receive background alerts.');
        }
        return false;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        if (forceRefresh) {
          alert('NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing in Vercel Environment Variables!');
        }
        return false;
      }

      let subscription = await registration.pushManager.getSubscription();

      if (subscription && forceRefresh) {
        await subscription.unsubscribe().catch(() => {});
        subscription = null;
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const subRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ subscription }),
      });

      const subData = await subRes.json();
      if (!subRes.ok) {
        if (forceRefresh) {
          alert('Failed to save push subscription: ' + (subData.error || 'Unknown error'));
        }
        return false;
      }

      return true;
    } catch (err: any) {
      console.error('Background push setup error:', err);
      if (forceRefresh) {
        alert('Push setup error: ' + (err?.message || 'Check HTTPS & browser permissions'));
      }
      return false;
    }
  }

  async function handleEnableAlerts() {
    unlockAudio();
    playSingleAlertChime();
    const ok = await registerBackgroundPush(true);
    if (ok) {
      setAlertsActivated(true);
      const testRes = await fetch('/api/push/test', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const testData = await testRes.json();
      if (!testRes.ok || testData?.result?.sent === 0) {
        alert('Push diagnostic: ' + JSON.stringify(testData));
      }
    }
  }

  function triggerIncomingAlertRing(newAlert: AlertItem) {
    setRingingAlert(newAlert);
    startContinuousRing();
  }

  function handleStopRingOnly() {
    if (ringingAlert && typeof window !== 'undefined') {
      localStorage.setItem(`whopark_dismissed_${ringingAlert.id}`, '1');
    }
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
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const authHeaders = getAuthHeaders();

    try {
      // 1. Check incoming calls in background (non-blocking so it never freezes dashboard load)
      if (ownerCallStatusRef.current === 'IDLE') {
        fetch(`/api/calls?t=${Date.now()}`, {
          credentials: 'include',
          cache: 'no-store',
          headers: authHeaders,
        })
          .then((r) => r.json())
          .then((callData) => {
            if (callData?.success && callData?.incomingCall) {
              updateCallState('RINGING', callData.incomingCall);
              startContinuousRing();
            }
          })
          .catch(() => {});
      } else if (incomingCallRef.current) {
        fetch(`/api/calls/${incomingCallRef.current.id}?t=${Date.now()}`, {
          credentials: 'include',
          cache: 'no-store',
          headers: authHeaders,
        })
          .then((r) => r.json())
          .then((statusData) => {
            if (statusData?.status === 'ENDED') {
              cleanupOwnerCall();
            }
          })
          .catch(() => {});
      }

      // 2. Fetch owner vehicles & alerts immediately with 8s timeout + token fallback
      const res = await fetch(`/api/owner/vehicles?t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
        headers: authHeaders,
      });

      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('whopark_token');
          window.location.replace('/login');
        } else {
          router.replace('/login');
        }
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
          const ageMs = Date.now() - new Date(newest.createdAt).getTime();
          const isRecentUnreplied = ageMs < 5 * 60 * 1000 && !newest.ownerReply;
          const alreadyDismissed =
            typeof window !== 'undefined' &&
            localStorage.getItem(`whopark_dismissed_${newest.id}`) === '1';

          if (isFirstLoadRef.current) {
            latestAlertIdRef.current = newest.id;
            isFirstLoadRef.current = false;
            if (isRecentUnreplied && !alreadyDismissed) {
              triggerIncomingAlertRing(newest);
            }
          } else if (latestAlertIdRef.current !== newest.id) {
            latestAlertIdRef.current = newest.id;
            if (!alreadyDismissed) {
              triggerIncomingAlertRing(newest);
            }
          }
        } else {
          isFirstLoadRef.current = false;
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Dashboard load error:', err);
      }
    } finally {
      clearTimeout(timeoutId);
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      registerNativeAndroidPush();
    } else if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      setAlertsActivated(true);
      registerBackgroundPush(false);
    }

    loadDashboardData(false);

    const pollTimer = setInterval(() => {
      loadDashboardData(true);
    }, 3000);

    return () => {
      clearInterval(pollTimer);
      cleanupOwnerCall();
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
    } catch {}

    if (typeof window !== 'undefined') {
      localStorage.removeItem('whopark_token');
      sessionStorage.setItem('just_logged_out', '1');
      window.location.href = '/';
    }
  }

  async function handleAddVehicle(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/vehicles/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
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
      <main className="min-h-screen bg-[#FFFDF2] flex items-center justify-center p-4">
        <div className="bg-white border-2 border-neutral-950 px-6 py-4 rounded-2xl shadow-[4px_4px_0px_#0a0a0a] flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-yellow-400 animate-ping" />
          <span className="font-black text-base text-neutral-950">Loading Garage...</span>
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
      className="min-h-screen bg-[#FFFDF2] text-neutral-950 pt-5 pb-32 px-4 sm:px-6 lg:px-8 selection:bg-yellow-300"
    >
      <div className="max-w-4xl mx-auto">
        {/* Clean Top Header Bar */}
        <nav className="flex items-center justify-between bg-white border-2 border-neutral-950 px-4 py-3 rounded-2xl shadow-[4px_4px_0px_#0a0a0a] mb-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-yellow-400 border-2 border-neutral-950 flex items-center justify-center font-black text-base">
              W
            </div>
            <span className="font-black text-lg tracking-tight">
              WHO<span className="text-yellow-500">PARK</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {userInfo ? (
              <button
                onClick={handleLogout}
                className="bg-white hover:bg-neutral-100 active:translate-y-0.5 text-neutral-950 font-bold text-xs px-3.5 py-2 rounded-xl border-2 border-neutral-950 shadow-[2px_2px_0px_#0a0a0a] transition"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/"
                className="bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-bold text-xs px-4 py-2 rounded-xl border-2 border-neutral-950 shadow-[2px_2px_0px_#0a0a0a]"
              >
                Login
              </Link>
            )}
          </div>
        </nav>

        {/* Compact Alert & App Status Strip */}
        <div
          className={`mb-6 px-4 py-3.5 rounded-2xl border-2 border-neutral-950 shadow-[4px_4px_0px_#0a0a0a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            alertsActivated ? 'bg-white' : 'bg-yellow-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-9 h-9 rounded-xl border-2 border-neutral-950 flex items-center justify-center text-lg shrink-0 ${
                alertsActivated ? 'bg-yellow-400' : 'bg-white'
              }`}
            >
              {alertsActivated ? '🔔' : '📲'}
            </span>
            <div>
              <p className="text-xs sm:text-sm font-black text-neutral-950">
                {alertsActivated
                  ? 'Instant Ring & Push Alerts Active'
                  : 'Turn On Background Ring & Push Alerts'}
              </p>
              <p className="text-xs text-neutral-600 font-medium">
                {alertsActivated
                  ? 'Your phone will ring even when the app is closed.'
                  : 'Enable notifications so you never miss a vehicle alert.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isInstalled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInstallApp();
                }}
                className="bg-neutral-950 hover:bg-neutral-800 text-yellow-400 font-bold text-xs px-3.5 py-2 rounded-xl transition"
              >
                Install App
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEnableAlerts();
              }}
              className="bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 text-neutral-950 font-bold text-xs px-3.5 py-2 rounded-xl border-2 border-neutral-950 shadow-[2px_2px_0px_#0a0a0a] transition"
            >
              {alertsActivated ? 'Test Ring' : 'Enable Alerts'}
            </button>
          </div>
        </div>

        {/* Driver Profile & Quick Stats Card */}
        <header className="bg-white border-2 border-neutral-950 p-5 sm:p-6 rounded-3xl shadow-[6px_6px_0px_#0a0a0a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-yellow-400 border border-neutral-950 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                Owner Garage
              </span>
              <span className="text-xs font-mono font-bold text-neutral-500">
                {userInfo?.phone}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950">
              {userInfo?.fullName ? `${userInfo.fullName}'s Vehicles` : 'My Vehicles'}
            </h1>
            <p className="text-xs text-neutral-500 font-medium mt-1">
              {vehiclesList.length} {vehiclesList.length === 1 ? 'vehicle' : 'vehicles'} active •{' '}
              {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'} in last 24h
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 text-neutral-950 font-black text-sm px-5 py-3 rounded-2xl border-2 border-neutral-950 shadow-[4px_4px_0px_#0a0a0a] transition"
          >
            + Add Vehicle
          </button>
        </header>

        {/* Vehicles & QR Stickers */}
        <section className="mt-9">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-lg font-black text-neutral-950">My QR Stickers</h2>
            <span className="text-xs font-bold text-neutral-500">
              Tap Print for windshield card
            </span>
          </div>

          {vehiclesList.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-neutral-950 rounded-3xl p-9 text-center shadow-[4px_4px_0px_#0a0a0a]">
              <div className="w-12 h-12 rounded-2xl bg-yellow-300 border-2 border-neutral-950 flex items-center justify-center text-2xl mx-auto mb-3">
                🚘
              </div>
              <p className="text-base font-black text-neutral-950">No vehicles registered yet</p>
              <p className="text-neutral-500 font-medium text-xs mt-1 max-w-xs mx-auto">
                Add your car or bike plate number to generate your private windshield QR sticker.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-block bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-bold text-xs px-5 py-2.5 rounded-xl border-2 border-neutral-950 shadow-[3px_3px_0px_#0a0a0a]"
              >
                + Register First Vehicle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {vehiclesList.map((veh) => (
                <div
                  key={veh.id}
                  className="bg-white rounded-3xl border-2 border-neutral-950 shadow-[6px_6px_0px_#0a0a0a] p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 bg-yellow-300 text-neutral-950 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-neutral-950">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Active Sticker
                      </span>
                      <span className="font-mono text-xs font-bold text-neutral-500">
                        /{veh.tagSlug}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 bg-[#FFFDF2] border-2 border-neutral-950 p-3.5 rounded-2xl">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-neutral-950 tracking-wider font-mono">
                          {veh.plateNumber}
                        </h3>
                        <p className="text-xs font-semibold text-neutral-600 mt-0.5">
                          {veh.makeModel || 'Registered Vehicle'}
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-2">
                          Scan to alert owner privately
                        </p>
                      </div>

                      <div className="bg-white p-2 rounded-xl border-2 border-neutral-950 shrink-0 shadow-[2px_2px_0px_#0a0a0a]">
                        <img
                          src={`/api/qr/image/${veh.tagSlug}?origin=${encodeURIComponent(appOrigin)}`}
                          alt={`QR Code for ${veh.plateNumber}`}
                          className="w-20 h-20 object-contain"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2.5">
                    <Link
                      href={`/dashboard/sticker/${veh.tagSlug}`}
                      className="flex-1 text-center bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 text-neutral-950 font-bold text-xs py-3 px-3 rounded-xl border-2 border-neutral-950 shadow-[3px_3px_0px_#0a0a0a] transition"
                    >
                      Print Sticker Card
                    </Link>
                    <a
                      href={`/api/qr/image/${veh.tagSlug}?origin=${encodeURIComponent(appOrigin)}`}
                      download={`${veh.plateNumber}-QR.png`}
                      className="bg-white hover:bg-neutral-50 active:translate-y-0.5 text-neutral-950 font-bold text-xs py-3 px-3.5 rounded-xl border-2 border-neutral-950 shadow-[3px_3px_0px_#0a0a0a] transition"
                      title="Download Raw QR PNG"
                    >
                      PNG
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Alerts (Last 24 Hours) */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-lg font-black text-neutral-950">Recent Alerts</h2>
              <p className="text-xs text-neutral-500 font-medium">
                Showing alerts from the last 24 hours
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-neutral-950 bg-yellow-300 border border-neutral-950 px-2.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live
            </span>
          </div>

          <div className="bg-white rounded-3xl border-2 border-neutral-950 shadow-[6px_6px_0px_#0a0a0a] overflow-hidden">
            {alerts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-bold text-neutral-700 text-sm">No alerts in the last 24 hours</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Your vehicles are parked peacefully.
                </p>
              </div>
            ) : (
              <div className="divide-y-2 divide-neutral-200">
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-yellow-50/60 transition"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-yellow-100 border border-neutral-950 flex items-center justify-center text-xl shrink-0">
                        {al.alertType === 'OBSTRUCTION' && '🚗'}
                        {al.alertType === 'HEADLIGHTS' && '💡'}
                        {al.alertType === 'EMERGENCY' && '🚨'}
                        {!['OBSTRUCTION', 'HEADLIGHTS', 'EMERGENCY'].includes(al.alertType) && '🔔'}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {al.plateNumber && (
                            <span className="font-mono text-xs font-black bg-yellow-400 px-2 py-0.5 rounded border border-neutral-950 text-neutral-950">
                              {al.plateNumber}
                            </span>
                          )}
                          <p className="font-bold text-neutral-950 text-sm">
                            {al.alertType === 'OBSTRUCTION' && 'Car blocking path'}
                            {al.alertType === 'HEADLIGHTS' && 'Headlights or window open'}
                            {al.alertType === 'EMERGENCY' && 'Urgent tow / emergency'}
                            {!['OBSTRUCTION', 'HEADLIGHTS', 'EMERGENCY'].includes(al.alertType) &&
                              al.alertType}
                          </p>
                        </div>
                        {al.ownerReply && (
                          <p className="text-xs font-bold text-emerald-700 mt-1">
                            Replied: &ldquo;{al.ownerReply}&rdquo;
                          </p>
                        )}
                        <p className="text-[11px] font-medium text-neutral-500 mt-0.5">
                          {new Date(al.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                    </div>

                    <span className="inline-block self-start sm:self-auto bg-neutral-100 text-neutral-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-neutral-300">
                      {al.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Floating Bottom Scan Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => setIsScannerOpen(true)}
          className="bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 text-neutral-950 font-black text-sm px-6 py-3.5 rounded-full border-2 border-neutral-950 shadow-[0_6px_0px_#0a0a0a] flex items-center gap-2.5 transition whitespace-nowrap"
        >
          <span className="bg-neutral-950 text-yellow-400 w-8 h-8 rounded-full flex items-center justify-center text-base">
            📷
          </span>
          <span>Scan Car QR</span>
        </button>
      </div>

      {/* Incoming Alert Ring Modal with Quick Replies */}
      {ringingAlert && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border-2 border-neutral-950 shadow-[8px_8px_0px_#facc15] text-center">
            <div className="w-14 h-14 bg-yellow-400 border-2 border-neutral-950 rounded-2xl flex items-center justify-center text-3xl mx-auto animate-pulse">
              🚨
            </div>

            <span className="inline-block bg-neutral-950 text-yellow-400 text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider mt-3">
              Incoming Vehicle Alert
            </span>

            {ringingAlert.plateNumber && (
              <div className="mt-2.5 bg-[#FFFDF2] border-2 border-neutral-950 rounded-xl py-1.5 px-4 font-mono font-black text-xl text-neutral-950 tracking-widest">
                {ringingAlert.plateNumber}
              </div>
            )}

            <h3 className="text-base font-black text-neutral-950 mt-3">
              {ringingAlert.alertType === 'OBSTRUCTION' && 'Your car is blocking someone!'}
              {ringingAlert.alertType === 'HEADLIGHTS' && 'Headlights or window left open!'}
              {ringingAlert.alertType === 'EMERGENCY' && 'Urgent tow / emergency alert!'}
            </h3>

            <div className="mt-4 text-left">
              <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 text-center">
                Tap a quick reply to respond & stop ring
              </p>
              <div className="space-y-2">
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply}
                    disabled={sendingReply}
                    onClick={() => handleQuickReply(reply)}
                    className="w-full bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 text-neutral-950 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl border-2 border-neutral-950 shadow-[2px_2px_0px_#0a0a0a] transition flex items-center justify-between"
                  >
                    <span>{reply}</span>
                    <span>→</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStopRingOnly}
              className="mt-4 w-full bg-white hover:bg-neutral-100 text-neutral-700 font-bold text-xs py-2.5 px-4 rounded-xl border-2 border-neutral-300 transition"
            >
              Stop Ring Only
            </button>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border-2 border-neutral-950 shadow-[8px_8px_0px_#0a0a0a]">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xl font-black text-neutral-950">Add Vehicle</h3>
              <span className="w-9 h-9 rounded-xl bg-yellow-400 border-2 border-neutral-950 flex items-center justify-center text-lg">
                🚘
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-medium mb-5">
              Generate a unique private QR sticker for your windshield.
            </p>

            <form onSubmit={handleAddVehicle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  License Plate *
                </label>
                <input
                  type="text"
                  required
                  placeholder="MH 12 AB 1234"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                  className="w-full bg-white text-neutral-950 placeholder:text-neutral-400 border-2 border-neutral-950 rounded-xl px-3.5 py-2.5 text-sm font-black font-mono focus:outline-none focus:bg-yellow-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Make & Model
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tata Zest, Hyundai Creta"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  className="w-full bg-white text-neutral-950 placeholder:text-neutral-400 border-2 border-neutral-300 focus:border-neutral-950 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Emergency Contact (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 00000"
                  value={newEmergency}
                  onChange={(e) => setNewEmergency(e.target.value)}
                  className="w-full bg-white text-neutral-950 placeholder:text-neutral-400 border-2 border-neutral-300 focus:border-neutral-950 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-white hover:bg-neutral-100 text-neutral-950 font-bold py-3 rounded-xl border-2 border-neutral-950 text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-black py-3 rounded-xl border-2 border-neutral-950 shadow-[3px_3px_0px_#0a0a0a] text-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create QR Sticker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen QR Scanner */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />

      {/* Hidden Remote Audio Player for Anonymous Voice Calls */}
      <audio ref={ownerAudioRef} autoPlay playsInline />

      {/* Incoming / Connected Anonymous Voice Call Modal */}
      {incomingCall && ownerCallStatus !== 'IDLE' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border-2 border-neutral-950 shadow-[8px_8px_0px_#facc15] text-center">
            <div className="w-16 h-16 bg-yellow-400 border-2 border-neutral-950 rounded-full flex items-center justify-center text-3xl mx-auto animate-pulse">
              📞
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mt-3">
              {ownerCallStatus === 'RINGING'
                ? 'Incoming Private Call'
                : '● Private Call Connected'}
            </p>
            <h3 className="text-2xl font-black font-mono mt-1 text-neutral-950">
              {incomingCall.plateNumber}
            </h3>

            {ownerCallStatus === 'CONNECTED' && (
              <div className="mt-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full font-mono font-black text-xs border-2 border-neutral-950 ${
                    ownerCallSecondsLeft <= 30
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-yellow-400 text-neutral-950'
                  }`}
                >
                  ⏱️ {String(Math.floor(ownerCallSecondsLeft / 60)).padStart(2, '0')}:
                  {String(ownerCallSecondsLeft % 60).padStart(2, '0')} left (3m max)
                </span>
              </div>
            )}

            <p className="text-xs font-medium text-neutral-500 mt-1.5">
              Caller&apos;s phone number is hidden for privacy.
            </p>

            <div className="mt-5 flex items-center gap-2">
              {ownerCallStatus === 'RINGING' ? (
                <button
                  type="button"
                  onClick={handleAnswerIncomingCall}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-black text-xs py-3.5 rounded-xl border-2 border-neutral-950 shadow-[3px_3px_0px_#0a0a0a]"
                >
                  Answer Call
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (!ownerStreamRef.current) return;
                      const next = !ownerMuted;
                      ownerStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
                      setOwnerMuted(next);
                    }}
                    className="flex-1 bg-white text-neutral-950 font-bold text-xs py-3.5 rounded-xl border-2 border-neutral-950 shadow-[3px_3px_0px_#0a0a0a]"
                  >
                    {ownerMuted ? 'Unmute' : 'Mute'}
                  </button>

                  <button
                    type="button"
                    onClick={toggleOwnerSpeakerMode}
                    className={`flex-1 font-bold text-xs py-3.5 rounded-xl border-2 border-neutral-950 shadow-[3px_3px_0px_#0a0a0a] ${
                      ownerSpeakerOn ? 'bg-yellow-400 text-neutral-950' : 'bg-white text-neutral-950'
                    }`}
                  >
                    {ownerSpeakerOn ? '🔊 Speaker' : '📱 Earpiece'}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleRejectOrEndOwnerCall}
                className="flex-1 bg-neutral-950 text-white font-bold text-xs py-3.5 rounded-xl"
              >
                {ownerCallStatus === 'RINGING' ? 'Decline' : 'End Call'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}