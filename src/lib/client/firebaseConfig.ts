/**
 * Firebase Client Configuration
 * 
 * Reads Firebase configuration from environment variables provided by the hosting platform.
 * In development: Uses .env.local
 * In production: Uses environment variables from Vercel project settings (or other hosting platform)
 * 
 * Required environment variables:
 * - NEXT_PUBLIC_FIREBASE_API_KEY
 * - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * - NEXT_PUBLIC_FIREBASE_APP_ID
 * 
 * Optional:
 * - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 * - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 * - NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
 * - NEXT_PUBLIC_FIREBASE_DATABASE_URL
 */

import type { FirebaseOptions } from 'firebase/app';

type FirebaseClientEnvKey =
  | 'NEXT_PUBLIC_FIREBASE_API_KEY'
  | 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'
  | 'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  | 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'
  | 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
  | 'NEXT_PUBLIC_FIREBASE_APP_ID'
  | 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'
  | 'NEXT_PUBLIC_FIREBASE_DATABASE_URL';

function readClientEnv(key: FirebaseClientEnvKey): string | undefined {
  const value = process.env[key];

  if (!value || value.trim() === '') {
    return undefined;
  }

  return value;
}

export const firebaseConfig: FirebaseOptions = {
  apiKey: readClientEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: readClientEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: readClientEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: readClientEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readClientEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readClientEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
  measurementId: readClientEnv('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'),
  databaseURL: readClientEnv('NEXT_PUBLIC_FIREBASE_DATABASE_URL'),
};

/**
 * Check if required Firebase configuration is present
 * Only checks for the minimum required fields to initialize Firebase
 */
export function isFirebaseConfigComplete(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
}

/**
 * Get detailed debug info about which Firebase config values are missing
 * For development/debugging only - does not expose actual values
 */
export function getFirebaseConfigDebugInfo(): { 
  isComplete: boolean;
  missing: string[];
  present: string[];
} {
  const required = {
    'NEXT_PUBLIC_FIREBASE_API_KEY': firebaseConfig.apiKey,
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': firebaseConfig.authDomain,
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID': firebaseConfig.projectId,
    'NEXT_PUBLIC_FIREBASE_APP_ID': firebaseConfig.appId,
  };

  const missing: string[] = [];
  const present: string[] = [];

  Object.entries(required).forEach(([key, value]) => {
    if (value) {
      present.push(key);
    } else {
      missing.push(key);
    }
  });

  return {
    isComplete: missing.length === 0,
    missing,
    present,
  };
}
