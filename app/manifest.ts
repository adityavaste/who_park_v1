// src/app/manifest.ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WHO PARK — Private Vehicle QR Alerts',
    short_name: 'WHO PARK',
    description: 'Scan vehicle QR stickers to alert owners privately without sharing phone numbers.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FFFDF0',
    theme_color: '#FACC15',
    icons: [
      {
        src: '/icon/medium',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon/large',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}