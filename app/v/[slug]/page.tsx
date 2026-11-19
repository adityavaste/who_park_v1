// app/v/[slug]/page.tsx
'use client';

import {
  enableCellphoneEarpiece,
  enableLoudspeaker,
  resetCallAudioRoute,
} from '@/lib/audioRoute';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createCallerConnection } from '@/lib/webrtcCall';
import PostAlertGrowthCard from '@/components/PostAlertGrowthCard';

type VehicleData = {
  plateNumber: string;
  makeModel: string | null;
};

const MAX_CALLS_PER_DAY = 3;
const MAX_CALL_DURATION_SECONDS = 180; // 3 minutes

function getTodayIstKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('whopark_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('whopark_device_id', id);
  }
  return id;
}

function ScannerContent() {
  const params = useParams();
  const slug = params?.slug as string;

  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  // Live owner reply tracking
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [ownerReply, setOwnerReply] = useState<string | null>(null);

  // Cooldown & daily ping limit states
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [dailyBlocked, setDailyBlocked] = useState<boolean>(false);
  const [remainingToday, setRemainingToday] = useState<number | null>(null);

  // Daily 3-Call Limit & 3-Minute Max Duration States
  const [callsUsedToday, setCallsUsedToday] = useState<number>(0);
  const [callLockedToday, setCallLockedToday] = useState<boolean>(false);
  const [callNotice, setCallNotice] = useState<string | null>(null);

  // Anonymous WebRTC Call states & refs
  const [callState, setCallState] = useState<'IDLE' | 'RINGING' | 'CONNECTED'>('IDLE');
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  function cleanupCallAudio() {
    resetCallAudioRoute();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setCallState('IDLE');
    setActiveCallId(null);
    setIsMuted(false);
    setSpeakerOn(false);
    setCallSeconds(0);
  }

  // Load today's call usage for this specific QR (local + backend sync)
  useEffect(() => {
    if (!slug) return;
    const todayKey = getTodayIstKey();
    const storageKey = `whopark_calls_${slug}_${todayKey}`;
    const localCount = Number(localStorage.getItem(storageKey) || '0');

    if (localCount >= MAX_CALLS_PER_DAY) {
      setCallsUsedToday(MAX_CALLS_PER_DAY);
      setCallLockedToday(true);
    } else {
      setCallsUsedToday(localCount);
    }

    const deviceId = getOrCreateDeviceId();
    fetch(
      `/api/call/status?tagSlug=${encodeURIComponent(slug)}&deviceId=${encodeURIComponent(deviceId)}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.usedCalls === 'number') {
          const syncedUsed = Math.max(localCount, data.usedCalls);
          setCallsUsedToday(syncedUsed);
          localStorage.setItem(storageKey, String(syncedUsed));
          if (syncedUsed >= MAX_CALLS_PER_DAY || data.locked) {
            setCallLockedToday(true);
          }
        }
      })
      .catch(() => {});
  }, [slug]);

  async function handleStartAnonymousCall() {
    if (callLockedToday || callsUsedToday >= MAX_CALLS_PER_DAY) {
      setCallLockedToday(true);
      setError('Daily call limit reached (3/3 calls used today for this vehicle).');
      return;
    }

    setError(null);
    setCallNotice(null);

    try {
      const deviceId = getOrCreateDeviceId();

      // 1. Check & reserve daily call slot on backend (3 calls/day per QR)
      const guardRes = await fetch('/api/call/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagSlug: slug, deviceId }),
      });

      if (guardRes.status === 429) {
        const guardData = await guardRes.json().catch(() => ({}));
        setCallsUsedToday(MAX_CALLS_PER_DAY);
        setCallLockedToday(true);
        localStorage.setItem(
          `whopark_calls_${slug}_${getTodayIstKey()}`,
          String(MAX_CALLS_PER_DAY)
        );
        throw new Error(guardData.error || 'Daily call limit reached (3/3 calls today).');
      }

      setCallState('RINGING');
      await enableCellphoneEarpiece();
      setSpeakerOn(false);

      const { pc, localStream, offerSdp } = await createCallerConnection((remoteStream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(() => {});
        }
      });

      pcRef.current = pc;
      localStreamRef.current = localStream;

      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, offerSdp, deviceId }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.locked || res.status === 429) {
          setCallsUsedToday(MAX_CALLS_PER_DAY);
          setCallLockedToday(true);
        }
        throw new Error(data.error || 'Could not start call');
      }

      // Increment today's call count
      const todayKey = getTodayIstKey();
      const storageKey = `whopark_calls_${slug}_${todayKey}`;
      const nextCount = Math.min(MAX_CALLS_PER_DAY, callsUsedToday + 1);
      setCallsUsedToday(nextCount);
      localStorage.setItem(storageKey, String(nextCount));
      if (nextCount >= MAX_CALLS_PER_DAY) {
        setCallLockedToday(true);
      }

      setActiveCallId(data.callId);
    } catch (err: any) {
      cleanupCallAudio();
      setError(
        err?.name === 'NotAllowedError'
          ? 'Microphone permission is required to make an anonymous voice call.'
          : err?.message || 'Call failed'
      );
    }
  }

  async function handleEndCall(reasonNotice?: string) {
    const idToEnd = activeCallId;
    cleanupCallAudio();
    if (reasonNotice) {
      setCallNotice(reasonNotice);
    }
    if (idToEnd) {
      await fetch(`/api/calls/${idToEnd}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ENDED' }),
      }).catch(() => {});
    }
  }

  function toggleMute() {
    if (!localStreamRef.current) return;
    const nextMute = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !nextMute;
    });
    setIsMuted(nextMute);
  }

  async function toggleSpeakerMode() {
    if (speakerOn) {
      await enableCellphoneEarpiece();
      setSpeakerOn(false);
    } else {
      await enableLoudspeaker();
      setSpeakerOn(true);
    }
  }

  // Poll for owner's WebRTC answer while RINGING or CONNECTED
  useEffect(() => {
    if (!activeCallId || callState === 'IDLE') return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/calls/${activeCallId}?t=${Date.now()}`, {
          cache: 'no-store',
        });
        const data = await res.json();

        if (data.status === 'ENDED') {
          cleanupCallAudio();
          return;
        }

        if (
          data.status === 'CONNECTED' &&
          data.answerSdp &&
          callState === 'RINGING' &&
          pcRef.current
        ) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answerSdp));
          await enableCellphoneEarpiece();
          setSpeakerOn(false);
          setCallState('CONNECTED');
        }
      } catch {}
    }, 1500);

    return () => clearInterval(poll);
  }, [activeCallId, callState]);

  // Strict 3-Minute (180s) Max Call Duration Timer
  useEffect(() => {
    if (callState !== 'CONNECTED') return;

    const timer = setInterval(() => {
      setCallSeconds((prev) => {
        if (prev + 1 >= MAX_CALL_DURATION_SECONDS) {
          clearInterval(timer);
          handleEndCall('⏱️ Call ended automatically after the 3-minute maximum limit.');
          return MAX_CALL_DURATION_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [callState, activeCallId]);

  useEffect(() => {
    return () => cleanupCallAudio();
  }, []);

  // Poll for the car owner's quick reply once an alert has been sent (uncached)
  useEffect(() => {
    if (!activeAlertId || ownerReply) return;

    const checkReply = async () => {
      try {
        const res = await fetch(`/api/alerts/status/${activeAlertId}?t=${Date.now()}`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (data.success && data.ownerReply) {
          setOwnerReply(data.ownerReply);
        }
      } catch {}
    };

    checkReply();
    const replyPoll = setInterval(checkReply, 2500);

    return () => clearInterval(replyPoll);
  }, [activeAlertId, ownerReply]);

  // Restore any active cooldown & activeAlertId from localStorage on page reload
  useEffect(() => {
    if (!slug) return;
    const savedUntil = localStorage.getItem(`honksafe_cooldown_${slug}`);
    if (savedUntil) {
      const diff = Math.ceil((Number(savedUntil) - Date.now()) / 1000);
      if (diff > 0) {
        setCooldownSeconds(diff);
      } else {
        localStorage.removeItem(`honksafe_cooldown_${slug}`);
      }
    }

    const savedAlertId = localStorage.getItem(`honksafe_last_alert_${slug}`);
    if (savedAlertId) {
      setActiveAlertId(savedAlertId);
    }
  }, [slug]);

  // Live 1-second cooldown countdown ticker
  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          localStorage.removeItem(`honksafe_cooldown_${slug}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds, slug]);

  // Fetch vehicle with 8s timeout so it never hangs on "Finding Car..."
  useEffect(() => {
    if (!slug) {
      setError('Invalid or missing sticker link.');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    async function fetchVehicle() {
      try {
        const res = await fetch(`/api/resolve/${encodeURIComponent(slug)}?t=${Date.now()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Sticker not found!');
        }
        const data = await res.json();
        if (data.unclaimed) {
          window.location.replace(`/claim/${slug}`);
          return;
        }
        if (!data.vehicle) {
          throw new Error('Vehicle details could not be loaded.');
        }
        setVehicle(data.vehicle);
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          setError('Network timed out while finding car. Please check your connection and try again.');
        } else {
          setError(err.message || 'Could not load car details.');
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }

    fetchVehicle();

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [slug]);

  async function handleSendAlert(alertType: string, label: string) {
    if (cooldownSeconds > 0 || dailyBlocked) return;

    setSending(true);
    setAlertSuccess(null);
    setError(null);

    try {
      const res = await fetch('/api/alerts/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, alertType }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.retryAfterSeconds) {
          setCooldownSeconds(data.retryAfterSeconds);
          localStorage.setItem(
            `honksafe_cooldown_${slug}`,
            String(Date.now() + data.retryAfterSeconds * 1000)
          );
        }
        if (data.dailyLimitReached) {
          setDailyBlocked(true);
        }
        throw new Error(data.error || 'Could not send alert.');
      }

      const waitSecs = data.cooldownSeconds || 300;
      setCooldownSeconds(waitSecs);
      localStorage.setItem(
        `honksafe_cooldown_${slug}`,
        String(Date.now() + waitSecs * 1000)
      );

      if (data.alertId) {
        setActiveAlertId(data.alertId);
        setOwnerReply(null);
        localStorage.setItem(`honksafe_last_alert_${slug}`, data.alertId);
      }

      if (typeof data.remainingDailyPings === 'number') {
        setRemainingToday(data.remainingDailyPings);
      }

      setAlertSuccess(`BEEP BEEP! "${label}" alert delivered to the driver!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function formatCountdown(totalSecs: number) {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFFDF0] flex items-center justify-center p-4">
        <div className="bg-yellow-300 border-4 border-black p-8 rounded-3xl shadow-[6px_6px_0px_#000] text-center max-w-xs w-full">
          <div className="text-5xl mb-3">🚕💨</div>
          <p className="font-black text-xl text-black uppercase tracking-wider">Finding Car...</p>
        </div>
      </main>
    );
  }

  if (error && !vehicle) {
    return (
      <main className="min-h-screen bg-[#FFFDF0] flex flex-col items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white border-4 border-black p-6 rounded-3xl shadow-[6px_6px_0px_#000] text-center">
          <div className="text-5xl mb-2">💥</div>
          <h2 className="text-2xl font-black text-black">STICKER ERROR!</h2>
          <p className="text-black font-bold text-sm mt-3 bg-yellow-200 border-2 border-black p-3 rounded-2xl">
            {error}
          </p>
          <div className="mt-5 flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-black text-yellow-400 font-black text-xs px-4 py-3 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#facc15]"
            >
              🔄 RETRY
            </button>
            <Link
              href="/"
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs px-4 py-3 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#000]"
            >
              ← HOME
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isLocked = sending || cooldownSeconds > 0 || dailyBlocked;
  const remainingCallsToday = Math.max(0, MAX_CALLS_PER_DAY - callsUsedToday);
  const remainingCallSeconds = Math.max(0, MAX_CALL_DURATION_SECONDS - callSeconds);

  return (
    <main className="min-h-screen bg-[#FFFDF0] py-6 px-4 flex flex-col justify-between max-w-md mx-auto selection:bg-yellow-300">
      <div>
        {/* Hidden Remote Audio Element */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Top Mini Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="bg-white hover:bg-yellow-100 text-black font-black text-xs px-3 py-1.5 rounded-xl border-3 border-black shadow-[2px_2px_0px_#000]"
          >
            🚕 WHO PARK
          </Link>
          <span className="bg-yellow-300 text-black border-2 border-black text-[11px] font-black px-3 py-1 rounded-full uppercase">
            🔒 100% Private
          </span>
        </div>

        {/* Hero Heading */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-black tracking-tight leading-none">
            CONTACT DRIVER
          </h1>
          <p className="text-xs font-bold text-stone-600 mt-1.5">
            Tap a reason below or call anonymously!
          </p>
        </div>

        {/* Cartoon License Plate Card */}
        <div className="bg-white rounded-3xl border-4 border-black p-6 shadow-[8px_8px_0px_#000] mb-6 text-center relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-yellow-400 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest">
            VERIFIED VEHICLE
          </div>

          <div className="text-3xl sm:text-4xl font-black text-black tracking-widest mt-2 font-mono bg-yellow-300 py-3 px-4 rounded-2xl border-3 border-black shadow-[4px_4px_0px_#000]">
            {vehicle?.plateNumber}
          </div>

          {vehicle?.makeModel && (
            <div className="text-sm font-black text-stone-700 mt-3 uppercase tracking-wide">
              🚘 {vehicle.makeModel}
            </div>
          )}
        </div>

        {/* Live Owner Quick Reply Bubble */}
        {ownerReply && (
          <div className="bg-emerald-300 border-4 border-black text-black p-4 rounded-2xl text-sm font-black mb-5 shadow-[5px_5px_0px_#000] flex items-center gap-3">
            <span className="text-3xl">💬</span>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-black/75">
                Driver Replied Just Now:
              </p>
              <p className="text-base font-black mt-0.5">&ldquo;{ownerReply}&rdquo;</p>
            </div>
          </div>
        )}

        {/* Waiting for Owner Reply Indicator */}
        {activeAlertId && !ownerReply && (
          <div className="bg-white border-3 border-black text-black px-4 py-3 rounded-2xl text-xs font-black mb-5 shadow-[4px_4px_0px_#000] flex items-center justify-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Waiting for driver&apos;s quick reply...</span>
          </div>
        )}

        {/* Cooldown Timer Banner */}
        {cooldownSeconds > 0 && !dailyBlocked && (
          <div className="bg-yellow-300 border-4 border-black text-black p-4 rounded-2xl mb-5 shadow-[5px_5px_0px_#000] text-center">
            <p className="text-xs font-black uppercase tracking-wider">
              ⏳ Anti-Spam Cooldown Active
            </p>
            <p className="text-2xl font-black font-mono mt-1">
              {formatCountdown(cooldownSeconds)}
            </p>
            <p className="text-[11px] font-bold text-stone-800 mt-1">
              You can send another alert after the timer ends.
              {remainingToday !== null && ` (${remainingToday}/10 pings left today)`}
            </p>
          </div>
        )}

        {/* Daily Limit Banner */}
        {dailyBlocked && (
          <div className="bg-rose-200 border-4 border-black text-black p-4 rounded-2xl mb-5 shadow-[5px_5px_0px_#000] text-center">
            <p className="text-sm font-black uppercase">🚫 Daily Limit Reached (10/10)</p>
            <p className="text-xs font-bold mt-1">
              You have reached the maximum 10 alerts allowed per 24 hours.
            </p>
          </div>
        )}

        {/* Call Notice (e.g., 3-min cutoff reached) */}
        {callNotice && (
          <div className="bg-amber-200 border-4 border-black text-black p-3.5 rounded-2xl text-xs font-black mb-5 shadow-[4px_4px_0px_#000] text-center">
            {callNotice}
          </div>
        )}

        {/* Success / Error Speech Bubbles */}
        {alertSuccess && (
          <div className="bg-white border-4 border-black text-black p-4 rounded-2xl text-sm font-black mb-5 shadow-[5px_5px_0px_#16a34a] flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>{alertSuccess}</div>
          </div>
        )}

        {error && !cooldownSeconds && !dailyBlocked && (
          <div className="bg-white border-4 border-black text-black p-4 rounded-2xl text-sm font-black mb-5 shadow-[5px_5px_0px_#dc2626] flex items-center gap-3">
            <span className="text-3xl">💥</span>
            <div>{error}</div>
          </div>
        )}

        {/* Anonymous Voice Call Button with 3-Calls/Day Lock */}
        <button
          type="button"
          onClick={handleStartAnonymousCall}
          disabled={callState !== 'IDLE' || callLockedToday}
          className="w-full mb-4 bg-emerald-400 hover:bg-emerald-300 active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-black text-sm sm:text-base py-4 px-5 rounded-2xl border-4 border-black shadow-[5px_5px_0px_#000] transition-all flex items-center justify-between disabled:bg-stone-200 disabled:text-stone-500 disabled:opacity-75 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <span className="flex items-center gap-3">
            <span className="text-2xl">{callLockedToday ? '🔒' : '📞'}</span>
            <span>
              {callLockedToday
                ? 'CALL LOCKED (3/3 USED TODAY)'
                : 'CALL DRIVER ANONYMOUSLY'}
            </span>
          </span>
          <span className="text-[11px] bg-black text-emerald-300 px-2.5 py-1 rounded-full shrink-0">
            {callLockedToday ? 'RESET 12 AM' : `${remainingCallsToday}/3 • 3M MAX`}
          </span>
        </button>

        {/* Quick Action Alert Buttons */}
        <div className="space-y-3.5">
          <button
            onClick={() => handleSendAlert('OBSTRUCTION', 'Car is blocking my way')}
            disabled={isLocked}
            className="w-full bg-yellow-400 hover:bg-yellow-300 active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-black text-sm sm:text-base py-4 px-5 rounded-2xl border-4 border-black shadow-[5px_5px_0px_#000] transition-all flex items-center justify-between disabled:opacity-45 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0"
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl">🚗</span>
              <span>CAR IS BLOCKING ME</span>
            </span>
            <span className="text-lg">➔</span>
          </button>

          <button
            onClick={() => handleSendAlert('HEADLIGHTS', 'Lights or windows open')}
            disabled={isLocked}
            className="w-full bg-white hover:bg-yellow-50 active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-black text-sm sm:text-base py-4 px-5 rounded-2xl border-4 border-black shadow-[5px_5px_0px_#000] transition-all flex items-center justify-between disabled:opacity-45 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0"
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <span>LIGHTS / WINDOW OPEN</span>
            </span>
            <span className="text-lg">➔</span>
          </button>

          <button
            onClick={() => handleSendAlert('EMERGENCY', 'Tow / Urgent Emergency')}
            disabled={isLocked}
            className="w-full bg-yellow-200 hover:bg-yellow-300 active:translate-x-1 active:translate-y-1 active:shadow-none text-black font-black text-sm sm:text-base py-4 px-5 rounded-2xl border-4 border-black shadow-[5px_5px_0px_#000] transition-all flex items-center justify-between disabled:opacity-45 disabled:cursor-not-allowed disabled:active:translate-x-0 disabled:active:translate-y-0"
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl">🚨</span>
              <span>TOW / POLICE EMERGENCY</span>
            </span>
            <span className="text-lg">➔</span>
          </button>
        </div>

        {/* Post-Alert Conversion Card (shows after alert sent or call ended) */}
        {(alertSuccess || activeAlertId || callNotice) && (
          <PostAlertGrowthCard apkDownloadUrl="/whopark.apk" />
        )}
      </div>

      {/* Active / Ringing Anonymous Call Modal with 3-Minute Countdown & Earpiece Toggle */}
      {callState !== 'IDLE' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-emerald-300 rounded-3xl max-w-sm w-full p-7 border-4 border-black shadow-[10px_10px_0px_#fff] text-center">
            <div className="w-20 h-20 bg-white border-4 border-black rounded-full flex items-center justify-center text-4xl mx-auto shadow-[4px_4px_0px_#000] animate-pulse">
              📞
            </div>
            <p className="text-xs font-black uppercase tracking-widest mt-4">
              {callState === 'RINGING' ? 'RINGING DRIVER...' : '● ANONYMOUS CALL LIVE'}
            </p>
            <h3 className="text-2xl font-black font-mono mt-1">{vehicle?.plateNumber}</h3>

            {callState === 'CONNECTED' ? (
              <div className="mt-3">
                <span
                  className={`inline-block px-3.5 py-1 rounded-full font-mono font-black text-sm border-2 border-black ${
                    remainingCallSeconds <= 30
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-yellow-300 text-black'
                  }`}
                >
                  ⏱️ {formatCountdown(remainingCallSeconds)} left (3m max)
                </span>
              </div>
            ) : (
              <p className="text-xs font-black mt-2">
                No phone numbers shared • {remainingCallsToday}/3 calls left today
              </p>
            )}

            <div className="mt-6 flex items-center gap-2">
              {callState === 'CONNECTED' && (
                <>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="flex-1 bg-white text-black font-black text-xs py-3.5 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#000]"
                  >
                    {isMuted ? '🔇 UNMUTE' : '🎙️ MUTE'}
                  </button>
                  <button
                    type="button"
                    onClick={toggleSpeakerMode}
                    className={`flex-1 font-black text-xs py-3.5 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#000] ${
                      speakerOn ? 'bg-yellow-400 text-black' : 'bg-white text-black'
                    }`}
                  >
                    {speakerOn ? '🔊 SPEAKER' : '📱 EARPIECE'}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => handleEndCall()}
                className="flex-1 bg-rose-500 text-white font-black text-xs py-3.5 rounded-2xl border-3 border-black shadow-[3px_3px_0px_#000]"
              >
                📴 END CALL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center font-bold text-xs text-stone-500 mt-8">
        🛡️ Rate-limited (1 ping / 5 mins • Max 3 calls &amp; 10 pings / day) to protect owners.
      </footer>
    </main>
  );
}

export default function ScannerPage() {
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
      <ScannerContent />
    </Suspense>
  );
}