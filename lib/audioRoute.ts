// src/lib/audioRoute.ts
import { Capacitor, registerPlugin } from '@capacitor/core';

interface AudioRoutePlugin {
  setEarpieceMode(): Promise<{ speaker: boolean }>;
  setSpeakerMode(): Promise<{ speaker: boolean }>;
  resetAudioMode(): Promise<void>;
}

const AudioRoute = registerPlugin<AudioRoutePlugin>('AudioRoute');

export async function enableCellphoneEarpiece() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AudioRoute.setEarpieceMode();
  } catch (err) {
    console.warn('AudioRoute earpiece switch failed:', err);
  }
}

export async function enableLoudspeaker() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AudioRoute.setSpeakerMode();
  } catch (err) {
    console.warn('AudioRoute speaker switch failed:', err);
  }
}

export async function resetCallAudioRoute() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AudioRoute.resetAudioMode();
  } catch (err) {
    console.warn('AudioRoute reset failed:', err);
  }
}