// src/app/manifest.ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Who Park — Smart Car Parking Alert',
    short_name: 'Who Park',
    description: 'Scan windshield QR to alert parked car owners privately without sharing phone numbers.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FFFDF0',
    theme_color: '#FACC15',
    icons: [
      {
        src: '/api/pwa-icon/192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/api/pwa-icon/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}