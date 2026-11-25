import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.whopark.app',
  appName: 'WHO PARK',
  webDir: 'public',
  server: {
    url: 'https://app.whopark.in',
    cleartext: false,
    allowNavigation: [
      'app.whopark.in',
      'whopark.in',
      '*.whopark.in',
      '*.firebaseapp.com',
      'accounts.google.com',
    ],
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
    },
  },
};

export default config;