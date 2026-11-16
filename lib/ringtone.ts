// src/lib/ringtone.ts

let audioCtx: AudioContext | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Call this on any user button click on the dashboard so mobile browsers
 * unlock Web Audio playback for incoming background alerts.
 */
export function unlockAudio(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return true;
  } catch (err) {
    console.error('Audio unlock failed:', err);
    return false;
  }
}

/**
 * Plays a single loud two-tone alert chime ("BEEP-BEEP!")
 */
export function playSingleAlertChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Tone 1 (880Hz) + Tone 2 (1100Hz) double-honk pattern
    const frequencies = [880, 1100, 880, 1100];
    frequencies.forEach((freq, index) => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.18);

      gain.gain.setValueAtTime(0.001, now + index * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.45, now + index * 0.18 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.18 + 0.15);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now + index * 0.18);
      osc.stop(now + index * 0.18 + 0.16);
    });

    // Trigger mobile phone vibration pattern if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([300, 150, 300, 150, 500]);
    }
  } catch (err) {
    console.error('Ringtone playback error:', err);
  }
}

/**
 * Starts continuous phone-call style ringing until stopped by the owner
 */
export function startContinuousRing() {
  stopContinuousRing();
  playSingleAlertChime();
  ringInterval = setInterval(() => {
    playSingleAlertChime();
  }, 2000);
}

/**
 * Stops the active ringing loop and vibration
 */
export function stopContinuousRing() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(0);
  }
}