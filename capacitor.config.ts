// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.whopark.app',
  appName: 'WHO PARK',
  webDir: 'public',
  server: {
    url: 'https://whopark.in/dashboard',
    cleartext: false,
    allowNavigation: ['whopark.in', '*.whopark.in', 'who-park-v1*.vercel.app'],
  },
  plugins: {
    CapacitorCookies: {
      enabled: true,
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;