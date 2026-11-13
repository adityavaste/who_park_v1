// src/app/manifest.ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WHO PARK — Smart Car Alert',
    short_name: 'WHO PARK',
    description: 'Anonymous QR vehicle alerts & instant owner notifications',
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