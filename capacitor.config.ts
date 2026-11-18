// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.whopark.app',
  appName: 'WHO PARK',
  webDir: 'public',
  server: {
    url: 'https://www.whopark.in/',
    cleartext: false,
    allowNavigation: [
      'www.whopark.in',
      'whopark.in',
      '*.whopark.in',
      '*.vercel.app',
    ],
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