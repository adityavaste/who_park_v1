// src/app/manifest.ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HONKSAFE — Smart Car Alert',
    short_name: 'HONKSAFE',
    description: 'Anonymous QR vehicle alerts & instant owner notifications',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FFFDF0',
    theme_color: '#FACC15',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}