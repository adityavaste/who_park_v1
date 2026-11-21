// lib/firebaseClient.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

export function getClientAuth(): Auth | null {
  if (typeof window === 'undefined') return null;
  if (!firebaseConfig.apiKey) {
    console.error('Missing NEXT_PUBLIC_FIREBASE_API_KEY in client bundle');
    return null;
  }
  const app: FirebaseApp = getApps().length
    ? getApps()[0]
    : initializeApp(firebaseConfig);
  return getAuth(app);
}

export const webAuth = getClientAuth();
export const googleProvider = new GoogleAuthProvider();