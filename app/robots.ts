// src/app/robots.ts
import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://whopark.in';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/parking-solutions', '/login'],
        disallow: ['/dashboard/', '/admin/', '/api/', '/v/', '/claim/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}